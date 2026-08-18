package com.example.literature.auth;

import com.example.literature.document.KnowledgeSpace;
import com.example.literature.document.KnowledgeSpaceRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpaceService {

    private final KnowledgeSpaceRepository spaces;
    private final MembershipRepository members;
    private final ResearchGroupRepository groups;
    private final SpaceAuthorizationService authorization;

    public SpaceService(
            KnowledgeSpaceRepository spaces,
            MembershipRepository members,
            ResearchGroupRepository groups,
            SpaceAuthorizationService authorization) {
        this.spaces = spaces;
        this.members = members;
        this.groups = groups;
        this.authorization = authorization;
    }

    @Transactional
    public KnowledgeSpace create(String ownerUserId, String name, String groupId) {
        if (groupId != null) {
            ResearchGroup group = groups.findById(groupId).orElseThrow(() -> new IllegalArgumentException("Group not found"));
            if (!group.ownerUserId().equals(ownerUserId)) {
                throw new org.springframework.security.access.AccessDeniedException("Only group owner can create a group space");
            }
        }
        KnowledgeSpace space = spaces.save(new KnowledgeSpace(name.strip(), ownerUserId, groupId));
        members.save(new SpaceMembership(space.id(), ownerUserId, MemberRole.OWNER));
        return space;
    }

    @Transactional(readOnly = true)
    public List<AccessibleSpace> list(String userId) {
        return spaces.findAccessibleByUserId(userId).stream()
                .map(space -> new AccessibleSpace(space, authorization.require(space.id(), userId, false)))
                .toList();
    }

    public record AccessibleSpace(KnowledgeSpace space, MemberRole role) {
    }
}
