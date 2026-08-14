package com.example.literature.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MembershipRepository extends JpaRepository<SpaceMembership, SpaceMembership.Id> {

    @Query(value = "select member_role from space_member where space_id = :spaceId and user_id = :userId",
            nativeQuery = true)
    Optional<String> findDirectRole(@Param("spaceId") String spaceId, @Param("userId") String userId);

    @Query(value = "select gm.member_role from group_member gm join knowledge_space ks on ks.group_id = gm.group_id "
            + "where ks.id = :spaceId and gm.user_id = :userId", nativeQuery = true)
    Optional<String> findGroupRole(@Param("spaceId") String spaceId, @Param("userId") String userId);
}
