package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Global lookups — one account per identity (email/username are globally
    // unique). These supersede the tenant-scoped variants below for auth.
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByOauthProviderAndOauthProviderId(String oauthProvider, String oauthProviderId);

    @Query("SELECT u FROM User u JOIN FETCH u.roles WHERE u.username = :username")
    Optional<User> findByUsernameWithRoles(@Param("username") String username);

    Optional<User> findByUsernameAndTenant(String username, Tenant tenant);
    
    Optional<User> findByEmailAndTenant(String email, Tenant tenant);
    
    Optional<User> findByOauthProviderAndOauthProviderIdAndTenant(String oauthProvider, String oauthProviderId, Tenant tenant);
    
    @Query("SELECT u FROM User u JOIN FETCH u.roles WHERE u.username = :username AND u.tenant = :tenant")
    Optional<User> findByUsernameWithRoles(@Param("username") String username, @Param("tenant") Tenant tenant);
    
    @Query("SELECT u FROM User u JOIN FETCH u.roles WHERE u.email = :email AND u.tenant = :tenant")
    Optional<User> findByEmailWithRoles(@Param("email") String email, @Param("tenant") Tenant tenant);
    
    boolean existsByUsernameAndTenant(String username, Tenant tenant);
    
    boolean existsByEmailAndTenant(String email, Tenant tenant);
}
