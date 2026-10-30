package com.esyback.ecommerce.config;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.UserRepository;
import com.esyback.ecommerce.service.SmsSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Fills {@code verified_phone} for accounts verified before the column existed.
 *
 * <p>Runs after {@link SchemaMigrations} has created the unique index, and is a
 * no-op once every verified account has the column set. Accounts are taken
 * oldest first, so when two of them verified the same number before numbers
 * were unique, the older one keeps it. The newer one is marked unverified
 * rather than left holding a number it cannot have: it meets the registration
 * gate on its next visit and is told the number is taken, which is the honest
 * outcome of the one-number-one-account rule.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class PhoneBackfill implements CommandLineRunner {

    private final UserRepository users;

    @Override
    public void run(String... args) {
        List<User> pending = users.findByPhoneVerifiedTrueAndVerifiedPhoneIsNullOrderByIdAsc();
        if (pending.isEmpty()) return;

        Set<String> claimed = new HashSet<>();
        int filled = 0, unverified = 0;
        for (User u : pending) {
            String number = SmsSender.normalisePhone(u.getPhoneNumber());
            if (number == null || !claimed.add(number) || users.existsByVerifiedPhoneAndIdNot(number, u.getId())) {
                u.setPhoneVerified(false);
                unverified++;
            } else {
                u.setVerifiedPhone(number);
                filled++;
            }
            users.save(u);
        }
        log.info("PhoneBackfill: {} verified number(s) recorded, {} account(s) unverified "
            + "(duplicate or unusable number — they meet the registration gate)", filled, unverified);
    }
}
