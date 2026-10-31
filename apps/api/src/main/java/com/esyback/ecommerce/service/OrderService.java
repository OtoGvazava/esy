package com.esyback.ecommerce.service;

import com.esyback.ecommerce.config.PlatformProperties;
import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Address;
import com.esyback.ecommerce.entity.DeliveryOption;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.ProductVariant;
import com.esyback.ecommerce.entity.OrderItem;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.AddressRepository;
import com.esyback.ecommerce.repository.OrderRepository;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;


import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final MembershipService membershipService;
    private final DeliveryService deliveryService;
    private final ProductService productService;
    private final ProductRepository productRepository;
    private final ProductVariantService productVariantService;
    // Read here, not through the product services, only to put a cancelled
    // order's goods back on the exact row they came off (see restock).
    private final ProductVariantRepository variantRepository;
    private final AddressRepository addressRepository;
    // Platform service fee (fraction of order total). Read at call time from a
    // live config bean so the rate can change via the admin config UI
    // without a redeploy.
    private final PlatformProperties platformProperties;
    private final SmsSender sms;
    private final SmsTemplates smsTemplates;
    private final EmailSender email;
    private final EmailTemplates emailTemplates;
    // No cycle: BogPaymentService depends only on config, the cipher and an
    // HTTP client — it does not reach back into orders.
    private final BogPaymentService bogPaymentService;

    public Order createOrder(User user, Tenant tenant, CreateOrderRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order has no items");
        }
        Order order = new Order();
        order.setUser(user);
        order.setTenant(tenant);
        order.setStatus(Order.Status.PLACED);
        // Nothing is off the shelf yet; commitStockOnce sets it when it is.
        // Explicit rather than null, because null means "placed before the
        // flag existed" and is read from the payment status instead.
        order.setStockCommitted(false);
        order.setOrderNumber("ESY-" + ThreadLocalRandom.current().nextInt(1000, 9999)
            + "-" + ThreadLocalRandom.current().nextInt(1, 9));

        BigDecimal total = BigDecimal.ZERO;
        for (CreateOrderRequest.Item i : req.getItems()) {
            // What is sold, and for how much, is this store's catalogue — never
            // the browser's. A line must name one of the store's own products;
            // its title and price (or its variant's) are read from that product
            // and frozen onto the line, for the same reason delivery is priced
            // server-side: the shopper picks a product, not an amount. The
            // browser's title and price are ignored.
            Product product = i.getProductId() == null ? null
                : productRepository.findById(i.getProductId())
                    .filter(p -> p.getTenant() != null && tenant != null
                        && p.getTenant().getId().equals(tenant.getId()))
                    .orElse(null);
            if (product == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A product in the bag is no longer sold in this store");
            }
            OrderItem oi = new OrderItem();
            oi.setProductId(product.getId());
            oi.setTitle(product.getTitle());
            BigDecimal price = product.getPrice() == null ? BigDecimal.ZERO : product.getPrice();
            int qty = i.getQuantity() == null || i.getQuantity() < 1 ? 1 : i.getQuantity();

            // Variants (D11). The combination is frozen onto the line the same
            // way the title and price are, and the row's own price wins.
            if (product.variantsEnabled()) {
                ProductVariant variant = productVariantService.require(product, i.getVariantId());
                oi.setVariantId(variant.getId());
                oi.setVariantLabel(variant.label());
                price = variant.getPrice() != null ? variant.getPrice() : price;
            }

            oi.setPrice(price);
            oi.setQuantity(qty);
            order.addItem(oi);
            total = total.add(price.multiply(BigDecimal.valueOf(qty)));
        }
        // 2% platform fee, frozen at order time, computed on the GOODS total
        // before delivery is added (D9). Delivery is a courier's money passing
        // through the merchant, so billing commission on it would charge them
        // for something they never keep. Server-side only — never sent to the
        // client and never added to the BOG charge.
        order.setServiceFee(total.multiply(platformProperties.getServiceFeeRate()).setScale(2, RoundingMode.HALF_UP));

        // Delivery is priced server-side from the store's own routes, never
        // from a number the browser sent: the shopper picks a route, not a fee.
        String route = req.getDeliveryRoute() == null || req.getDeliveryRoute().isBlank()
            ? DeliveryOption.PICKUP
            : req.getDeliveryRoute().trim().toLowerCase();
        boolean express = Boolean.TRUE.equals(req.getDeliveryExpress());
        BigDecimal deliveryFee = deliveryService.feeFor(route, express, total);
        order.setDeliveryRoute(route);
        order.setDeliveryExpress(express);
        order.setDeliveryFee(deliveryFee);

        // The charged total includes delivery — it is what BOG collects and
        // what the shopper agreed to. revenue() subtracts it back out.
        order.setTotal(total.add(deliveryFee));

        // Only a courier route needs somewhere to deliver to. On collection
        // there is nothing to post, and checkout does not even ask.
        if (DeliveryOption.COURIER_ROUTES.contains(route)) {
            applyDeliveryAddress(order, user, req);
        }

        // Buying makes the account a CUSTOMER of the store (no downgrade of owners).
        if (user != null) membershipService.ensure(user, tenant, StoreMembership.Role.CUSTOMER);
        Order saved = orderRepository.save(order);
        // An order is CREATED as PLACED and never transitions into it, so the
        // status-change path can never send this one — it has to be sent here.
        notify(saved, SmsTemplates.ORDER_PLACED);
        return saved;
    }

    /**
     * Freeze the delivery address onto the order (decision D4). A saved
     * addressId wins; an inline address is saved into the user's book first
     * (so the next checkout can reuse it), then frozen. The frozen copy is
     * plain columns — later edits to the address book never rewrite an order.
     */
    private void applyDeliveryAddress(Order order, User user, CreateOrderRequest req) {
        Address chosen = null;
        if (req.getAddressId() != null && user != null) {
            chosen = addressRepository.findByIdAndUser(req.getAddressId(), user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown address"));
        } else if (req.getAddress() != null) {
            CreateOrderRequest.InlineAddress in = req.getAddress();
            if (in.getRecipient() == null || in.getPhone() == null
                || in.getLine() == null || in.getCity() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Delivery address needs recipient, phone, line and city");
            }
            Address a = new Address();
            a.setRecipient(in.getRecipient());
            a.setPhone(in.getPhone());
            a.setLine(in.getLine());
            a.setCity(in.getCity());
            a.setPostalCode(in.getPostalCode());
            a.setCountry(in.getCountry());
            if (user != null) {
                a.setUser(user);
                boolean first = addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user).isEmpty();
                a.setIsDefault(first);
                chosen = addressRepository.save(a);
            } else {
                chosen = a; // guest checkout: freeze without saving a book entry
            }
        }
        if (chosen != null) {
            order.setShipRecipient(chosen.getRecipient());
            order.setShipPhone(chosen.getPhone());
            order.setShipLine(chosen.getLine());
            order.setShipCity(chosen.getCity());
            order.setShipPostalCode(chosen.getPostalCode());
            order.setShipCountry(chosen.getCountry());
        }
    }

    /**
     * Decision D3 for the free-flow path (stores without a payment provider):
     * a NONE-payment order never reaches settlePayment, so its stock would
     * never decrement. The free-order endpoint calls this right after
     * creation — placement IS settlement when no money moves. The BOG path
     * must NOT call it (there the commit happens at the atomic PAID claim).
     */
    public void commitFreeOrderStock(Order order) {
        if (order.getPaymentStatus() == Order.PaymentStatus.NONE) {
            commitStockOnce(order.getId());
        }
    }

    /**
     * Takes an order's goods off the shelf, once (D3).
     *
     * <p>One conditional UPDATE decides, so a retried payment callback cannot
     * take the stock twice, and a payment that lands after the store cancelled
     * the order takes none: a cancelled order holds no stock. Each line then
     * records what it actually took, because commitStock floors a row at zero
     * on an oversell and a cancellation must put back only what was taken.
     */
    private void commitStockOnce(Long orderId) {
        if (orderId == null || orderRepository.markStockCommitted(orderId) != 1) return;
        orderRepository.findById(orderId).ifPresent(order -> {
            recordStockTaken(order);
            productService.commitStock(order);
        });
    }

    /**
     * What each line will take, worked out the way ProductService.commitStock
     * takes it: from the variant row when the product has variants, from the
     * product otherwise, floored at zero, with two lines on the same row
     * sharing what is there.
     */
    private void recordStockTaken(Order order) {
        Map<String, Integer> left = new HashMap<>();
        for (OrderItem item : order.getItems()) {
            if (item.getProductId() == null) continue;
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            if (p == null) {
                item.setStockTaken(0);
                continue;
            }
            int want = item.getQuantity() == null ? 1 : item.getQuantity();
            String key;
            int have;
            if (p.variantsEnabled() && item.getVariantId() != null) {
                ProductVariant v = variantRepository.findByIdAndProduct(item.getVariantId(), p).orElse(null);
                if (v == null) {
                    item.setStockTaken(0);
                    continue;
                }
                key = "variant:" + v.getId();
                have = left.getOrDefault(key, v.getQuantity() == null ? 0 : v.getQuantity());
            } else {
                key = "product:" + p.getId();
                have = left.getOrDefault(key, p.getQuantity() == null ? 0 : p.getQuantity());
            }
            item.setStockTaken(Math.max(0, Math.min(want, have)));
            left.put(key, Math.max(0, have - want));
        }
    }

    /**
     * Payment statuses that prove an order from before the stock flag took its
     * stock: stock is committed at PAID, and a refund can only follow a payment.
     * NONE is deliberately missing. It is also what a card checkout is left at
     * when the bank call fails before any stock moved, and putting back stock
     * that never left would sell goods the shop does not have — the same reason
     * a refund does not restock.
     */
    private static final Set<Order.PaymentStatus> STOCK_TAKEN_BEFORE_FLAG = EnumSet.of(
        Order.PaymentStatus.PAID, Order.PaymentStatus.REFUND_PENDING, Order.PaymentStatus.REFUNDED);

    /** A cancelled order's goods go back, once, if it ever took them. */
    private void releaseStock(Long orderId) {
        if (orderRepository.releaseStock(orderId, STOCK_TAKEN_BEFORE_FLAG) != 1) return;
        orderRepository.findById(orderId).ifPresent(this::restock);
    }

    /**
     * Puts a cancelled order's goods back on the shelf: the inverse of
     * ProductService.commitStock, variants included (D11). Each line returns
     * what it took — its quantity when it predates that record — to the row it
     * took it from. The row is found by id, or by its combination when the
     * merchant has re-saved the variant grid since, which recreates the rows.
     * A product or combination that no longer exists has no shelf to go back
     * to, and is skipped.
     */
    private void restock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProductId() == null) continue;
            int back = item.getStockTaken() != null ? item.getStockTaken()
                : (item.getQuantity() == null ? 1 : item.getQuantity());
            if (back <= 0) continue;
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            if (p == null) continue;

            if (p.variantsEnabled() && item.getVariantId() != null) {
                ProductVariant v = variantRepository.findByIdAndProduct(item.getVariantId(), p)
                    .or(() -> sameCombination(p, item.getVariantLabel()))
                    .orElse(null);
                if (v == null) {
                    log.warn("Cancelled order {}: {} × \"{}\" not restocked, that combination of product {} no longer exists",
                        order.getOrderNumber(), back, item.getVariantLabel(), p.getId());
                } else {
                    v.setQuantity((v.getQuantity() == null ? 0 : v.getQuantity()) + back);
                    variantRepository.save(v);
                }
                // Keep the product's cached total honest against its rows.
                productVariantService.syncStock(p);
                continue;
            }

            p.setQuantity((p.getQuantity() == null ? 0 : p.getQuantity()) + back);
            productRepository.save(p);
        }
    }

    private Optional<ProductVariant> sameCombination(Product p, String label) {
        if (label == null || label.isBlank()) return Optional.empty();
        return variantRepository.findByProductOrderByIdAsc(p).stream()
            .filter(v -> label.equals(v.label()))
            .findFirst();
    }

    /** Mark a freshly created order as awaiting BOG payment + record BOG's id. */
    public Order markBogPending(Order order, String bogOrderId) {
        order.setPaymentStatus(Order.PaymentStatus.PENDING);
        order.setBogOrderId(bogOrderId);
        return orderRepository.save(order);
    }

    public Optional<Order> findByOrderNumber(String orderNumber) {
        return orderNumber == null ? Optional.empty()
            : orderRepository.findByOrderNumber(orderNumber);
    }

    /**
     * Apply a terminal BOG payment outcome. PAID leaves the order PLACED
     * (ready to fulfill); FAILED cancels it so it drops out of the store's
     * actionable queue. Idempotent — repeated callbacks for an already-settled
     * order are a no-op, so BOG retries are safe.
     */
    public Optional<Order> settlePayment(String orderNumber, Order.PaymentStatus outcome) {
        if (outcome == null) return findByOrderNumber(orderNumber);
        if (outcome == Order.PaymentStatus.PAID) {
            // Decision D3: stock is committed at PAID, not at PLACED. The BOG
            // callback and the /pay/return reconcile race here, so the
            // PENDING→PAID flip is one atomic conditional UPDATE — exactly one
            // caller sees claimed == 1 and commits stock; the loser (and any
            // BOG retry) finds nothing to claim and decrements nothing.
            int claimed = orderRepository.claimPaid(orderNumber);
            if (claimed == 1) {
                // Takes nothing if the store cancelled the order while the
                // shopper was still on the bank's page: the money is in, the
                // goods stay on the shelf, and the owner refunds it.
                findByOrderNumber(orderNumber).ifPresent(order -> commitStockOnce(order.getId()));
            }
            return findByOrderNumber(orderNumber);
        }
        return findByOrderNumber(orderNumber).map(order -> {
            if (order.getPaymentStatus() == outcome) return order;
            order.setPaymentStatus(outcome);
            if (outcome == Order.PaymentStatus.FAILED) {
                // Cancelled by a failed or abandoned payment, and deliberately
                // NOT emailed. The shopper was on the bank's page a moment ago
                // and already knows it did not go through; mailing every
                // abandoned checkout would be noise at best and look like spam
                // at worst. A cancellation the SHOP decides is different — that
                // is news to the shopper, and it is emailed.
                order.setStatus(Order.Status.CANCELLED);
            }
            return orderRepository.save(order);
        });
    }

    /**
     * Shopper-initiated cancellation (decision D1): only while the order is
     * still PLACED and no money has moved or is moving. PENDING is excluded on
     * purpose — a payment in flight must settle (or fail) first, otherwise a
     * late success callback would pay for a cancelled order.
     */
    /**
     * One of the shopper's own orders, by its public number.
     *
     * <p>Not found and not-yours are deliberately the same 404. Order numbers
     * are guessable enough that a distinct 403 would confirm which ones exist,
     * and a shopper has no legitimate reason to learn that someone else's order
     * is real. Cancel keeps its separate 403 because the caller already proved
     * ownership to reach it.
     */
    public Order orderForShopper(String orderNumber, User user) {
        return findByOrderNumber(orderNumber)
            .filter(o -> user != null && o.getUser() != null && o.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    public Order cancelByShopper(String orderNumber, User user) {
        Order order = findByOrderNumber(orderNumber)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (user == null || order.getUser() == null || !order.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your order");
        }
        if (order.getStatus() != Order.Status.PLACED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Order can no longer be cancelled");
        }
        if (order.getPaymentStatus() != Order.PaymentStatus.NONE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Paid or in-payment orders can't be self-cancelled — contact the store");
        }
        if (orderRepository.claimStatus(order.getId(), Order.Status.PLACED, Order.Status.CANCELLED) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Order can no longer be cancelled");
        }
        // A free order took its stock when it was placed; it goes back now.
        releaseStock(order.getId());
        Order saved = orderRepository.findById(order.getId()).orElse(order);
        notifyCancelled(saved);
        return saved;
    }

    /**
     * Sends money back for one of the store's own orders (decision D2).
     *
     * <p>D2 holds that a refund is not a cancellation. Cancelling withdraws an
     * order before it is fulfilled; refunding returns money for one that was
     * paid, and the two are allowed at different times by different people.
     * Nothing here touches {@link Order.Status} — a delivered, refunded order
     * stays delivered, because that is what happened.
     *
     * <p>The order of operations matters. Headroom is claimed in the database
     * first, in one conditional UPDATE, so two clicks cannot both decide the
     * money is available; only then is the bank called. If the bank refuses,
     * the exception rolls the claim back. If the bank does not answer at all,
     * the claim deliberately stands: the refund may well have gone through, and
     * a clean rollback would invite a second attempt at the same money.
     *
     * <p>Stock is not returned to the shelf. A refunded item may be back in the
     * shop or may be in a bin; only the merchant knows, and silently
     * re-stocking something they do not have would oversell it.
     *
     * @param amount the partial amount, or null to refund everything still
     *               refundable on the order
     */
    @Transactional
    public Order requestRefund(Tenant tenant, Long orderId, BigDecimal amount) {
        Order order = orderForTenant(tenant, orderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        Order.PaymentStatus ps = order.getPaymentStatus() == null
            ? Order.PaymentStatus.NONE : order.getPaymentStatus();
        if (ps != Order.PaymentStatus.PAID && ps != Order.PaymentStatus.REFUND_PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                ps == Order.PaymentStatus.NONE
                    ? "Nothing was paid online for this order, so there is nothing to refund"
                    : "This order cannot be refunded while its payment is " + ps.name().toLowerCase());
        }

        BigDecimal refundable = order.refundableAmount();
        if (refundable.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This order has already been refunded in full");
        }
        BigDecimal asked = amount == null ? refundable : amount.setScale(2, RoundingMode.HALF_UP);
        if (asked.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "A refund has to be more than zero");
        }
        if (asked.compareTo(refundable) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "That is more than is left to refund on this order (" + refundable.toPlainString() + ")");
        }

        if (orderRepository.claimRefund(order.getId(), asked) != 1) {
            // Lost the race, or the state moved under us. Either way the safe
            // answer is "look again" rather than sending a second instruction.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This order changed while the refund was being sent — reload it and check before retrying");
        }

        // Whole-order refunds omit the amount, which is what BOG documents and
        // avoids a rounding argument with the bank over the final lari.
        boolean whole = asked.compareTo(order.getTotal() == null ? asked : order.getTotal()) == 0
            && order.refundedOrZero().signum() == 0;
        BogPaymentService.RefundResult result =
            bogPaymentService.refund(tenant, order.getBogOrderId(), whole ? null : asked);

        if (!result.accepted()) {
            // An explicit refusal is safe to undo: no money moved.
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                result.message() == null ? "The bank refused the refund" : result.message());
        }

        log.info("Refund of {} requested on order {} (store {})",
            asked.toPlainString(), order.getOrderNumber(), tenant.getSubdomain());
        Order fresh = findByOrderNumber(order.getOrderNumber()).orElse(order);
        // After the claim and the bank, never before: an email saying money is
        // coming back must not go out ahead of the instruction that sends it.
        notifyRefunded(fresh, asked);
        return fresh;
    }

    /**
     * Store-side fulfilment transition (decision D1). Legal moves:
     * PLACED→SHIPPED→OUT_FOR_DELIVERY→DELIVERED, plus cancel from PLACED or
     * SHIPPED. DELIVERED and CANCELLED are terminal. Scoped to the tenant so
     * one store can never touch another store's order.
     *
     * <p>A cancellation puts the goods back on the shelf, variants included,
     * if the order had taken them (see releaseStock). It does not touch the
     * money: a paid order still has to be refunded, by the owner, as its own
     * act (D2) — cancelling and refunding are different permissions.
     */
    public Order updateStatus(Tenant tenant, Long orderId, Order.Status next) {
        Order order = orderForTenant(tenant, orderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        Order.Status from = order.getStatus();
        if (!isLegalTransition(from, next)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Illegal transition " + from + " -> " + next);
        }
        if (orderRepository.claimStatus(orderId, from, next) != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This order changed while it was open — reload it and check before trying again");
        }
        if (next == Order.Status.CANCELLED) {
            releaseStock(orderId);
        }
        Order saved = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        notifyShopper(saved, next);
        return saved;
    }

    /**
     * Texts the shopper that their order moved (the design's SMS thread).
     *
     * <p>Best-effort, and deliberately after the save: a courier marking a
     * parcel shipped must not have that fail because an SMS gateway is down.
     * The status is the fact; the message is a courtesy about it.
     *
     * <p>CANCELLED is still not TEXTED. A cancellation is a conversation —
     * often about money — and a one-line SMS is the wrong way to open it. It
     * does now go by email, which is the right medium for it: a written record
     * the shopper can keep and reply to, rather than a notification.
     */
    private void notifyShopper(Order order, Order.Status next) {
        if (next == Order.Status.CANCELLED) {
            notifyCancelled(order);
            return;
        }
        String template = switch (next) {
            case SHIPPED -> SmsTemplates.ORDER_SHIPPED;
            case OUT_FOR_DELIVERY -> SmsTemplates.ORDER_OUT;
            case DELIVERED -> SmsTemplates.ORDER_DELIVERED;
            default -> null;
        };
        if (template != null) notify(order, template);
    }

    /** One path for every order message, so all of them obey the same rules. */
    private void notify(Order order, String template) {
        notifySms(order, template);
        notifyEmail(order, template, Map.of());
    }

    private void notifySms(Order order, String template) {
        String phone = recipientPhone(order);
        if (phone == null) return;
        // A shop watching its SMS bill can switch any of these off in admin.
        if (!smsTemplates.isEnabled(template)) return;
        try {
            sms.send(phone, smsTemplates.render(template, orderTokens(order)));
        } catch (RuntimeException e) {
            log.warn("Order SMS not sent for order {}: {}", order.getId(), e.getClass().getSimpleName());
        }
    }

    /**
     * The same notice by email, where the template keys deliberately match the
     * SMS ones so a status change cannot reach one channel and not the other by
     * accident.
     *
     * <p>Every failure is swallowed, as with SMS. An order must not fail
     * because a courtesy message did — the status is the fact, the message is a
     * remark about it.
     *
     * @param extra tokens beyond the standard order ones (the refund amount)
     */
    private void notifyEmail(Order order, String template, Map<String, String> extra) {
        if (!EmailTemplates.isKnown(template)) return;
        String to = recipientEmail(order);
        if (to == null) return;
        if (!emailTemplates.isEnabled(template)) return;
        try {
            Map<String, String> tokens = new java.util.HashMap<>(orderTokens(order));
            tokens.putAll(extra);
            email.send(to,
                emailTemplates.renderSubject(template, tokens),
                emailTemplates.renderBody(template, tokens));
        } catch (RuntimeException e) {
            log.warn("Order email not sent for order {}: {}", order.getId(), e.getClass().getSimpleName());
        }
    }

    /**
     * Sends the two notices that are email-only.
     *
     * <p>A cancellation and a refund both go by mail and not by text: each is
     * usually about money, a one-line SMS is the wrong way to open that
     * conversation, and a written record is exactly what someone wants to keep.
     */
    public void notifyCancelled(Order order) {
        notifyEmail(order, EmailTemplates.ORDER_CANCELLED, Map.of());
    }

    public void notifyRefunded(Order order, BigDecimal amount) {
        notifyEmail(order, EmailTemplates.ORDER_REFUNDED,
            Map.of("amount", amount == null ? "" : amount.toPlainString() + " ₾"));
    }

    /**
     * Who to email about this order.
     *
     * <p>Only the account's address. Unlike the phone number there is no
     * delivery email to prefer — and the account holder is the person who paid,
     * which is the right recipient for anything about money.
     */
    private static String recipientEmail(Order order) {
        if (order.getUser() == null) return null;
        String email = order.getUser().getEmail();
        return email == null || email.isBlank() ? null : email;
    }

    /**
     * Who to text about this order.
     *
     * <p>The delivery contact first, because on a courier order it is the
     * person who will actually receive the parcel — which may not be the buyer
     * at all, as with a gift. Falling back to the account's own number matters
     * for collection orders: those carry no delivery address, so keying only on
     * the ship phone meant a pickup buyer heard nothing at any stage, which is
     * exactly the case where "it is ready" is worth the most.
     */
    private static String recipientPhone(Order order) {
        String ship = order.getShipPhone();
        if (ship != null && !ship.isBlank()) return ship;
        String account = order.getUser() == null ? null : order.getUser().getPhoneNumber();
        return account == null || account.isBlank() ? null : account;
    }

    /** Values the order templates may reference. */
    private Map<String, String> orderTokens(Order order) {
        String number = order.getOrderNumber() == null ? String.valueOf(order.getId()) : order.getOrderNumber();
        String store = order.getTenant() == null ? "" : order.getTenant().getDisplayName();
        String sub = order.getTenant() == null ? null : order.getTenant().getSubdomain();
        return Map.of(
            "order", number,
            "store", store == null ? "" : store,
            "url", sub == null ? "" : sub + ".esy.ge/orders");
    }

    private static boolean isLegalTransition(Order.Status from, Order.Status to) {
        if (to == null || from == to) return false;
        return switch (from) {
            case PLACED -> to == Order.Status.SHIPPED || to == Order.Status.CANCELLED;
            case SHIPPED -> to == Order.Status.OUT_FOR_DELIVERY || to == Order.Status.CANCELLED;
            case OUT_FOR_DELIVERY -> to == Order.Status.DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
    }

    public List<Order> ordersForUser(User user) {
        return orderRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public List<Order> ordersForTenant(Tenant tenant) {
        return orderRepository.findByTenantOrderByCreatedAtDesc(tenant);
    }

    /**
     * One order, scoped to the store that owns it.
     *
     * <p>The tenant is part of the lookup rather than checked afterwards: an id
     * from another store must read as "not found" here, not as a row the caller
     * then has to remember to reject. Same rule as {@link #updateStatus} —
     * never mix scopes in one response.
     */
    public Optional<Order> orderForTenant(Tenant tenant, Long orderId) {
        if (tenant == null || orderId == null) return Optional.empty();
        return orderRepository.findById(orderId)
            .filter(o -> o.getTenant() != null && o.getTenant().getId().equals(tenant.getId()));
    }

    public long orderCount(Tenant tenant) {
        return orderRepository.countByTenant(tenant);
    }

    // "New" = freshly received, not yet acted on (PLACED is the status set on
    // checkout). Drives the owner-bar Orders badge.
    public long newOrderCount(Tenant tenant) {
        return orderRepository.countByTenantAndStatus(tenant, Order.Status.PLACED);
    }

    // Decision D2: refunded money is not revenue, and neither are cancelled
    // orders. Without these filters the stats screen silently counts money
    // that was returned to shoppers.
    //
    // Delivery is subtracted too (D9). Order.total is what the shopper was
    // charged, delivery included, because that is what BOG collects — but a
    // courier charge the merchant hands straight on is not their earnings.
    // Counting it would make a store doing heavy delivery look more profitable
    // than it is, and this figure feeds both the merchant's own stats and the
    // platform's billing screen, which must not disagree.
    public BigDecimal revenue(Tenant tenant) {
        return orderRepository.findByTenantOrderByCreatedAtDesc(tenant).stream()
            .filter(o -> o.getStatus() != Order.Status.CANCELLED)
            .filter(o -> o.getPaymentStatus() != Order.PaymentStatus.REFUNDED)
            .map(OrderService::goodsTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * What the order was worth in goods: the charged total less any delivery.
     * Orders placed before delivery existed have a null fee and are already
     * goods-only, so they need no adjustment.
     */
    private static BigDecimal goodsTotal(Order o) {
        BigDecimal total = o.getTotal() == null ? BigDecimal.ZERO : o.getTotal();
        BigDecimal delivery = o.getDeliveryFee();
        return delivery == null ? total : total.subtract(delivery);
    }

    /**
     * Platform service fees this store owes (for periodic out-of-band billing).
     * Counts only revenue-bearing orders: not cancelled, and either a paid BOG
     * order or a free-flow order (paymentStatus NONE). Pending/failed/refunded
     * BOG orders are excluded so a store is never billed for money it didn't
     * collect.
     */
    public BigDecimal serviceFeesOwed(Tenant tenant) {
        return orderRepository.findByTenantOrderByCreatedAtDesc(tenant).stream()
            .filter(o -> o.getStatus() != Order.Status.CANCELLED)
            .filter(o -> o.getPaymentStatus() == Order.PaymentStatus.PAID
                || o.getPaymentStatus() == Order.PaymentStatus.NONE)
            .map(Order::getServiceFee)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
