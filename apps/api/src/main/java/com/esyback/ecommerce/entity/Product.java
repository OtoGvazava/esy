package com.esyback.ecommerce.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    @ToString.Include
    private Long id;
    
    @NotBlank(message = "Title is required")
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "image_url")
    private String imageUrl;
    
    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    
    // What this means depends on hasVariants (D11). Without variants it IS the
    // stock. With them it is a cached sum of the variant rows, kept current so
    // list queries and the storefront badge do not have to aggregate — the
    // variant rows remain the truth, and ProductVariantService recomputes this
    // whenever they change.
    @NotNull(message = "Quantity is required")
    @PositiveOrZero(message = "Quantity must be 0 or positive")
    @Column(nullable = false)
    private Integer quantity;

    // Nullable so it can be added to a populated products table; null reads as
    // false, which is correct for every product that predates variants — they
    // simply have no variant rows.
    @Column(name = "has_variants")
    private Boolean hasVariants;

    public boolean variantsEnabled() {
        return Boolean.TRUE.equals(hasVariants);
    }

    /** The longest category name a product may carry. */
    public static final int CATEGORY_MAX = 60;

    /**
     * The merchant's own grouping, in whatever words and language they type
     * ("ლარნაკები", "Mugs"): the storefront's category pills and collection
     * pages are built from these values, so there is no separate category
     * table to keep in step with the products.
     *
     * <p>Nullable, so it can be added to a populated products table, and
     * because an uncategorised product is a normal product. Stored trimmed and
     * never blank — see {@link #cleanCategory}.
     */
    @Column(name = "category", length = CATEGORY_MAX)
    private String category;

    /**
     * A category as typed, made storable: trimmed, and blank read as none.
     * Length is not checked here — the caller decides whether an overlong
     * name is a 400 (the editor) or a line in the import report.
     */
    public static String cleanCategory(String raw) {
        if (raw == null) return null;
        String trimmed = raw.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
