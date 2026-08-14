package com.example.literature.auth;

import com.example.literature.document.KnowledgeSpace;
import com.example.literature.document.KnowledgeSpaceNotFoundException;
import com.example.literature.document.KnowledgeSpaceRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpaceAuthorizationService {

    private final KnowledgeSpaceRepository spaces;
    private final MembershipRepository memberships;

    public SpaceAuthorizationService(KnowledgeSpaceRepository spaces, MembershipRepository memberships) {
        this.spaces = spaces;
        this.memberships = memberships;
    }

    @Transactional(readOnly = true)
    public MemberRole require(String spaceId, String userId, boolean edit) {
        KnowledgeSpace space = spaces.findById(spaceId)
                .orElseThrow(() -> new KnowledgeSpaceNotFoundException(spaceId));
        if (space.ownerUserId() != null && space.ownerUserId().equals(userId)) {
            return MemberRole.OWNER;
        }
        MemberRole role = memberships.findDirectRole(spaceId, userId)
                .or(() -> memberships.findGroupRole(spaceId, userId))
                .map(String::toUpperCase)
                .map(MemberRole::valueOf)
                .orElseThrow(() -> new AccessDeniedException("User is not a member of knowledge space"));
        if (edit && !role.canEdit()) {
            throw new AccessDeniedException("User does not have edit access to knowledge space");
        }
        return role;
    }

    public void requireView(String spaceId, String userId) {
        require(spaceId, userId, false);
    }

    public void requireEdit(String spaceId, String userId) {
        require(spaceId, userId, true);
    }
}
