package com.esyback.ecommerce.dto;

/**
 * Payload for the local development login endpoint. Lets the frontend obtain a
 * real JWT without configuring Google/Apple OAuth2 credentials.
 */
public class DevLoginRequest {

    private String email;
    private String name;
    private Boolean admin;

    public DevLoginRequest() {}

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Boolean getAdmin() {
        return admin;
    }

    public void setAdmin(Boolean admin) {
        this.admin = admin;
    }
}
