package com.example.literature.auth;

import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {

    private final ResearchGroupRepository groups;
    private final GroupMembershipRepository members;
    private final UserRepository users;

    public GroupService(ResearchGroupRepository groups, GroupMembershipRepository members, UserRepository users) {
        this.groups = groups;
        this.members = members;
        this.users = users;
    }

    @Transactional
    public ResearchGroup create(String ownerUserId, String name) {
        users.findById(ownerUserId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        ResearchGroup group = groups.save(new ResearchGroup(name.strip(), ownerUserId));
        members.save(new GroupMembership(group.id(), ownerUserId, MemberRole.OWNER));
        return group;
    }

    @Transactional(readOnly = true)
    public List<ResearchGroup> list(String userId) {
        return groups.findAccessibleByUserId(userId);
    }

    @Transactional
    public void addMember(String actorUserId, String groupId, String userId, MemberRole role) {
        ResearchGroup group = groups.findById(groupId).orElseThrow(() -> new IllegalArgumentException("Group not found"));
        if (!group.ownerUserId().equals(actorUserId)) {
            throw new AccessDeniedException("Only the group owner can manage members");
        }
        users.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (role == MemberRole.OWNER) {
            throw new IllegalArgumentException("A group has one owner; use EDITOR or VIEWER for members");
        }
        members.save(new GroupMembership(groupId, userId, role));
    }
}
