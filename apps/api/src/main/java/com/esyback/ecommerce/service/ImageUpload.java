package com.esyback.ecommerce.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Set;

/**
 * Single source of truth for "is this upload a safe image, and what is it?".
 * Shared by every image-accepting endpoint (product gallery, store logo) so
 * the validation — size cap + magic-byte sniffing — can't drift between them.
 * Pure/stateless; the content type is decided by the sniffed signature, not
 * the client-sent header.
 */
public final class ImageUpload {

    private ImageUpload() {}

    private static final Set<String> ALLOWED = Set.of(
        "image/jpeg", "image/png", "image/webp", "image/gif");

    // Defense-in-depth alongside spring.servlet.multipart.max-file-size.
    public static final long MAX_BYTES = 5L * 1024 * 1024;

    public static byte[] read(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Empty file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image exceeds 5MB");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read file");
        }
    }

    // Trust the sniffed signature over the client-sent content type.
    public static String resolveType(MultipartFile file, byte[] bytes) {
        String sniffed = sniff(bytes);
        if (sniffed != null) return sniffed;
        String declared = file.getContentType();
        if (declared != null && ALLOWED.contains(declared.toLowerCase())) {
            return declared.toLowerCase();
        }
        throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            "Only JPEG, PNG, WEBP or GIF images are allowed");
    }

    private static String sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "image/png";
        }
        if (b.length >= 4 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') {
            return "image/gif";
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
            && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        return null;
    }
}
