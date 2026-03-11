package com.tl1.parser;

/**
 * Thrown when a TL1 command or response cannot be parsed.
 */
public class TL1ParseException extends Exception {

    public TL1ParseException(String message) {
        super(message);
    }

    public TL1ParseException(String message, Throwable cause) {
        super(message, cause);
    }
}
