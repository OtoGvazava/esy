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
    private String addressStreet;
    private String addressCity;
    private String addressCountry;
    private String addressPostalCode;
    // String (not Integer) so a cleared "" field doesn't fail JSON binding;
    // TenantService parses/validates it.
    private String establishedYear;

    // Bank of Georgia merchant credentials. Write-only: the API never echoes
    // them back (TenantMapper exposes only bogConfigured). A blank clientId
    // disconnects BOG; a blank secret with a present clientId keeps the stored
    // secret (so saving other settings doesn't wipe it — the form can't
    // re-send a secret it never received).
    private String bogClientId;
    private String bogClientSecret;

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

    public String getAddressStreet() {
        return addressStreet;
    }

    public void setAddressStreet(String addressStreet) {
        this.addressStreet = addressStreet;
    }

    public String getAddressCity() {
        return addressCity;
    }

    public void setAddressCity(String addressCity) {
        this.addressCity = addressCity;
    }

    public String getAddressCountry() {
        return addressCountry;
    }

    public void setAddressCountry(String addressCountry) {
        this.addressCountry = addressCountry;
    }

    public String getAddressPostalCode() {
        return addressPostalCode;
    }

    public void setAddressPostalCode(String addressPostalCode) {
        this.addressPostalCode = addressPostalCode;
    }

    public String getEstablishedYear() {
        return establishedYear;
    }

    public void setEstablishedYear(String establishedYear) {
        this.establishedYear = establishedYear;
    }

    public String getBogClientId() {
        return bogClientId;
    }

    public void setBogClientId(String bogClientId) {
        this.bogClientId = bogClientId;
    }

    public String getBogClientSecret() {
        return bogClientSecret;
    }

    public void setBogClientSecret(String bogClientSecret) {
        this.bogClientSecret = bogClientSecret;
    }
}
