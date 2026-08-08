package com.esyback.ecommerce.dto;

import java.math.BigDecimal;

public class ProductListDto {
    
    private Long id;
    private String title;
    private String imageUrl;
    private BigDecimal price;
    // Stock on hand — the back-office product list renders availability from
    // list rows, so it must travel with them (detail-only before).
    private Integer quantity;

    // Constructors
    public ProductListDto() {}

    public ProductListDto(Long id, String title, String imageUrl, BigDecimal price, Integer quantity) {
        this.id = id;
        this.title = title;
        this.imageUrl = imageUrl;
        this.price = price;
        this.quantity = quantity;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getImageUrl() {
        return imageUrl;
    }
    
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
    
    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
