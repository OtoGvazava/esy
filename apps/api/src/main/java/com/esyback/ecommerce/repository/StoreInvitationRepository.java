package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.StoreInvitation;
import com.esyback.ecommerce.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface StoreInvitationRepository extends JpaRepository<StoreInvitation, Long> {

    Optional<StoreInvitation> findByTenantAndEmail(Tenant tenant, String email);

    @org.springframework.data.jpa.repository.Modifying
    @Query("delete from StoreInvitation i where i.createdAt < :before")
    int deleteByCreatedAtBefore(@Param("before") Instant before);

    List<StoreInvitation> findByTenantAndCreatedAtAfterOrderByCreatedAtAsc(Tenant tenant, Instant after);

    /** An address's open invitations, with each store loaded for the list. */
    @Query("select i from StoreInvitation i join fetch i.tenant "
        + "where i.email = :email and i.createdAt > :after order by i.createdAt desc")
    List<StoreInvitation> findOpenFor(@Param("email") String email, @Param("after") Instant after);
}
