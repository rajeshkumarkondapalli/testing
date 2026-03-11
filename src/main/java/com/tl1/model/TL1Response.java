package com.tl1.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Represents a parsed TL1 response message.
 *
 * TL1 autonomous message format:
 *   <cr><lf><lf>
 *      SID DATE TIME
 *   A  ATAG ALMCDE
 *      <text_block>
 *   ;
 *
 * TL1 response format:
 *   <cr><lf><lf>
 *      SID DATE TIME
 *   M  CTAG COMPLETION_CODE
 *      <text_block>
 *   ;
 */
public class TL1Response {

    public enum ResponseType {
        /** Normal response (M) */
        NORMAL,
        /** Acknowledgment (IP, PF, NA, NG) */
        ACK,
        /** Autonomous message (A) */
        AUTONOMOUS,
        /** Unknown / unparsed */
        UNKNOWN
    }

    public enum CompletionCode {
        COMPLD,  // Completed successfully
        DENY,    // Denied
        PRTL,    // Partial
        DELAY,   // Delayed
        RTRV,    // Retrieve
        UNKNOWN
    }

    private final ResponseType type;
    private final String sid;
    private final String date;
    private final String time;
    private final String ctag;
    private final CompletionCode completionCode;
    private final String completionCodeRaw;
    private final List<String> textLines;
    private final String rawResponse;

    public TL1Response(ResponseType type, String sid, String date, String time,
                       String ctag, String completionCodeRaw, List<String> textLines,
                       String rawResponse) {
        this.type = type;
        this.sid = sid != null ? sid : "";
        this.date = date != null ? date : "";
        this.time = time != null ? time : "";
        this.ctag = ctag != null ? ctag : "";
        this.completionCodeRaw = completionCodeRaw != null ? completionCodeRaw : "";
        this.completionCode = parseCompletionCode(completionCodeRaw);
        this.textLines = textLines != null ? Collections.unmodifiableList(new ArrayList<>(textLines)) : Collections.emptyList();
        this.rawResponse = rawResponse != null ? rawResponse : "";
    }

    private static CompletionCode parseCompletionCode(String code) {
        if (code == null) return CompletionCode.UNKNOWN;
        switch (code.trim().toUpperCase()) {
            case "COMPLD": return CompletionCode.COMPLD;
            case "DENY":   return CompletionCode.DENY;
            case "PRTL":   return CompletionCode.PRTL;
            case "DELAY":  return CompletionCode.DELAY;
            case "RTRV":   return CompletionCode.RTRV;
            default:       return CompletionCode.UNKNOWN;
        }
    }

    public boolean isSuccess() {
        return completionCode == CompletionCode.COMPLD || completionCode == CompletionCode.RTRV;
    }

    public ResponseType getType() { return type; }
    public String getSid() { return sid; }
    public String getDate() { return date; }
    public String getTime() { return time; }
    public String getCtag() { return ctag; }
    public CompletionCode getCompletionCode() { return completionCode; }
    public String getCompletionCodeRaw() { return completionCodeRaw; }
    public List<String> getTextLines() { return textLines; }
    public String getRawResponse() { return rawResponse; }

    /**
     * Returns a human-readable summary of this response.
     */
    public String getSummary() {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("%-8s %-8s  %s %s\n", sid, date, time, ""));
        sb.append(String.format("  CTAG: %s  Code: %s%n", ctag, completionCodeRaw));
        for (String line : textLines) {
            sb.append("  ").append(line).append("\n");
        }
        return sb.toString();
    }

    @Override
    public String toString() {
        return rawResponse;
    }
}
