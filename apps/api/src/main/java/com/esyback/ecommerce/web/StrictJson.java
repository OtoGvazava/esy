package com.esyback.ecommerce.web;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * The one JSON reader the stored-document validators (store design, display
 * settings) parse with. Trailing content is refused, so "{} junk" is an
 * error rather than {}. Jackson 3 already does that by default, but the HTTP
 * mapper ignores trailing content as Jackson 2 did (JacksonConfig), so the
 * rule is stated here rather than assumed.
 */
public final class StrictJson {

    public static final ObjectMapper MAPPER = JsonMapper.builder()
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
        .build();

    private StrictJson() {}
}
