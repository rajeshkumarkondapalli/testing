package com.tl1.cli;

import com.tl1.client.TL1Client;
import com.tl1.client.TL1ClientException;
import com.tl1.model.ConnectionConfig;
import com.tl1.model.TL1Command;
import com.tl1.model.TL1Response;
import com.tl1.parser.TL1CommandParser;
import com.tl1.parser.TL1ParseException;
import org.jline.reader.*;
import org.jline.reader.impl.DefaultParser;
import org.jline.reader.impl.history.DefaultHistory;
import org.jline.terminal.Terminal;
import org.jline.terminal.TerminalBuilder;
import org.jline.utils.AttributedStringBuilder;
import org.jline.utils.AttributedStyle;

import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Paths;
import java.util.Arrays;

/**
 * TL1 Command Line Interface.
 *
 * Usage:
 *   java -jar tl1-cli.jar [host] [port]
 *
 * Built-in commands:
 *   connect [host] [port]   - Connect to a TL1 NE
 *   disconnect               - Disconnect from the current NE
 *   status                   - Show connection status
 *   help                     - Show help
 *   quit / exit              - Exit the CLI
 *
 * TL1 commands are sent directly:
 *   ACT-USER::admin:1::admin;
 *   RTRV-ALM-ALL:::2;
 *   RTRV-HDR:::3;
 */
public class TL1CLI {

    private static final String VERSION = "1.0.0";
    private static final String PROMPT_DISCONNECTED = "tl1> ";
    private static final String HISTORY_FILE = ".tl1_history";

    private Terminal terminal;
    private LineReader lineReader;
    private PrintWriter out;

    private TL1Client client;
    private final TL1CommandParser commandParser = new TL1CommandParser();

    public static void main(String[] args) {
        new TL1CLI().run(args);
    }

    public void run(String[] args) {
        try {
            initTerminal();
            printBanner();

            // Auto-connect if host specified on command line
            if (args.length >= 1) {
                String host = args[0];
                int port = args.length >= 2 ? Integer.parseInt(args[1]) : ConnectionConfig.DEFAULT_PORT;
                doConnect(host, port);
            }

            mainLoop();

        } catch (Exception e) {
            System.err.println("Fatal error: " + e.getMessage());
            System.exit(1);
        } finally {
            cleanup();
        }
    }

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    private void initTerminal() throws IOException {
        terminal = TerminalBuilder.builder()
                .system(true)
                .build();

        out = terminal.writer();

        DefaultHistory history = new DefaultHistory();
        lineReader = LineReaderBuilder.builder()
                .terminal(terminal)
                .completer(new TL1Completer())
                .history(history)
                .parser(new DefaultParser())
                .variable(LineReader.HISTORY_FILE, Paths.get(System.getProperty("user.home"), HISTORY_FILE))
                .variable(LineReader.HISTORY_SIZE, 500)
                .option(LineReader.Option.AUTO_FRESH_LINE, true)
                .build();
    }

    private void printBanner() {
        out.println(bold("╔══════════════════════════════════════════╗"));
        out.println(bold("║         TL1 CLI  v" + VERSION + "                  ║"));
        out.println(bold("║   Transaction Language 1 Interface       ║"));
        out.println(bold("╚══════════════════════════════════════════╝"));
        out.println();
        out.println("Type " + bold("help") + " for available commands, " + bold("quit") + " to exit.");
        out.println();
        out.flush();
    }

    // -------------------------------------------------------------------------
    // Main REPL loop
    // -------------------------------------------------------------------------

    private void mainLoop() {
        while (true) {
            String prompt = buildPrompt();
            String line;

            try {
                line = lineReader.readLine(prompt);
            } catch (UserInterruptException e) {
                out.println("^C  (type 'quit' to exit)");
                continue;
            } catch (EndOfFileException e) {
                break;
            }

            if (line == null) break;

            line = line.trim();
            if (line.isEmpty()) continue;

            if (!handleLine(line)) {
                break; // quit requested
            }
        }
    }

