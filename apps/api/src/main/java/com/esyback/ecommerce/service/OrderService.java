package com.esyback.ecommerce.service;

import com.esyback.ecommerce.dto.CreateOrderRequest;
import com.esyback.ecommerce.entity.Order;
import com.esyback.ecommerce.entity.OrderItem;
import com.esyback.ecommerce.entity.StoreMembership;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Transactional
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final MembershipService membershipService;

    public Order createOrder(User user, Tenant tenant, CreateOrderRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order has no items");
        }
        Order order = new Order();
        order.setUser(user);
        order.setTenant(tenant);
        order.setStatus(Order.Status.PLACED);
        order.setOrderNumber("ESY-" + ThreadLocalRandom.current().nextInt(1000, 9999)
            + "-" + ThreadLocalRandom.current().nextInt(1, 9));

        BigDecimal total = BigDecimal.ZERO;
        for (CreateOrderRequest.Item i : req.getItems()) {
            OrderItem oi = new OrderItem();
            oi.setProductId(i.getProductId());
            oi.setTitle(i.getTitle() == null ? "Item" : i.getTitle());
            BigDecimal price = i.getPrice() == null ? BigDecimal.ZERO : i.getPrice();
            int qty = i.getQuantity() == null || i.getQuantity() < 1 ? 1 : i.getQuantity();
            oi.setPrice(price);
            oi.setQuantity(qty);
            order.addItem(oi);
            total = total.add(price.multiply(BigDecimal.valueOf(qty)));
        }
        order.setTotal(total);

        // Buying makes the account a CUSTOMER of the store (no downgrade of owners).
        if (user != null) membershipService.ensure(user, tenant, StoreMembership.Role.CUSTOMER);
        return orderRepository.save(order);
    }

    public List<Order> ordersForUser(User user) {
        return orderRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public long orderCount(Tenant tenant) {
        return orderRepository.countByTenant(tenant);
    }

    public BigDecimal revenue(Tenant tenant) {
        return orderRepository.findByTenantOrderByCreatedAtDesc(tenant).stream()
            .map(Order::getTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
