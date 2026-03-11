package com.tl1.parser;

import com.tl1.model.TL1Command;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses user-input strings into {@link TL1Command} objects.
 *
 * Supported formats:
 *   VERB:TID:AID:CTAG[::PARAM=VALUE,...];
 *   VERB-MOD:TID:AID:CTAG[::PARAM=VALUE,...];
 *   VERB-MOD:TID:AID:CTAG;            (no parameters)
 *
 * Shorthand (CLI-only, no TID required):
 *   VERB-MOD AID [PARAM=VALUE ...]
 */
public class TL1CommandParser {

    // Matches: CMD:TID:AID:CTAG[::PARAMS]
    // Uses non-greedy CMD match so VERB-MOD stops at first colon
    private static final Pattern STRICT_PATTERN = Pattern.compile(
            "^([^:]+):([^:]*):([^:]*):([^:]*)(?:::(.*))?$");

    /**
     * Parse a raw input line into a TL1Command.
     *
     * Accepts both strict TL1 syntax (with colons) and a relaxed CLI shorthand.
     *
     * @param input user input string
     * @return parsed TL1Command
     * @throws TL1ParseException if the input cannot be parsed
     */
    public TL1Command parse(String input) throws TL1ParseException {
        if (input == null || input.trim().isEmpty()) {
            throw new TL1ParseException("Empty command");
        }

        String trimmed = input.trim();

        // Remove trailing semicolon for parsing
        if (trimmed.endsWith(";")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1).trim();
        }

        // Check if it uses strict TL1 colon-separated format
        if (trimmed.contains(":")) {
            return parseStrictFormat(trimmed);
        } else {
            return parseShorthandFormat(trimmed);
        }
    }

    /**
     * Parse strict TL1 format: CMD:TID:AID:CTAG[::PARAMS]
     */
    private TL1Command parseStrictFormat(String input) throws TL1ParseException {
        Matcher m = STRICT_PATTERN.matcher(input);
        if (!m.matches()) {
            throw new TL1ParseException("Invalid TL1 format: expected VERB:TID:AID:CTAG, got: " + input);
        }

        String commandCode = m.group(1).trim();
        String tid         = m.group(2).trim();
        String aid         = m.group(3).trim();
        String ctag        = m.group(4).trim();
        String paramBlock  = m.group(5) != null ? m.group(5).trim() : "";

        if (ctag.isEmpty()) {
            ctag = TL1Command.nextCtag();
        }

        // Split command code into verb and modifier
        String verb, modifier;
        int dashIdx = commandCode.indexOf('-');
        if (dashIdx >= 0) {
            verb = commandCode.substring(0, dashIdx);
            modifier = commandCode.substring(dashIdx + 1);
        } else {
            verb = commandCode;
            modifier = "";
        }

        Map<String, String> params = parseParameters(paramBlock);
        return new TL1Command(verb, modifier, tid, aid, ctag, params);
    }

    /**
     * Parse shorthand format: VERB[-MOD] [AID] [KEY=VALUE ...]
     */
    private TL1Command parseShorthandFormat(String input) throws TL1ParseException {
        String[] tokens = input.trim().split("\\s+", -1);
        if (tokens.length == 0) {
            throw new TL1ParseException("Empty command");
        }

        String commandCode = tokens[0];
        String verb, modifier;
        int dashIdx = commandCode.indexOf('-');
        if (dashIdx >= 0) {
            verb = commandCode.substring(0, dashIdx);
            modifier = commandCode.substring(dashIdx + 1);
        } else {
            verb = commandCode;
            modifier = "";
        }

        String aid = "";
        Map<String, String> params = new LinkedHashMap<>();

        for (int i = 1; i < tokens.length; i++) {
            String token = tokens[i];
            if (token.contains("=")) {
                // KEY=VALUE parameter
                int eq = token.indexOf('=');
                String key = token.substring(0, eq).trim();
                String val = token.substring(eq + 1).trim();
                params.put(key.toUpperCase(), val);
            } else if (aid.isEmpty()) {
                // First non-param token is AID
                aid = token;
            }
        }

        return new TL1Command(verb, modifier, "", aid, TL1Command.nextCtag(), params);
    }

    /**
     * Parse comma-separated KEY=VALUE parameter string.
     */
    private Map<String, String> parseParameters(String paramBlock) {
        Map<String, String> params = new LinkedHashMap<>();
        if (paramBlock == null || paramBlock.trim().isEmpty()) {
            return params;
        }

        for (String part : paramBlock.split(",")) {
            part = part.trim();
            int eq = part.indexOf('=');
            if (eq > 0) {
                String key = part.substring(0, eq).trim().toUpperCase();
                String val = part.substring(eq + 1).trim();
                params.put(key, val);
            } else if (!part.isEmpty()) {
                // Positional parameter stored with empty key index
                params.put(part.toUpperCase(), "");
            }
        }
        return params;
    }
}
