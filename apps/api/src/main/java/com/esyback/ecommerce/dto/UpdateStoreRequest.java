package com.esyback.ecommerce.dto;

/**
 * Owner-editable store branding. Subdomain and the unique internal {@code name}
 * are intentionally absent: they are the tenant routing key + shared-cookie
 * domain and the directory identity, so changing them would break existing
 * links and sessions. TenantService normalizes/falls back per field.
 */
public class UpdateStoreRequest {

    private String displayName;
    private String description;
    private String logoUrl;
    private String primaryColor;
    private String secondaryColor;
    private String category;

    public UpdateStoreRequest() {}

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public String getPrimaryColor() {
        return primaryColor;
    }

    public void setPrimaryColor(String primaryColor) {
        this.primaryColor = primaryColor;
    }

    public String getSecondaryColor() {
        return secondaryColor;
    }

    public void setSecondaryColor(String secondaryColor) {
        this.secondaryColor = secondaryColor;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
