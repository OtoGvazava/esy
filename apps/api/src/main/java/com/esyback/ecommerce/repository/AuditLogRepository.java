package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * The admin audit feed: newest first, capped. GET /api/admin/audit?limit=50
     * passes {@code PageRequest.of(0, limit)} — a Pageable (not a hand-rolled
     * "TOP n") so the cap travels into the SQL as LIMIT on both H2 and Postgres.
     * Always bound it: this table only grows.
     *
     * `id` is the tiebreaker so two rows written in the same millisecond get a
     * stable order instead of an arbitrary one that shifts between pages.
     */
    List<AuditLog> findAllByOrderByAtDescIdDesc(Pageable pageable);

    /** Per-target history, e.g. everything ever done to one store. */
    List<AuditLog> findByTargetTypeAndTargetIdOrderByAtDescIdDesc(String targetType, String targetId);
}
