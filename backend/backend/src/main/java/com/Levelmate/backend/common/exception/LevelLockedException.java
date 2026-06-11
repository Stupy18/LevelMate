package com.Levelmate.backend.common.exception;

public class LevelLockedException extends RuntimeException {
    public LevelLockedException(String sessionTitle) {
        super("Level editing is locked while you have an active session: \"" + sessionTitle + "\". It will unlock once the session ends.");
    }

    public LevelLockedException() {
        super("Level editing is locked while you have an active session. It will unlock once the session ends.");
    }
}
