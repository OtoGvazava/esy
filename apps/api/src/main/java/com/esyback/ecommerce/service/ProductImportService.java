package com.esyback.ecommerce.service;

import com.esyback.ecommerce.entity.Product;
import com.esyback.ecommerce.entity.Tenant;
import com.esyback.ecommerce.repository.ProductRepository;
import com.esyback.ecommerce.web.Csv;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bulk product creation from a CSV file (decision D7).
 *
 * <p><b>All or nothing.</b> The whole file is validated before a single row is
 * written, and one bad row rejects the upload. The alternative — import what
 * parses, report the rest — sounds friendlier and is worse here: there is no
 * bulk delete and no undo, so a merchant who uploads two hundred rows and gets
 * a hundred and eighty would be left reconciling a half-built catalogue by
 * hand, against a file they can no longer trust. Rejecting the file costs them
 * one edit and a retry.
 *
 * <p><b>A header row is required.</b> It makes column order irrelevant and the
 * file self-describing, which matters because the person editing it is working
 * in a spreadsheet, not reading this class.
 *
 * <p>Images are deliberately not importable. They are uploaded files managed by
 * {@link ProductImageService}, which sets and repoints the thumbnail; a URL in
 * a spreadsheet cell is not one of those, and accepting it would mean products
 * whose pictures live on someone else's server.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductImportService {

    /**
     * A ceiling on one upload. Not a database limit — a blast-radius limit: an
     * accidental paste of the wrong sheet should be refused rather than create
     * thousands of products that then have to be deleted one at a time.
     */
    public static final int MAX_ROWS = 500;

    private static final String TITLE = "title";
    private static final String DESCRIPTION = "description";
    private static final String PRICE = "price";
    private static final String QUANTITY = "quantity";

    /** Order is the template's column order. */
    public static final List<String> COLUMNS = List.of(TITLE, DESCRIPTION, PRICE, QUANTITY);
    private static final List<String> REQUIRED = List.of(TITLE, PRICE, QUANTITY);

    private final ProductRepository productRepository;
    private final TenantContextService tenantContextService;

    /** One problem, named with the file line a spreadsheet would show. */
    public record RowError(int line, String message) {}

    /**
     * What the upload would do, or did.
     *
     * @param parsed how many product rows the file contained
     * @param imported how many were written (0 on a dry run or a rejection)
     * @param errors every problem found, not just the first — a merchant
     *               fixing a file wants the whole list in one pass
     */
    public record Report(int parsed, int imported, boolean dryRun, List<RowError> errors) {
        public boolean ok() {
            return errors.isEmpty();
        }
    }

    /** The file to hand someone who asks what the columns are. */
    public static String template() {
        return Csv.line(COLUMNS) + "\n"
            + Csv.line(List.of("Ceramic mug", "Small, hand-thrown", "24.00", "12")) + "\n"
            + Csv.line(List.of("Linen apron", "", "48.50", "4")) + "\n";
    }

    /**
     * Validates, and writes only if everything is valid.
     *
     * @param dryRun true to report what would happen without writing, so the
     *               screen can show the outcome before anything is created
     */
    @Transactional
    public Report importCsv(String csv, boolean dryRun) {
        Tenant tenant = tenantContextService.getCurrentTenant();
        if (tenant == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No store in context");
        }

        List<List<String>> rows = Csv.parse(csv);
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "That file is empty. The first line must name the columns: " + String.join(", ", COLUMNS));
        }

        Map<String, Integer> columns = headerIndex(rows.get(0));
        for (String required : REQUIRED) {
            if (!columns.containsKey(required)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The file has no \"" + required + "\" column. Expected columns: "
                        + String.join(", ", COLUMNS));
            }
        }

        List<List<String>> body = rows.subList(1, rows.size());
        if (body.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "That file has a header row and no products.");
        }
        if (body.size() > MAX_ROWS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "That file has " + body.size() + " rows; " + MAX_ROWS + " is the most in one upload.");
        }

        List<RowError> errors = new ArrayList<>();
        List<Product> staged = new ArrayList<>();

        for (int i = 0; i < body.size(); i++) {
            // +2: the header is line 1, and a spreadsheet counts from 1. The
            // number in the message has to match the row the person is looking
            // at, or the report is worse than no report.
            int line = i + 2;
            List<String> row = body.get(i);
            int errorsBefore = errors.size();

            String title = cell(row, columns, TITLE);
            if (title.isBlank()) {
                errors.add(new RowError(line, "title is required"));
            } else if (title.length() > 255) {
                errors.add(new RowError(line, "title is longer than 255 characters"));
            }

            BigDecimal price = null;
            String rawPrice = cell(row, columns, PRICE);
            if (rawPrice.isBlank()) {
                errors.add(new RowError(line, "price is required"));
            } else {
                try {
                    // Spreadsheets in Georgia and much of Europe write 24,50.
                    // Rejecting that would be technically defensible and
                    // useless; the comma cannot be a separator here because the
                    // field was already split.
                    BigDecimal parsed = new BigDecimal(rawPrice.replace(",", ".").replace(" ", ""));
                    if (parsed.signum() <= 0) {
                        errors.add(new RowError(line, "price must be greater than 0"));
                    } else if (parsed.stripTrailingZeros().scale() > 2) {
                        // Only real precision counts: the column holds two
                        // decimals, so 24.999 would be rounded to something the
                        // merchant did not type and would never see. 24.500 is
                        // the same number as 24.50 and is left alone.
                        errors.add(new RowError(line,
                            "price \"" + rawPrice + "\" has more than 2 decimal places"));
                    } else {
                        price = parsed.setScale(2, java.math.RoundingMode.UNNECESSARY);
                    }
                } catch (NumberFormatException e) {
                    errors.add(new RowError(line, "price \"" + rawPrice + "\" is not a number"));
                }
            }

            Integer quantity = null;
            String rawQty = cell(row, columns, QUANTITY);
            if (rawQty.isBlank()) {
                errors.add(new RowError(line, "quantity is required"));
            } else {
                try {
                    quantity = Integer.valueOf(rawQty.trim());
                    if (quantity < 0) {
                        errors.add(new RowError(line, "quantity cannot be negative"));
                    }
                } catch (NumberFormatException e) {
                    errors.add(new RowError(line, "quantity \"" + rawQty + "\" is not a whole number"));
                }
            }

            // THIS row's validity, not the file's. Staging is skipped when an
            // earlier row failed too, since nothing is written either way — but
            // tying it to the file's error list would make the loop's behaviour
            // depend on rows it has already passed.
            if (errors.size() == errorsBefore) {
                Product p = new Product();
                p.setTitle(title);
                String description = cell(row, columns, DESCRIPTION);
                p.setDescription(description.isBlank() ? null : description);
                p.setPrice(price);
                p.setQuantity(quantity);
                p.setTenant(tenant);
                staged.add(p);
            }
        }

        if (!errors.isEmpty()) {
            // Nothing was written. Reported as a 200 with the problems rather
            // than an error status: the upload was understood, it is the file
            // that needs work, and the screen has a list to render.
            return new Report(body.size(), 0, dryRun, List.copyOf(errors));
        }
        if (dryRun) {
            return new Report(body.size(), 0, true, List.of());
        }

        productRepository.saveAll(staged);
        log.info("Imported {} products into store {}", staged.size(), tenant.getSubdomain());
        return new Report(body.size(), staged.size(), false, List.of());
    }

    /** Header names, lower-cased and trimmed, mapped to their position. */
    private static Map<String, Integer> headerIndex(List<String> header) {
        Map<String, Integer> index = new LinkedHashMap<>();
        for (int i = 0; i < header.size(); i++) {
            String name = header.get(i) == null ? "" : header.get(i).trim().toLowerCase();
            if (!name.isEmpty()) index.putIfAbsent(name, i);
        }
        return index;
    }

    /** A cell by column name, trimmed; "" when the row is short. */
    private static String cell(List<String> row, Map<String, Integer> columns, String name) {
        Integer at = columns.get(name);
        if (at == null || at >= row.size()) return "";
        String v = row.get(at);
        return v == null ? "" : v.trim();
    }
}
