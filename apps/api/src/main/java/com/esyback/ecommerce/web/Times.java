package com.esyback.ecommerce.web;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Times as the browser must receive them: instants (…Z). The entities hold
 * the server's zone-less wall clock, which new Date() in a browser reads as
 * its own local time — hours off in Tbilisi, and a different day after
 * midnight (review M6). Every serializer of an order time goes through here.
 */
public final class Times {

    private Times() {}

    public static String instant(LocalDateTime at) {
        return at == null ? null : at.atZone(ZoneId.systemDefault()).toInstant().toString();
    }
}
