package com.esyback.ecommerce.dto;

import java.math.BigDecimal;
import java.util.List;

/** Checkout payload from the storefront cart. */
public class CreateOrderRequest {

    private List<Item> items;

    // Delivery (decision D4): either the id of a saved address-book entry, or
    // an inline address that is saved to the book and used. Whichever wins is
    // frozen onto the order as ship* columns.
    private Long addressId;
    private InlineAddress address;

    /** The delivery route the shopper chose (D9). Defaults to collection. */
    private String deliveryRoute;

    /** Whether the shopper added the express upgrade on top of that route. */
    private Boolean deliveryExpress;

    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }
    public Long getAddressId() { return addressId; }
    public void setAddressId(Long addressId) { this.addressId = addressId; }

    public String getDeliveryRoute() { return deliveryRoute; }
    public void setDeliveryRoute(String deliveryRoute) { this.deliveryRoute = deliveryRoute; }

    public Boolean getDeliveryExpress() { return deliveryExpress; }
    public void setDeliveryExpress(Boolean deliveryExpress) { this.deliveryExpress = deliveryExpress; }
    public InlineAddress getAddress() { return address; }
    public void setAddress(InlineAddress address) { this.address = address; }

    public static class InlineAddress {
        private String recipient;
        private String phone;
        private String line;
        private String city;
        private String postalCode;
        private String country;

        public String getRecipient() { return recipient; }
        public void setRecipient(String recipient) { this.recipient = recipient; }
        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public String getLine() { return line; }
        public void setLine(String line) { this.line = line; }
        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
        public String getPostalCode() { return postalCode; }
        public void setPostalCode(String postalCode) { this.postalCode = postalCode; }
        public String getCountry() { return country; }
        public void setCountry(String country) { this.country = country; }
    }

    public static class Item {
        private Long productId;
        private String title;
        private BigDecimal price;
        private Integer quantity;
        /** The chosen combination (D11), when the product has variants. */
        private Long variantId;

        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Long getVariantId() { return variantId; }
        public void setVariantId(Long variantId) { this.variantId = variantId; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }
}