    /**
     * Process one line of input. Returns false to signal exit.
     */
    private boolean handleLine(String line) {
        String lower = line.toLowerCase();

        // Built-in CLI commands
        if (lower.equals("quit") || lower.equals("exit")) {
            out.println("Goodbye.");
            return false;
        }

        if (lower.equals("help") || lower.equals("?")) {
            printHelp();
            return true;
        }

        if (lower.equals("status")) {
            printStatus();
            return true;
        }

        if (lower.startsWith("connect")) {
            handleConnect(line);
            return true;
        }

        if (lower.equals("disconnect")) {
            doDisconnect();
            return true;
        }

        if (lower.startsWith("history")) {
            printHistory();
            return true;
        }

        // Everything else: treat as a TL1 command
        sendTL1Command(line);
        return true;
    }

    // -------------------------------------------------------------------------
    // Built-in command handlers
    // -------------------------------------------------------------------------

    private void handleConnect(String line) {
        String[] parts = line.split("\\s+");
        String host;
        int port = ConnectionConfig.DEFAULT_PORT;

        if (parts.length < 2) {
            out.println(error("Usage: connect <host> [port]"));
            return;
        }

        host = parts[1];
        if (parts.length >= 3) {
            try {
                port = Integer.parseInt(parts[2]);
            } catch (NumberFormatException e) {
                out.println(error("Invalid port: " + parts[2]));
                return;
            }
        }

        doConnect(host, port);
    }

    private void doConnect(String host, int port) {
        if (client != null && client.isConnected()) {
            out.println(warn("Already connected to " + client.getConfig() + ". Disconnect first."));
            return;
        }

        ConnectionConfig cfg = new ConnectionConfig(host, port);
        out.print("Connecting to " + bold(host + ":" + port) + " ... ");
        out.flush();

        try {
            client = new TL1Client(cfg);
            client.setAutonomousMessageHandler(this::onAutonomousMessage);
            client.connect();
            out.println(success("Connected"));
        } catch (IOException e) {
            out.println(error("Failed: " + e.getMessage()));
            client = null;
        }
    }

    private void doDisconnect() {
        if (client == null || !client.isConnected()) {
            out.println(warn("Not connected."));
            return;
        }
        out.print("Disconnecting from " + client.getConfig() + " ... ");
        out.flush();
        client.disconnect();
        client = null;
        out.println(success("Disconnected"));
    }

    private void sendTL1Command(String input) {
        if (client == null || !client.isConnected()) {
            out.println(error("Not connected. Use: connect <host> [port]"));
            return;
        }

        TL1Command command;
        try {
            command = commandParser.parse(input);
        } catch (TL1ParseException e) {
            out.println(error("Parse error: " + e.getMessage()));
            return;
        }

        out.println(dim(">> " + command.toTL1String()));
        out.flush();

        try {
            TL1Response response = client.sendCommand(command);
            printResponse(response);
        } catch (IOException e) {
            out.println(error("IO error: " + e.getMessage()));
        } catch (TL1ClientException e) {
            out.println(error("Error: " + e.getMessage()));
        }
    }

    private void onAutonomousMessage(TL1Response msg) {
        out.println();
        out.println(warn("[AUTONOMOUS MESSAGE]"));
        printResponse(msg);
        out.print(buildPrompt());
        out.flush();
    }

    // -------------------------------------------------------------------------
    // Display helpers
    // -------------------------------------------------------------------------

    private void printResponse(TL1Response response) {
        out.println(dim("─".repeat(60)));

        // Header line
        String headerColor = response.isSuccess() ? success("") : error("");
        out.printf("  %-12s  %s %s%n", response.getSid(), response.getDate(), response.getTime());
        out.printf("  CTAG: %-10s  ", response.getCtag());

        String code = response.getCompletionCodeRaw();
        if (response.isSuccess()) {
            out.println(success(code));
        } else {
            out.println(error(code));
        }

        // Text block
        for (String line : response.getTextLines()) {
            out.println("  " + line);
        }

        out.println(dim("─".repeat(60)));
        out.flush();
    }

    private void printStatus() {
        if (client != null && client.isConnected()) {
            out.println(success("Connected") + " to " + bold(client.getConfig().toString()));
        } else {
            out.println(warn("Not connected"));
        }
    }

