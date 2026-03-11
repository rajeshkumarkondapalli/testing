package com.tl1.model;

/**
 * Holds configuration for a TL1 network element connection.
 */
public class ConnectionConfig {

    public static final int DEFAULT_PORT = 3082;
    public static final int DEFAULT_TIMEOUT_MS = 30000;

    private final String host;
    private final int port;
    private final int timeoutMs;
    private String username;
    private String password;

    public ConnectionConfig(String host, int port, int timeoutMs) {
        this.host = host;
        this.port = port;
        this.timeoutMs = timeoutMs;
    }

    public ConnectionConfig(String host, int port) {
        this(host, port, DEFAULT_TIMEOUT_MS);
    }

    public ConnectionConfig(String host) {
        this(host, DEFAULT_PORT, DEFAULT_TIMEOUT_MS);
    }

    public String getHost() { return host; }
    public int getPort() { return port; }
    public int getTimeoutMs() { return timeoutMs; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }

    public void setCredentials(String username, String password) {
        this.username = username;
        this.password = password;
    }

    @Override
    public String toString() {
        return host + ":" + port;
    }
}
