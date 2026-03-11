package com.tl1;

import com.tl1.model.TL1Command;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TL1CommandTest {

    @Test
    void toTL1String_noParams() {
        TL1Command cmd = new TL1Command("RTRV", "HDR", "", "", "1", null);
        assertEquals("RTRV-HDR:::1;", cmd.toTL1String());
    }

    @Test
    void toTL1String_withTidAndAid() {
        TL1Command cmd = new TL1Command("RTRV", "T1", "NE1", "FAC-1-1", "5", null);
        assertEquals("RTRV-T1:NE1:FAC-1-1:5;", cmd.toTL1String());
    }

    @Test
    void toTL1String_withParameters() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("LINECDE", "B8ZS");
        params.put("FMT", "ESF");
        TL1Command cmd = new TL1Command("ENT", "T1", "NE1", "FAC-1-2", "3", params);
        assertEquals("ENT-T1:NE1:FAC-1-2:3::LINECDE=B8ZS,FMT=ESF;", cmd.toTL1String());
    }

    @Test
    void toTL1String_noModifier() {
        TL1Command cmd = new TL1Command("RTRV", "", "", "", "7", null);
        assertEquals("RTRV:::7;", cmd.toTL1String());
    }

    @Test
    void verbIsUppercased() {
        TL1Command cmd = new TL1Command("rtrv", "hdR", "", "", "1", null);
        assertEquals("RTRV", cmd.getVerb());
        assertEquals("HDR", cmd.getModifier());
    }

    @Test
    void getCommandCode_withModifier() {
        TL1Command cmd = new TL1Command("RTRV", "ALM-ALL", "", "", "1", null);
        assertEquals("RTRV-ALM-ALL", cmd.getCommandCode());
    }

    @Test
    void getCommandCode_withoutModifier() {
        TL1Command cmd = new TL1Command("RTRV", "", "", "", "1", null);
        assertEquals("RTRV", cmd.getCommandCode());
    }

    @Test
    void nextCtagIsIncrementing() {
        String c1 = TL1Command.nextCtag();
        String c2 = TL1Command.nextCtag();
        int n1 = Integer.parseInt(c1);
        int n2 = Integer.parseInt(c2);
        assertEquals(n1 + 1, n2);
    }

    @Test
    void nullCtag_autoAssigned() {
        TL1Command cmd = new TL1Command("RTRV", "HDR", "", "", null, null);
        assertNotNull(cmd.getCtag());
        assertFalse(cmd.getCtag().isEmpty());
    }
}
