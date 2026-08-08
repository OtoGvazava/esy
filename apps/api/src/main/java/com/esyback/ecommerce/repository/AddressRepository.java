package com.esyback.ecommerce.repository;

import com.esyback.ecommerce.entity.Address;
import com.esyback.ecommerce.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findByUserOrderByIsDefaultDescCreatedAtDesc(User user);

    Optional<Address> findByIdAndUser(Long id, User user);

    List<Address> findByUserAndIsDefaultTrue(User user);
}
