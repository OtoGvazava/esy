package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.PlatformAdminRepository;
import com.esyback.ecommerce.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The admins screen (the design's AD4) names the people on the allow-list:
 * a row carries the name of the account behind the address once someone has
 * signed in with it, and nothing — not the address again, not a guess — for
 * an address nobody has used yet.
 */
@SpringBootTest
class AdminListNameTest {

    @Autowired AdminService adminService;
    @Autowired UserRepository userRepository;
    @Autowired PlatformAdminRepository platformAdminRepository;

    private static final String NAMED = "named-admin@example.com";
    private static final String UNSEEN = "unseen-admin@example.com";
    private static final String ACTOR = "actor@example.com";

    @BeforeEach
    void clean() {
        platformAdminRepository.deleteAll();
        userRepository.findByEmail(NAMED).ifPresent(userRepository::delete);
    }

    private Map<String, Object> row(String email) {
        return adminService.admins().stream()
            .filter(m -> email.equals(m.get("email")))
            .findFirst().orElseThrow();
    }

    @Test
    @Transactional
    void aRowNamesTheAccountBehindTheAddress() {
        User u = new User();
        u.setEmail(NAMED);
        u.setUsername(NAMED);
        u.setFirstName(" Nino ");
        u.setLastName("Beridze");
        u.setIsActive(true);
        userRepository.save(u);
        adminService.grantAdmin(NAMED, ACTOR);
        adminService.grantAdmin(UNSEEN, ACTOR);

        assertThat(row(NAMED).get("name")).isEqualTo("Nino Beridze");
        assertThat(row(UNSEEN)).containsEntry("name", null);
    }
}
