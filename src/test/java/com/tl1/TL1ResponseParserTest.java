package com.tl1;

import com.tl1.model.TL1Response;
import com.tl1.model.TL1Response.ResponseType;
import com.tl1.model.TL1Response.CompletionCode;
import com.tl1.parser.TL1ResponseParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TL1ResponseParserTest {

    private TL1ResponseParser parser;

    @BeforeEach
    void setUp() {
        parser = new TL1ResponseParser();
    }

    @Test
    void parseCompldResponse() {
        String raw =
            "\r\n\n" +
            "   NE1 2024-01-15 14:30:00\n" +
            "M  1 COMPLD\n" +
            ";\n";

        TL1Response resp = parser.parse(raw);
        assertEquals(ResponseType.NORMAL, resp.getType());
        assertEquals("NE1", resp.getSid());
        assertEquals("2024-01-15", resp.getDate());
        assertEquals("14:30:00", resp.getTime());
        assertEquals("1", resp.getCtag());
        assertEquals(CompletionCode.COMPLD, resp.getCompletionCode());
        assertTrue(resp.isSuccess());
    }

    @Test
    void parseDenyResponse() {
        String raw =
            "\r\n\n" +
            "   SHELF1 24-03-10 09:15:30\n" +
            "M  5 DENY\n" +
            "   \"IIAC: Invalid access identifier\"\n" +
            ";\n";

        TL1Response resp = parser.parse(raw);
        assertEquals(CompletionCode.DENY, resp.getCompletionCode());
        assertFalse(resp.isSuccess());
        assertEquals(1, resp.getTextLines().size());
        assertTrue(resp.getTextLines().get(0).contains("Invalid access identifier"));
    }

    @Test
    void parseResponseWithTextBlock() {
        String raw =
            "\r\n\n" +
            "   NE1 2024-01-15 14:30:00\n" +
            "M  3 COMPLD\n" +
            "   \"FAC-1-1:T1,IS-NR,AINS-DEA,,,NMON\"\n" +
            "   \"FAC-1-2:T1,OOS-MA,AINS-DEA,,,NMON\"\n" +
            ";\n";

        TL1Response resp = parser.parse(raw);
        assertEquals(2, resp.getTextLines().size());
        assertTrue(resp.getTextLines().get(0).contains("FAC-1-1"));
        assertTrue(resp.getTextLines().get(1).contains("FAC-1-2"));
    }

    @Test
    void parseAutonomousMessage() {
        String raw =
            "\r\n\n" +
            "   NE1 2024-01-15 14:30:00\n" +
            "A  123 REPT ALM T1\n" +
            "   \"FAC-1-1,T1,MJ,SA,01-15,14-30-00,,,NMON\"\n" +
            ";\n";

        TL1Response resp = parser.parse(raw);
        assertEquals(ResponseType.AUTONOMOUS, resp.getType());
        assertEquals("123", resp.getCtag());
    }

    @Test
    void isComplete_trueForTerminatedMessage() {
        assertTrue(parser.isComplete("M 1 COMPLD\n;"));
        assertTrue(parser.isComplete("some text;"));
    }

    @Test
    void isComplete_falseForIncomplete() {
        assertFalse(parser.isComplete("M 1 COMPLD\n"));
        assertFalse(parser.isComplete(""));
        assertFalse(parser.isComplete(null));
    }

    @Test
    void splitMessages_singleMessage() {
        List<String> msgs = parser.splitMessages("M 1 COMPLD\n;");
        assertEquals(1, msgs.size());
    }

    @Test
    void splitMessages_multipleMessages() {
        String buffer = "M 1 COMPLD\n; M 2 DENY\n;";
        List<String> msgs = parser.splitMessages(buffer);
        assertEquals(2, msgs.size());
    }

    @Test
    void parseNullOrEmpty() {
        TL1Response resp1 = parser.parse(null);
        assertEquals(ResponseType.UNKNOWN, resp1.getType());

        TL1Response resp2 = parser.parse("");
        assertEquals(ResponseType.UNKNOWN, resp2.getType());
    }
}
