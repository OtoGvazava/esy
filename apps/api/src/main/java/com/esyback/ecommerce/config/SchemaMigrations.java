package com.esyback.ecommerce.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Explicit DDL that {@code ddl-auto=update} cannot do. Hibernate's update mode
 * is additive-only: it freezes an @Enumerated(STRING) column's
 * CHECK (col IN (…)) at the enum's values as of table creation, and never
 * drops or re-creates it. Adding a constant to the enum therefore passes on H2
 * (create-drop rebuilds the schema each boot) while a populated Postgres
 * rejects every write with "violates check constraint".
 *
 * This runner brings those constraints in line with the current enum. It runs
 * before DataInitializer (@Order) and does nothing where there is nothing to
 * fix:
 *  - Postgres: the constraint's current definition is read first, and it is
 *    re-created only when a value is missing, in ONE transaction with a short
 *    lock_timeout. It used to be dropped and re-added on every boot, as two
 *    autocommit statements: during an overlapping deploy the ALTER queued
 *    behind a checkout and stalled the table, and a failed ADD left the
 *    constraint dropped.
 *  - H2: create-drop has just built it from the enum; the DROP/ADD is kept
 *    there because it is free and keeps the two databases' DDL the same.
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
        ensureCheck(
            "store_memberships",
            "store_memberships_role_check",
            "role",
            List.of("OWNER", "MANAGER", "CUSTOMER")
        );

        // One verified number, one account (2026-10). A unique INDEX rather
        // than @Column(unique = true): NULLs do not collide on either H2 or
        // Postgres, so every unverified account can sit at NULL, and IF NOT
        // EXISTS makes it a no-op on every boot after the first.
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_verified_phone_uk ON users (verified_phone)");

        // One row per store and delivery route. The rows are created lazily on
        // a store's first visit, and two first visits at once inserted the set
        // twice; from then on every checkout's route lookup found two rows and
        // failed until the duplicates were removed by hand. Duplicates already
        // there are removed first (the oldest row of each pair is kept: it is
        // the one the merchant edited), or the index could not be built.
        int dropped = jdbc.update("DELETE FROM delivery_options WHERE id NOT IN "
            + "(SELECT MIN(id) FROM delivery_options GROUP BY tenant_id, route)");
        if (dropped > 0) log.warn("SchemaMigrations: removed {} duplicate delivery_options row(s)", dropped);
        jdbc.execute("CREATE UNIQUE INDEX IF NOT EXISTS delivery_options_tenant_route_uk "
            + "ON delivery_options (tenant_id, route)");
        log.info("SchemaMigrations: unique indexes ensured");
    }

    // No catch: a failed constraint migration must FAIL THE BOOT, not log a
    // warn line and defer the breakage to the first rejected write at runtime —
    // that silent logs-and-continues mode is the exact ddl-auto trap this class
    // exists to remove.
    private void ensureCheck(String table, String constraint, String column, List<String> values) {
        String in = String.join(",", values.stream().map(v -> "'" + v + "'").toList());
        if (!isPostgres()) {
            jdbc.execute("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + constraint);
            jdbc.execute("ALTER TABLE " + table + " ADD CONSTRAINT " + constraint
                + " CHECK (" + column + " IN (" + in + "))");
            return;
        }
        List<String> current = jdbc.queryForList(
            "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = ?", String.class, constraint);
        if (!current.isEmpty() && values.stream().allMatch(v -> current.get(0).contains("'" + v + "'"))) {
            return; // already allows every value: nothing to lock, nothing to do
        }
        // One transaction: if the ADD fails, the DROP rolls back with it.
        jdbc.execute("BEGIN; SET LOCAL lock_timeout = '5s'; "
            + "ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + constraint + "; "
            + "ALTER TABLE " + table + " ADD CONSTRAINT " + constraint
            + " CHECK (" + column + " IN (" + in + ")); COMMIT;");
        log.info("SchemaMigrations: {} re-created on {} ({})", constraint, table, in);
    }

    private boolean isPostgres() {
        Boolean pg = jdbc.execute((java.sql.Connection c) ->
            c.getMetaData().getDatabaseProductName().toLowerCase().contains("postgres"));
        return Boolean.TRUE.equals(pg);
    }
}
