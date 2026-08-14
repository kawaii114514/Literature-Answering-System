package com.example.literature.auth;

import org.springframework.security.core.Authentication;

public final class CurrentUser {

    public static final String LOCAL_DEVELOPER_ID = "00000000-0000-0000-0000-000000000001";

    private CurrentUser() {
    }

    public static String id(Authentication authentication) {
        return authentication == null || authentication.getName() == null
                ? LOCAL_DEVELOPER_ID : authentication.getName();
    }
}
