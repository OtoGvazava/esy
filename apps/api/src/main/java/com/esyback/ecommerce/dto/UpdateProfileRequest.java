package com.esyback.ecommerce.dto;

/**
 * Mandatory shopper profile: {@code firstName}, {@code lastName} and
 * {@code dateOfBirth} (ISO {@code yyyy-MM-dd}) are all required. The phone
 * number is a separate field (PUT /api/account/phone).
 */
public class UpdateProfileRequest {

    private String firstName;
    private String lastName;
    private String dateOfBirth;

    public UpdateProfileRequest() {}

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(String dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }
}
