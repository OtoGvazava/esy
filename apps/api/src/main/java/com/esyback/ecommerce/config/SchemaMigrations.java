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
    }

    private void recreateCheck(String table, String constraint, String column, String values) {
        try {
            jdbc.execute("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + constraint);
            jdbc.execute("ALTER TABLE " + table
                + " ADD CONSTRAINT " + constraint
                + " CHECK (" + column + " IN (" + values + "))");
            log.info("SchemaMigrations: {} re-created on {} ({})", constraint, table, values);
        } catch (Exception e) {
            // Do not block boot: H2 syntax differences or an already-correct
            // schema must never take the app down. Postgres failures show up
            // loudly here and again on the first rejected write.
            log.warn("SchemaMigrations: could not re-create {} on {}: {}",
                constraint, table, e.getMessage());
        }
    }
}
