package com.tl1.cli;

import org.jline.reader.Candidate;
import org.jline.reader.Completer;
import org.jline.reader.LineReader;
import org.jline.reader.ParsedLine;

import java.util.Arrays;
import java.util.List;

/**
 * Tab-completion for TL1 commands in the CLI.
 */
public class TL1Completer implements Completer {

    private static final List<String> COMMANDS = Arrays.asList(
            // Connection management
            "connect",
            "disconnect",
            "status",
            "quit",
            "exit",
            "help",
            // TL1 command verbs
            "ACT-USER",
            "CANC-USER",
            "RTRV-HDR",
            "RTRV-ALM-ALL",
            "RTRV-ALM-EQPT",
            "RTRV-ALM-FAC",
            "RTRV-COND-ALL",
            "RTRV-COND-EQPT",
            "RTRV-COND-FAC",
            "ENT-T1",
            "ENT-T3",
            "ENT-OC3",
            "ENT-OC12",
            "ENT-OC48",
            "ENT-OC192",
            "DLT-T1",
            "DLT-T3",
            "DLT-OC3",
            "DLT-OC12",
            "RTRV-T1",
            "RTRV-T3",
            "RTRV-OC3",
            "RTRV-OC12",
            "ED-T1",
            "ED-T3",
            "OPR-LPBK-T1",
            "RLS-LPBK-T1",
            "RTRV-PM-T1",
            "RTRV-PM-OC3",
            "INIT-REG-T1",
            "RTRV-EQPT",
            "ENT-EQPT",
            "DLT-EQPT",
            "RTRV-SYS"
    );

    @Override
    public void complete(LineReader reader, ParsedLine line, List<Candidate> candidates) {
        String word = line.word();
        for (String cmd : COMMANDS) {
            if (cmd.toLowerCase().startsWith(word.toLowerCase())) {
                candidates.add(new Candidate(cmd));
            }
        }
    }
}
