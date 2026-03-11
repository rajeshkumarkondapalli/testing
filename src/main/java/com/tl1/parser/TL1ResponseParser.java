package com.tl1.parser;

import com.tl1.model.TL1Response;
import com.tl1.model.TL1Response.ResponseType;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses raw TL1 response strings into {@link TL1Response} objects.
 *
 * TL1 response format:
 *   \r\n\n
 *      <sid> <date> <time>
 *   M  <ctag> COMPLD|DENY|PRTL|...
 *      "<text>"
 *      ...
 *   ;
 */
public class TL1ResponseParser {

    // Matches: SID DATE TIME on the header line (may have leading spaces)
    // DATE format is flexible: YY-MM-DD, YYYY-MM-DD, or MM-DD-YY
    private static final Pattern HEADER_PATTERN = Pattern.compile(
            "^\\s*(\\S+)\\s+(\\d{2,4}-\\d{2}-\\d{2,4})\\s+(\\d{2}:\\d{2}:\\d{2})");

    // Matches: M  CTAG  COMPLD  (response identifier line)
    private static final Pattern RESPONSE_ID_PATTERN = Pattern.compile(
            "^\\s*([MAI])\\s+(\\S+)\\s+(\\S+)");

    // Matches acknowledgment lines: IP, PF, NA, NG  CTAG
    private static final Pattern ACK_PATTERN = Pattern.compile(
            "^\\s*(IP|PF|NA|NG)\\s+(\\S+)");

    /**
     * Parses a complete TL1 response block (from \r\n\n ... to ;).
     *
     * @param raw the raw TL1 response string
     * @return parsed TL1Response
     */
    public TL1Response parse(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return unknown("", raw);
        }

        String[] lines = raw.split("\\r?\\n");
        String sid = "", date = "", time = "", ctag = "", code = "";
        ResponseType type = ResponseType.UNKNOWN;
        List<String> textLines = new ArrayList<>();

        int lineIndex = 0;

        // Skip blank/control-character leading lines
        while (lineIndex < lines.length && lines[lineIndex].trim().isEmpty()) {
            lineIndex++;
        }

        // Parse header: SID DATE TIME
        if (lineIndex < lines.length) {
            Matcher m = HEADER_PATTERN.matcher(lines[lineIndex]);
            if (m.find()) {
                sid = m.group(1);
                date = m.group(2);
                time = m.group(3);
                lineIndex++;
            }
        }

        // Parse response identifier or acknowledgment
        if (lineIndex < lines.length) {
            String idLine = lines[lineIndex];
            Matcher ackMatcher = ACK_PATTERN.matcher(idLine);
            Matcher respMatcher = RESPONSE_ID_PATTERN.matcher(idLine);

            if (ackMatcher.find()) {
                type = ResponseType.ACK;
                ctag = ackMatcher.group(2);
                code = ackMatcher.group(1);
                lineIndex++;
            } else if (respMatcher.find()) {
                String typeChar = respMatcher.group(1);
                ctag = respMatcher.group(2);
                code = respMatcher.group(3);
                type = "A".equals(typeChar) ? ResponseType.AUTONOMOUS : ResponseType.NORMAL;
                lineIndex++;
            }
        }

        // Collect text block lines (skip terminating ';')
        while (lineIndex < lines.length) {
            String line = lines[lineIndex].trim();
            if (line.equals(";") || line.endsWith(";") && line.length() == 1) {
                break;
            }
            if (!line.isEmpty()) {
                // Strip surrounding quotes if present
                if (line.startsWith("\"") && line.endsWith("\"")) {
                    line = line.substring(1, line.length() - 1);
                }
                textLines.add(line);
            }
            lineIndex++;
        }

        return new TL1Response(type, sid, date, time, ctag, code, textLines, raw);
    }

    /**
     * Checks if a raw string contains a complete TL1 response (ends with lone ';').
     */
    public boolean isComplete(String buffer) {
        if (buffer == null) return false;
        // A complete TL1 message ends with ;\n or just ;
        String trimmed = buffer.trim();
        return trimmed.endsWith(";");
    }

    /**
     * Splits a buffer that may contain multiple TL1 messages.
     */
    public List<String> splitMessages(String buffer) {
        List<String> messages = new ArrayList<>();
        if (buffer == null || buffer.isEmpty()) return messages;

        int start = 0;
        for (int i = 0; i < buffer.length(); i++) {
            if (buffer.charAt(i) == ';') {
                String msg = buffer.substring(start, i + 1).trim();
                if (!msg.isEmpty()) {
                    messages.add(msg);
                }
                start = i + 1;
            }
        }
        return messages;
    }

    private TL1Response unknown(String ctag, String raw) {
        return new TL1Response(ResponseType.UNKNOWN, "", "", "", ctag, "", new ArrayList<>(), raw);
    }
}
