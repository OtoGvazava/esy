package com.esyback.ecommerce.dto;

/**
 * One gallery image as the SPA consumes it: a stable same-origin URL the
 * browser can put straight in an <img src>. Bytes are never serialized here —
 * they stream from GET /api/products/{productId}/images/{id}.
 */
public class ProductImageDto {

    private Long id;
    private String url;
    private int position;

    public ProductImageDto() {}

    public ProductImageDto(Long id, String url, int position) {
        this.id = id;
        this.url = url;
        this.position = position;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }
}
