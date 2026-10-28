package com.esyback.ecommerce.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The CSV reader behind the product import.
 *
 * <p>Nearly every one of these is a file a real merchant would produce from
 * Excel or Google Sheets, and nearly every one breaks a naive split on commas.
 * Getting it wrong does not fail loudly: the columns shift, a price is read out
 * of the middle of a sentence, and the row is rejected for a reason that looks
 * nothing like the mistake.
 */
class CsvTest {

    @Test
    @DisplayName("a plain file parses into rows and fields")
    void plain() {
        List<List<String>> rows = Csv.parse("title,price\nMug,24\nPlate,30\n");
        assertEquals(3, rows.size());
        assertEquals(List.of("title", "price"), rows.get(0));
        assertEquals(List.of("Mug", "24"), rows.get(1));
        assertEquals(List.of("Plate", "30"), rows.get(2));
    }

    @Test
    @DisplayName("a comma inside a quoted description does not become a column")
    void commaInsideQuotes() {
        // The failure this exists for: without quote handling this row has
        // four fields and the price is read as "hand-thrown".
        List<List<String>> rows = Csv.parse("title,description,price\nMug,\"Small, hand-thrown\",24\n");
        assertEquals(List.of("Mug", "Small, hand-thrown", "24"), rows.get(1));
    }

    @Test
    @DisplayName("a doubled quote is one literal quote")
    void escapedQuote() {
        List<List<String>> rows = Csv.parse("title\n\"The \"\"big\"\" one\"\n");
        assertEquals(List.of("The \"big\" one"), rows.get(1));
    }

    @Test
    @DisplayName("a newline inside quotes stays inside the field")
    void newlineInsideQuotes() {
        List<List<String>> rows = Csv.parse("title,description\nMug,\"line one\nline two\"\n");
        assertEquals(2, rows.size());
        assertEquals("line one\nline two", rows.get(1).get(1));
    }

    @Test
    @DisplayName("CRLF, a missing trailing newline and blank lines are all survivable")
    void lineEndings() {
        assertEquals(2, Csv.parse("title,price\r\nMug,24\r\n").size());
        // No trailing newline at all.
        assertEquals(2, Csv.parse("title,price\nMug,24").size());
        // Spreadsheets love leaving these behind; an empty row is not a product.
        assertEquals(2, Csv.parse("title,price\nMug,24\n\n\n").size());
        assertEquals(2, Csv.parse("title,price\nMug,24\n,,\n").size());
    }

    @Test
    @DisplayName("Excel's byte-order mark does not end up glued to the first header")
    void stripsBom() {
        List<List<String>> rows = Csv.parse("﻿title,price\nMug,24\n");
        assertEquals("title", rows.get(0).get(0));
        assertTrue(rows.get(0).get(0).length() == 5);
    }

    @Test
    @DisplayName("an empty field stays empty rather than vanishing")
    void emptyFields() {
        assertEquals(List.of("Mug", "", "24"), Csv.parse("title,description,price\nMug,,24\n").get(1));
    }

    @Test
    @DisplayName("nothing in, nothing out")
    void empties() {
        assertTrue(Csv.parse(null).isEmpty());
        assertTrue(Csv.parse("").isEmpty());
        assertTrue(Csv.parse("\n\n").isEmpty());
    }

    @Test
    @DisplayName("writing a line quotes exactly what has to be quoted")
    void writesLines() {
        assertEquals("Mug,24", Csv.line(List.of("Mug", "24")));
        assertEquals("\"Small, hand-thrown\"", Csv.line(List.of("Small, hand-thrown")));
        assertEquals("\"The \"\"big\"\" one\"", Csv.line(List.of("The \"big\" one")));
        // And what it writes, it can read back.
        String round = Csv.line(List.of("Small, \"hand-thrown\"\nreally"));
        assertEquals("Small, \"hand-thrown\"\nreally", Csv.parse(round).get(0).get(0));
    }
}
