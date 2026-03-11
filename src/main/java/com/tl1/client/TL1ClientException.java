package com.tl1.client;

/**
 * Thrown when a TL1 client operation fails.
 */
public class TL1ClientException extends Exception {

    public TL1ClientException(String message) {
        super(message);
    }

    public TL1ClientException(String message, Throwable cause) {
        super(message, cause);
    }
}
