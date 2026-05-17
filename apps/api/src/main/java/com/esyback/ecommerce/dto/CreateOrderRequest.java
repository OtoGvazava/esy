package com.esyback.ecommerce.dto;

import java.math.BigDecimal;
import java.util.List;

/** Checkout payload from the storefront cart. */
public class CreateOrderRequest {

    private List<Item> items;

    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }

    public static class Item {
        private Long productId;
        private String title;
        private BigDecimal price;
        private Integer quantity;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}
