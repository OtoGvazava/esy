package com.esyback.ecommerce.web;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The one reading of {@code app.admin-emails} (ADMIN_EMAILS): comma-separated,
 * trimmed, lower-cased, blanks dropped, in the order given. Sign-in, every
 * request's authorities and the admin screen all use it, so they cannot
 * disagree about who is on the list.
 */
public final class AdminEmails {

    public static final String KEY = "app.admin-emails";

    private AdminEmails() {}

    public static Set<String> parse(String raw) {
        if (raw == null || raw.isBlank()) return Set.of();
        return Arrays.stream(raw.split(","))
            .map(s -> s.trim().toLowerCase())
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
