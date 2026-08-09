package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

/**
 * One way a store hands goods over (decision D9). Delivery is not a single
 * setting but four independent routes, each with its own price and its own
 * promised time.
 *
 * <p>Two rules the service enforces and the interface mirrors:
 * <ul>
 *   <li>The last enabled route cannot be switched off — a shop must always
 *       offer at least one way to receive goods.</li>
 *   <li>EXPRESS requires a courier. With both TBILISI and GEORGIA off there is
 *       nothing for express to accelerate.</li>
 * </ul>
 *
 * <p>{@code route} is a validated String rather than {@code @Enumerated} for
 * the reason recorded on {@code AuditLog.action}: an enum column freezes its
 * {@code CHECK} at creation, so a fifth route would reject every write on a
 * populated Postgres while passing on H2.
 */
@Entity
@Table(name = "delivery_options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class DeliveryOption {

    public static final String PICKUP = "PICKUP";
    public static final String TBILISI = "TBILISI";
    public static final String GEORGIA = "GEORGIA";
    public static final String EXPRESS = "EXPRESS";

    /** Display order, and the order the storefront offers them in. */
    public static final List<String> ROUTES = List.of(PICKUP, TBILISI, GEORGIA, EXPRESS);

    /** The routes that put a parcel in a courier's hands. */
    public static final List<String> COURIER_ROUTES = List.of(TBILISI, GEORGIA);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    /** One of {@link #ROUTES}. One row per route per store. */
    @Column(name = "route", nullable = false)
    private String route;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = false;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    /** Order total at or above which this route costs nothing. Null = never free. */
    @Column(name = "free_over_total", precision = 12, scale = 2)
    private BigDecimal freeOverTotal;

    /** The promised time, in the shopper's language. Free text — "1–2 days". */
    @Column(name = "eta_ka")
    private String etaKa;

    @Column(name = "eta_en")
    private String etaEn;

    /** PICKUP only: where and when the shopper collects. */
    @Column(name = "pickup_address")
    private String pickupAddress;

    @Column(name = "pickup_hours")
    private String pickupHours;

    public boolean isCourier() {
        return COURIER_ROUTES.contains(route);
    }
}
