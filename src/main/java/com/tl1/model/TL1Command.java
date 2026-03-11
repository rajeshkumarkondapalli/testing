package com.tl1.model;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Represents a TL1 (Transaction Language 1) command.
 *
 * TL1 command format:
 *   VERB-MODIFIER:TID:AID:CTAG[::KEYWORD=VALUE,...];
 *
 * Examples:
 *   ACT-USER::admin:1::admin;
 *   RTRV-ALM-ALL:::2;
 *   ENT-T1:SHELF1:FAC-1-1:3::LINECDE=AMI,FMT=D4;
 */
public class TL1Command {

    private static final AtomicInteger ctagCounter = new AtomicInteger(1);

    private final String verb;
    private final String modifier;
    private final String tid;
    private final String aid;
    private final String ctag;
    private final Map<String, String> parameters;

    public TL1Command(String verb, String modifier, String tid, String aid,
                      String ctag, Map<String, String> parameters) {
        this.verb = verb != null ? verb.toUpperCase() : "";
        this.modifier = modifier != null ? modifier.toUpperCase() : "";
        this.tid = tid != null ? tid : "";
        this.aid = aid != null ? aid : "";
        this.ctag = ctag != null ? ctag : String.valueOf(ctagCounter.getAndIncrement());
        this.parameters = parameters != null ? new LinkedHashMap<>(parameters) : new LinkedHashMap<>();
    }

    /** Generate a new auto-incrementing CTAG value. */
    public static String nextCtag() {
        return String.valueOf(ctagCounter.getAndIncrement());
    }

    /**
     * Formats the command as a valid TL1 message string.
     */
    public String toTL1String() {
        StringBuilder sb = new StringBuilder();

        // Command code (VERB-MODIFIER or just VERB)
        sb.append(verb);
        if (modifier != null && !modifier.isEmpty()) {
            sb.append("-").append(modifier);
        }

        // Header block: TID:AID:CTAG
        sb.append(":").append(tid);
        sb.append(":").append(aid);
        sb.append(":").append(ctag);

        // Parameter block
        if (!parameters.isEmpty()) {
            sb.append("::");
            boolean first = true;
            for (Map.Entry<String, String> entry : parameters.entrySet()) {
                if (!first) sb.append(",");
                sb.append(entry.getKey()).append("=").append(entry.getValue());
                first = false;
            }
        }

        sb.append(";");
        return sb.toString();
    }

    public String getVerb() { return verb; }
    public String getModifier() { return modifier; }
    public String getTid() { return tid; }
    public String getAid() { return aid; }
    public String getCtag() { return ctag; }
    public Map<String, String> getParameters() { return parameters; }

    /** Returns the full command code: VERB or VERB-MODIFIER */
    public String getCommandCode() {
        if (modifier == null || modifier.isEmpty()) return verb;
        return verb + "-" + modifier;
    }

    @Override
    public String toString() {
        return toTL1String();
    }
}
