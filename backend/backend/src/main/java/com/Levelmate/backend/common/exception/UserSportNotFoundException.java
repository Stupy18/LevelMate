package com.Levelmate.backend.common.exception;

public class UserSportNotFoundException extends RuntimeException {
    public UserSportNotFoundException() {
        super("Sport not found in your profile");
    }
}
