package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.PlatformAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlatformAdminRepository extends JpaRepository<PlatformAdmin, Long> {

    // IgnoreCase everywhere: rows are stored normalized (PlatformAdmin.of), but
    // a lookup must not depend on the caller having normalized its argument.
    Optional<PlatformAdmin> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /** Stable order for GET /api/admin/admins. */
    List<PlatformAdmin> findAllByOrderByEmailAsc();

    /**
     * Returns the number of rows removed, so DELETE /api/admin/admins/{email}
     * can answer 404 vs 204 without a separate read.
     *
     * @Transactional is required: derived delete queries — unlike the inherited
     * CrudRepository.delete* methods — are not transactional by default and
     * throw TransactionRequiredException when called outside one.
     */
    @Transactional
    long deleteByEmailIgnoreCase(String email);
}
