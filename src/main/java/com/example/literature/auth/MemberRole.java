package com.example.literature.auth;

public enum MemberRole {
    OWNER,
    EDITOR,
    VIEWER;

    public boolean canEdit() {
        return this == OWNER || this == EDITOR;
    }
}
