package com.esyback.ecommerce.web;

import java.util.ArrayList;
import java.util.List;

/**
 * A small RFC 4180 reader, for the product import.
 *
 * <p>Hand-rolled rather than pulled in as a dependency, for the same reason
 * {@code SmsSender} reads one JSON field by hand: this is the whole of what the
 * format is used for here. What it does have to get right is the part people
 * trip over — a product description containing a comma. Splitting on commas
 * would silently shift every later column, so a price would be read from the
 * tail of a sentence and the row would fail validation for a reason that makes
 * no sense to whoever wrote the file.
 *
 * <p>Handles: quoted fields, commas and newlines inside quotes, {@code ""} as
 * an escaped quote, CRLF or LF line endings, a trailing newline, and a UTF-8
 * byte-order mark (which Excel writes, and which would otherwise become part of
 * the first header name).
 */
public final class Csv {

    private Csv() {}

    /**
     * Splits CSV text into rows of fields. Fully blank lines are dropped —
     * spreadsheets habitually leave one at the end, and an empty row is not an
     * attempt to create an empty product.
     */
    public static List<List<String>> parse(String text) {
        List<List<String>> rows = new ArrayList<>();
        if (text == null || text.isEmpty()) return rows;
        // Excel's UTF-8 export leads with a BOM; left in place it becomes part
        // of the first header, so "title" never matches.
        if (text.charAt(0) == '﻿') text = text.substring(1);

        char delimiter = delimiterOf(text);
        List<String> row = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (quoted) {
                if (c == '"') {
                    // A doubled quote is one literal quote; a lone one closes.
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        quoted = false;
                    }
                } else {
                    field.append(c);
                }
                continue;
            }
            if (c == delimiter) {
                row.add(field.toString());
                field.setLength(0);
                continue;
            }
            switch (c) {
                case '"' -> quoted = true;
                // CRLF ends a line at its \n; a lone CR (old Mac exports) ends
                // one itself — dropping it turned the whole file into one row.
                case '\r' -> {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '\n') break;
                    row.add(field.toString());
                    field.setLength(0);
                    addRow(rows, row);
                    row = new ArrayList<>();
                }
                case '\n' -> {
                    row.add(field.toString());
                    field.setLength(0);
                    addRow(rows, row);
                    row = new ArrayList<>();
                }
                default -> field.append(c);
            }
        }
        // Whatever is left after the last newline is the final row.
        row.add(field.toString());
        addRow(rows, row);
        return rows;
    }

    /**
     * The field separator, read from the header line: whichever of comma,
     * semicolon and tab occurs most there outside quotes (comma on a tie).
     * Excel saves "CSV" with semicolons wherever the decimal mark is a comma,
     * Georgian settings included, and those files were refused (review M27).
     */
    static char delimiterOf(String text) {
        int commas = 0, semicolons = 0, tabs = 0;
        boolean quoted = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '"') quoted = !quoted;
            else if (!quoted && (c == '\n' || c == '\r')) break;
            else if (!quoted && c == ',') commas++;
            else if (!quoted && c == ';') semicolons++;
            else if (!quoted && c == '\t') tabs++;
        }
        if (semicolons > commas && semicolons >= tabs) return ';';
        if (tabs > commas && tabs > semicolons) return '\t';
        return ',';
    }

    private static void addRow(List<List<String>> rows, List<String> row) {
        boolean allBlank = row.stream().allMatch(f -> f == null || f.isBlank());
        if (!allBlank) rows.add(List.copyOf(row));
    }

    /** One CSV line, quoting only where the format requires it. */
    public static String line(List<String> fields) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < fields.size(); i++) {
            if (i > 0) sb.append(',');
            String f = fields.get(i) == null ? "" : fields.get(i);
            if (f.indexOf(',') >= 0 || f.indexOf('"') >= 0 || f.indexOf('\n') >= 0 || f.indexOf('\r') >= 0) {
                sb.append('"').append(f.replace("\"", "\"\"")).append('"');
            } else {
                sb.append(f);
            }
        }
        return sb.toString();
    }
}
