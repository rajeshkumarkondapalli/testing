# Project Structure
src/
├── main/java/com/tl1/
│   ├── cli/
│   │   ├── TL1CLI.java          # Main CLI entry point (JLine3 REPL)
│   │   └── TL1Completer.java    # Tab-completion for TL1 commands
│   ├── client/
│   │   ├── TL1Client.java       # TCP client with background reader thread
│   │   └── TL1ClientException.java
│   ├── model/
│   │   ├── TL1Command.java      # TL1 command with format serialization
│   │   ├── TL1Response.java     # Parsed TL1 response model
│   │   └── ConnectionConfig.java
│   └── parser/
│       ├── TL1CommandParser.java  # Parses strict & shorthand command formats
│       ├── TL1ResponseParser.java # Parses TL1 response messages
│       └── TL1ParseException.java
└── test/java/com/tl1/
    ├── TL1CommandTest.java        # 9 tests
    ├── TL1CommandParserTest.java  # 11 tests
    └── TL1ResponseParserTest.java # 9 tests

Key Features
TL1 command format: VERB-MOD:TID:AID:CTAG[::KEY=VALUE,...];
Dual input modes: Strict TL1 format or relaxed VERB-MOD AID KEY=VALUE shorthand
TCP client: Async background reader with autonomous message dispatch
JLine3 CLI: Tab-completion, command history (~/.tl1_history), ANSI colors
29 unit tests: All passing
Usage
java -jar tl1-cli.jar [host] [port]

# Inside the CLI:
connect 192.168.1.100 3082
ACT-USER::admin:1::admin;
RTRV-ALM-ALL:::2;
RTRV-T1::FAC-1-1:3;
