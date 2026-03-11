package com.tl1;

import com.tl1.model.TL1Command;
import com.tl1.parser.TL1CommandParser;
import com.tl1.parser.TL1ParseException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TL1CommandParserTest {

    private TL1CommandParser parser;

    @BeforeEach
    void setUp() {
        parser = new TL1CommandParser();
    }

    @Test
    void parseStrictFormat_basicCommand() throws TL1ParseException {
        TL1Command cmd = parser.parse("RTRV-HDR:::1;");
        assertEquals("RTRV", cmd.getVerb());
        assertEquals("HDR", cmd.getModifier());
        assertEquals("", cmd.getTid());
        assertEquals("", cmd.getAid());
        assertEquals("1", cmd.getCtag());
        assertTrue(cmd.getParameters().isEmpty());
    }

    @Test
    void parseStrictFormat_withTidAndAid() throws TL1ParseException {
        TL1Command cmd = parser.parse("ENT-T1:SHELF1:FAC-1-1:3;");
        assertEquals("ENT", cmd.getVerb());
        assertEquals("T1", cmd.getModifier());
        assertEquals("SHELF1", cmd.getTid());
        assertEquals("FAC-1-1", cmd.getAid());
        assertEquals("3", cmd.getCtag());
    }

    @Test
    void parseStrictFormat_withParameters() throws TL1ParseException {
        TL1Command cmd = parser.parse("ENT-T1:NE1:FAC-1-2:5::LINECDE=B8ZS,FMT=ESF;");
        assertEquals("B8ZS", cmd.getParameters().get("LINECDE"));
        assertEquals("ESF", cmd.getParameters().get("FMT"));
    }

    @Test
    void parseStrictFormat_activateUser() throws TL1ParseException {
        TL1Command cmd = parser.parse("ACT-USER::admin:1::admin;");
        assertEquals("ACT", cmd.getVerb());
        assertEquals("USER", cmd.getModifier());
        assertEquals("admin", cmd.getAid());
        assertEquals("1", cmd.getCtag());
        assertTrue(cmd.getParameters().containsKey("ADMIN"));
    }

    @Test
    void parseShorthandFormat_verbOnly() throws TL1ParseException {
        TL1Command cmd = parser.parse("RTRV-HDR");
        assertEquals("RTRV", cmd.getVerb());
        assertEquals("HDR", cmd.getModifier());
        assertEquals("", cmd.getAid());
    }

    @Test
    void parseShorthandFormat_withAid() throws TL1ParseException {
        TL1Command cmd = parser.parse("RTRV-T1 FAC-1-1");
        assertEquals("RTRV", cmd.getVerb());
        assertEquals("T1", cmd.getModifier());
        assertEquals("FAC-1-1", cmd.getAid());
    }

    @Test
    void parseShorthandFormat_withParams() throws TL1ParseException {
        TL1Command cmd = parser.parse("ENT-T1 FAC-1-2 LINECDE=B8ZS FMT=ESF");
        assertEquals("FAC-1-2", cmd.getAid());
        assertEquals("B8ZS", cmd.getParameters().get("LINECDE"));
        assertEquals("ESF", cmd.getParameters().get("FMT"));
    }

    @Test
    void toTL1String_strictFormat() throws TL1ParseException {
        TL1Command cmd = parser.parse("RTRV-HDR:::42;");
        String tl1 = cmd.toTL1String();
        assertTrue(tl1.startsWith("RTRV-HDR"));
        assertTrue(tl1.contains(":42"));
        assertTrue(tl1.endsWith(";"));
    }

    @Test
    void parseEmptyCommand_throwsException() {
        assertThrows(TL1ParseException.class, () -> parser.parse(""));
        assertThrows(TL1ParseException.class, () -> parser.parse(null));
        assertThrows(TL1ParseException.class, () -> parser.parse("   "));
    }

    @Test
    void commandCodeWithoutModifier() throws TL1ParseException {
        TL1Command cmd = parser.parse("RTRV:::1;");
        assertEquals("RTRV", cmd.getVerb());
        assertEquals("", cmd.getModifier());
        assertEquals("RTRV", cmd.getCommandCode());
    }

    @Test
    void commandCodeWithModifier() throws TL1ParseException {
        TL1Command cmd = parser.parse("RTRV-ALM-ALL:::1;");
        assertEquals("RTRV", cmd.getVerb());
        assertEquals("ALM-ALL", cmd.getModifier());
        assertEquals("RTRV-ALM-ALL", cmd.getCommandCode());
    }
}
