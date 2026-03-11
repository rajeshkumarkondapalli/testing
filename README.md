# TL1 CLI - Java

A Command Line Interface for **TL1 (Transaction Language 1)** network element management over TCP.

## Project Structure

```
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
```

## Build

```bash
mvn package
```

This produces a fat JAR at `target/tl1-cli.jar`.

## Usage

```bash
java -jar target/tl1-cli.jar [host] [port]
```

### CLI Commands

| Command | Description |
|---|---|
| `connect <host> [port]` | Connect to a TL1 NE (default port: 3082) |
| `disconnect` | Disconnect from the current NE |
| `status` | Show connection status |
| `history` | Show command history |
| `help` | Show help |
| `quit` / `exit` | Exit the CLI |

### TL1 Command Formats

**Strict TL1 format:**
```
VERB[-MOD]:TID:AID:CTAG[::KEY=VALUE,...];
```

**CLI shorthand:**
```
VERB[-MOD] [AID] [KEY=VALUE ...]
```

### Common TL1 Commands

```bash
# Authentication
ACT-USER::admin:1::admin;
CANC-USER::admin:2;

# System info
RTRV-HDR:::3;
RTRV-SYS:::4;

# Alarms and conditions
RTRV-ALM-ALL:::5;
RTRV-ALM-EQPT::SHELF-1:6;
RTRV-COND-ALL:::7;

# T1 facility management
RTRV-T1::FAC-1-1:8;
ENT-T1:NE1:FAC-1-2:9::LINECDE=B8ZS,FMT=ESF;
DLT-T1::FAC-1-2:10;
ED-T1::FAC-1-1:11::LINECDE=AMI;

# Loopback
OPR-LPBK-T1::FAC-1-1:12::LPBKTYPE=TERMINAL;
RLS-LPBK-T1::FAC-1-1:13;

# Performance monitoring
RTRV-PM-T1::FAC-1-1:14::TMPER=15-MIN;
INIT-REG-T1::FAC-1-1:15::TMPER=15-MIN;

# Equipment
RTRV-EQPT::SHELF-1-1:16;
```

## TL1 Message Format

**Command:**
```
VERB-MOD:TID:AID:CTAG[::KEY=VALUE,...];
```

**Response:**
```
<cr><lf><lf>
   <SID> <DATE> <TIME>
M  <CTAG> COMPLD|DENY|PRTL
   "<text block>"
;
```

## Features

- Tab-completion for TL1 commands (press `Tab`)
- Persistent command history (`~/.tl1_history`)
- ANSI color output (green = success, red = error)
- Autonomous message display (alarms, events)
- Auto-incrementing CTAG counter
- Both strict TL1 and CLI shorthand input modes
