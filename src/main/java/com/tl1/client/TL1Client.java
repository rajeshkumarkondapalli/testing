package com.tl1.client;

import com.tl1.model.ConnectionConfig;
import com.tl1.model.TL1Command;
import com.tl1.model.TL1Response;
import com.tl1.parser.TL1ResponseParser;

import java.io.*;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * TCP client for TL1 network element communication.
 *
 * Handles:
 * - Connection and disconnection to a TL1 NE
 * - Sending TL1 commands
 * - Receiving and parsing TL1 responses
 * - Autonomous message delivery via callback
 */
public class TL1Client implements AutoCloseable {

    private static final int READ_TIMEOUT_MS = 200;
    private static final int RESPONSE_WAIT_MS = 30000;

    private final ConnectionConfig config;
    private final TL1ResponseParser parser;

    private Socket socket;
    private BufferedWriter writer;
    private BufferedReader reader;
    private volatile boolean running;
    private Thread readerThread;

    private final BlockingQueue<TL1Response> responseQueue = new LinkedBlockingQueue<>();
    private Consumer<TL1Response> autonomousMessageHandler;

    public TL1Client(ConnectionConfig config) {
        this.config = config;
        this.parser = new TL1ResponseParser();
    }

    /**
     * Connect to the TL1 network element.
     *
     * @throws IOException if connection fails
     */
    public void connect() throws IOException {
        if (isConnected()) {
            throw new IllegalStateException("Already connected to " + config);
        }

        socket = new Socket(config.getHost(), config.getPort());
        socket.setSoTimeout(READ_TIMEOUT_MS);
        socket.setKeepAlive(true);

        writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), "UTF-8"));
        reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), "UTF-8"));
        running = true;

        // Start background reader thread
        readerThread = new Thread(this::readLoop, "tl1-reader");
        readerThread.setDaemon(true);
        readerThread.start();
    }

    /**
     * Disconnect from the TL1 network element.
     */
    public void disconnect() {
        running = false;
        if (readerThread != null) {
            readerThread.interrupt();
        }
        closeQuietly();
    }

    /**
     * Returns true if connected.
     */
    public boolean isConnected() {
        return socket != null && socket.isConnected() && !socket.isClosed();
    }

    /**
     * Send a TL1 command and wait for the response.
     *
     * @param command the TL1 command to send
     * @return the response from the NE
     * @throws IOException if the send fails
     * @throws TL1ClientException if no response is received within the timeout
     */
    public TL1Response sendCommand(TL1Command command) throws IOException, TL1ClientException {
        if (!isConnected()) {
            throw new TL1ClientException("Not connected");
        }

        String cmdString = command.toTL1String();
        writer.write(cmdString);
        writer.newLine();
        writer.flush();

        // Wait for a response matching this command's CTAG
        long deadline = System.currentTimeMillis() + RESPONSE_WAIT_MS;
        List<TL1Response> deferrred = new ArrayList<>();

        while (System.currentTimeMillis() < deadline) {
            long remaining = deadline - System.currentTimeMillis();
            try {
                TL1Response resp = responseQueue.poll(Math.min(remaining, 1000), TimeUnit.MILLISECONDS);
                if (resp == null) continue;

                if (command.getCtag().equals(resp.getCtag())) {
                    // Re-queue deferred autonomous messages
                    deferrred.forEach(responseQueue::offer);
                    return resp;
                } else {
                    // Autonomous message or for another command - defer
                    deferrred.add(resp);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new TL1ClientException("Interrupted while waiting for response");
            }
        }

        // Re-queue deferred messages before throwing
        deferrred.forEach(responseQueue::offer);
        throw new TL1ClientException("Timeout waiting for response to CTAG=" + command.getCtag());
    }

    /**
     * Send a raw TL1 string (must end with ';').
     */
    public void sendRaw(String rawCommand) throws IOException {
        if (!isConnected()) {
            throw new IOException("Not connected");
        }
        writer.write(rawCommand);
        writer.newLine();
        writer.flush();
    }

    /**
     * Set a handler for autonomous TL1 messages (alarms, events).
     */
    public void setAutonomousMessageHandler(Consumer<TL1Response> handler) {
        this.autonomousMessageHandler = handler;
    }

    /**
     * Poll for any pending response in the queue (non-blocking).
     */
    public TL1Response pollResponse() {
        return responseQueue.poll();
    }

    // -------------------------------------------------------------------------
    // Background reader loop
    // -------------------------------------------------------------------------

    private void readLoop() {
        StringBuilder buffer = new StringBuilder();

        while (running && !Thread.currentThread().isInterrupted()) {
            try {
                int ch = reader.read();
                if (ch == -1) {
                    // EOF - connection closed by remote
                    running = false;
                    break;
                }
                buffer.append((char) ch);

                // Check if we have a complete TL1 message (ends with ';')
                String current = buffer.toString();
                List<String> messages = parser.splitMessages(current);

                if (!messages.isEmpty()) {
                    // Keep any incomplete tail in the buffer
                    int lastSemi = current.lastIndexOf(';');
                    buffer = new StringBuilder(current.substring(lastSemi + 1));

                    for (String msg : messages) {
                        TL1Response response = parser.parse(msg);
                        dispatch(response);
                    }
                }

            } catch (SocketTimeoutException e) {
                // Normal - just means no data arrived in the read window
            } catch (IOException e) {
                if (running) {
                    running = false;
                }
                break;
            }
        }
    }

    private void dispatch(TL1Response response) {
        if (response.getType() == TL1Response.ResponseType.AUTONOMOUS) {
            if (autonomousMessageHandler != null) {
                autonomousMessageHandler.accept(response);
            }
        } else {
            responseQueue.offer(response);
        }
    }

    private void closeQuietly() {
        try { if (writer != null) writer.close(); } catch (IOException ignored) {}
        try { if (reader != null) reader.close(); } catch (IOException ignored) {}
        try { if (socket != null) socket.close(); } catch (IOException ignored) {}
        socket = null;
        writer = null;
        reader = null;
    }

    @Override
    public void close() {
        disconnect();
    }

    public ConnectionConfig getConfig() {
        return config;
    }
}
