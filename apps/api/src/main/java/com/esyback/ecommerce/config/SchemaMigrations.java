package com.esyback.ecommerce.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Explicit DDL that {@code ddl-auto=update} cannot do. Hibernate's update mode
 * is additive-only: it freezes an @Enumerated(STRING) column's
 * CHECK (col IN (…)) at the enum's values as of table creation, and never
 * drops or re-creates it. Adding a constant to the enum therefore passes on H2
 * (create-drop rebuilds the schema each boot) while a populated Postgres
 * rejects every write with "violates check constraint".
 *
 * This runner re-creates those constraints to match the current enum. It runs
 * before DataInitializer (@Order) and is written to be a no-op everywhere it
 * has nothing to fix:
 *  - H2: the DROP...IF EXISTS matches nothing and the ADD mirrors what
 *    create-drop already built.
 *  - Fresh Postgres: same.
 *  - Populated Postgres with the old constraint: the actual fix.
 *
 * Keep the value lists in sync with the enums they mirror — a mismatch here
 * recreates the very trap this class exists to remove.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class SchemaMigrations implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        // StoreMembership.Role gained MANAGER (2026-08). The constraint name is
        // Hibernate 6's default for a single-column check on this table.
        recreateCheck(
            "store_memberships",
            "store_memberships_role_check",
            "role",
            "'OWNER','MANAGER','CUSTOMER'"
        );

        // One verified number, one account (2026-10). A unique INDEX rather
        // than @Column(unique = true): NULLs do not collide on either H2 or
        // Postgres, so every unverified account can sit at NULL, and IF NOT
        // EXISTS makes it a no-op on every boot after the first.
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_verified_phone_uk ON users (verified_phone)");
        log.info("SchemaMigrations: users_verified_phone_uk ensured");
    }

    // No catch: a failed constraint migration must FAIL THE BOOT, not log a
    // warn line and defer the breakage to the first rejected write at runtime —
    // that silent logs-and-continues mode is the exact ddl-auto trap this class
    // exists to remove. H2 accepts both statements (DROP CONSTRAINT IF EXISTS
    // is a no-op there, the ADD mirrors what create-drop built), so nothing
    // legitimate is being protected by swallowing.
    private void recreateCheck(String table, String constraint, String column, String values) {
        jdbc.execute("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + constraint);
        jdbc.execute("ALTER TABLE " + table
            + " ADD CONSTRAINT " + constraint
            + " CHECK (" + column + " IN (" + values + "))");
        log.info("SchemaMigrations: {} re-created on {} ({})", constraint, table, values);
    }
}