    private void printHistory() {
        History history = lineReader.getHistory();
        int i = 1;
        for (History.Entry entry : history) {
            out.printf("  %4d  %s%n", i++, entry.line());
        }
        out.flush();
    }

    private void printHelp() {
        out.println();
        out.println(bold("TL1 CLI v" + VERSION + " - Help"));
        out.println(dim("─".repeat(60)));
        out.println();
        out.println(bold("Connection Commands:"));
        out.println("  connect <host> [port]   Connect to TL1 NE (default port: " + ConnectionConfig.DEFAULT_PORT + ")");
        out.println("  disconnect              Disconnect from current NE");
        out.println("  status                  Show connection status");
        out.println();
        out.println(bold("TL1 Commands (sent directly to the NE):"));
        out.println("  Strict format:  VERB[-MOD]:TID:AID:CTAG[::KEY=VAL,...];");
        out.println("  Short format:   VERB[-MOD] [AID] [KEY=VAL ...]");
        out.println();
        out.println(bold("Common TL1 Commands:"));
        out.println("  ACT-USER::admin:1::admin;          Log in");
        out.println("  CANC-USER::admin:2;                Log out");
        out.println("  RTRV-HDR:::3;                      Retrieve header");
        out.println("  RTRV-ALM-ALL:::4;                  Retrieve all alarms");
        out.println("  RTRV-ALM-EQPT::SHELF-1:5;          Retrieve equipment alarms");
        out.println("  RTRV-COND-ALL:::6;                 Retrieve all conditions");
        out.println("  RTRV-T1::FAC-1-1:7;                Retrieve T1 facility");
        out.println("  ENT-T1:NE1:FAC-1-2:8::LINECDE=B8ZS,FMT=ESF;  Create T1");
        out.println("  DLT-T1::FAC-1-2:9;                 Delete T1");
        out.println("  OPR-LPBK-T1::FAC-1-1:10::LPBKTYPE=TERMINAL;  Loopback");
        out.println("  RTRV-PM-T1::FAC-1-1:11::TMPER=15-MIN;  Performance monitoring");
        out.println();
        out.println(bold("CLI Controls:"));
        out.println("  Tab              Command auto-completion");
        out.println("  Up/Down arrow    Navigate command history");
        out.println("  history          Show command history");
        out.println("  help / ?         Show this help");
        out.println("  quit / exit      Exit the CLI");
        out.println();
        out.flush();
    }

    private String buildPrompt() {
        if (client != null && client.isConnected()) {
            return bold("[" + client.getConfig().getHost() + "]") + " tl1> ";
        }
        return PROMPT_DISCONNECTED;
    }

    // -------------------------------------------------------------------------
    // ANSI color helpers
    // -------------------------------------------------------------------------

    private String bold(String s) {
        return new AttributedStringBuilder()
                .style(AttributedStyle.BOLD)
                .append(s)
                .style(AttributedStyle.DEFAULT)
                .toAnsi(terminal);
    }

    private String dim(String s) {
        return new AttributedStringBuilder()
                .style(AttributedStyle.DEFAULT.faint())
                .append(s)
                .style(AttributedStyle.DEFAULT)
                .toAnsi(terminal);
    }

    private String success(String s) {
        return new AttributedStringBuilder()
                .style(AttributedStyle.DEFAULT.foreground(AttributedStyle.GREEN).bold())
                .append(s.isEmpty() ? "COMPLD" : s)
                .style(AttributedStyle.DEFAULT)
                .toAnsi(terminal);
    }

    private String error(String s) {
        return new AttributedStringBuilder()
                .style(AttributedStyle.DEFAULT.foreground(AttributedStyle.RED).bold())
                .append(s)
                .style(AttributedStyle.DEFAULT)
                .toAnsi(terminal);
    }

    private String warn(String s) {
        return new AttributedStringBuilder()
                .style(AttributedStyle.DEFAULT.foreground(AttributedStyle.YELLOW))
                .append(s)
                .style(AttributedStyle.DEFAULT)
                .toAnsi(terminal);
    }

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    private void cleanup() {
        if (client != null) {
            client.disconnect();
        }
        try {
            if (terminal != null) terminal.close();
        } catch (IOException ignored) {}
    }
}
