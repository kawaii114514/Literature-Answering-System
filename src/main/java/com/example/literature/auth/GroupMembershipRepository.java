package com.example.literature.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMembershipRepository extends JpaRepository<GroupMembership, GroupMembership.Id> {
}
