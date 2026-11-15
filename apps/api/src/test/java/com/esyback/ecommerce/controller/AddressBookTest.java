package com.esyback.ecommerce.controller;

import com.esyback.ecommerce.entity.Address;
import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.AddressRepository;
import com.esyback.ecommerce.repository.RoleRepository;
import com.esyback.ecommerce.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The address book's two write rules (review, Low): one default address per
 * account even under a double submit, and an edit that empties a required
 * field is a 400, not a 500 from the NOT NULL column.
 */
@SpringBootTest
class AddressBookTest {

    @Autowired AddressController controller;
    @Autowired AddressRepository addressRepository;
    @Autowired UserRepository userRepository;
    @Autowired RoleRepository roleRepository;

    private static final String EMAIL = "address-book@esy.test";
    private User user;
    private Authentication auth;

    @BeforeEach
    void account() {
        User u = new User();
        u.setUsername(EMAIL);
        u.setEmail(EMAIL);
        u.setIsActive(true);
        u.addRole(roleRepository.findByName("USER").orElseThrow());
        user = userRepository.save(u);
        auth = new TestingAuthenticationToken(EMAIL, null, "ROLE_USER");
        auth.setAuthenticated(true);
    }

    @AfterEach
    void clean() {
        addressRepository.deleteAll(addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user));
        userRepository.delete(user);
    }

    private static Map<String, String> body(String recipient, boolean isDefault) {
        return Map.of("recipient", recipient, "phone", "+995555000000", "line", "1 Rustaveli Ave",
            "city", "Tbilisi", "isDefault", Boolean.toString(isDefault));
    }

    @Test
    @DisplayName("parallel 'make this my default' saves leave exactly one default")
    void oneDefaultUnderConcurrency() throws Exception {
        int n = 8;
        ExecutorService pool = Executors.newFixedThreadPool(n);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<?>> all = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            String who = "Recipient " + i;
            all.add(pool.submit(() -> {
                go.await();
                controller.create(body(who, true), auth);
                return null;
            }));
        }
        go.countDown();
        for (Future<?> f : all) f.get();
        pool.shutdown();

        List<Address> saved = addressRepository.findByUserOrderByIsDefaultDescCreatedAtDesc(user);
        assertThat(saved).hasSize(n);
        assertThat(saved.stream().filter(a -> Boolean.TRUE.equals(a.getIsDefault())).count()).isEqualTo(1);
    }

    @Test
    @DisplayName("an edit that blanks a required field is refused with 400 and changes nothing")
    void blankingARequiredFieldIs400() {
        Long id = (Long) controller.create(body("Ann", false), auth).getBody().get("id");

        assertThatThrownBy(() -> controller.update(id, Map.of("recipient", "  "), auth))
            .isInstanceOfSatisfying(ResponseStatusException.class,
                e -> assertThat(e.getStatusCode().value()).isEqualTo(400));
        assertThat(addressRepository.findById(id).orElseThrow().getRecipient()).isEqualTo("Ann");
    }
}
