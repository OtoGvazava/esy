package com.esyback.ecommerce.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.cfg.EnumFeature;
import tools.jackson.databind.cfg.JsonNodeFeature;

/**
 * The API's JSON wire format, stated feature by feature.
 *
 * <p>The web app was built against Jackson 2's output. Spring Boot 4 serves
 * JSON with Jackson 3, whose defaults differ; this sets back every feature
 * where they differ, so the wire format does not depend on Boot's transitional
 * {@code spring.jackson.use-jackson2-defaults} switch. The list is exactly what
 * that switch applied in Boot 4.1 ({@code MapperBuilder.configureForJackson2()}
 * less what Boot then turned back off), and JsonContractTest pins the parts the
 * web app reads.
 *
 * <p>It runs before Boot's own customizer (order 0), so a
 * {@code spring.jackson.*} property still has the last word.
 */
@Configuration
public class JacksonConfig {

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    JsonMapperBuilderCustomizer jackson2WireFormat() {
        return builder -> builder
            // Properties in declaration order, not alphabetical. Parameter
            // names stay out of property discovery: with them a constructor
            // parameter that shares a property's name is moved to the front
            // (PagedResponse(Page page) put "page" before "content").
            .disable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .disable(MapperFeature.DETECT_PARAMETER_NAMES)
            // Jackson 2's property naming and binding rules.
            .disable(MapperFeature.FIX_FIELD_NAME_UPPER_CASE_PREFIX)
            .enable(MapperFeature.ALLOW_FINAL_FIELDS_AS_MUTATORS)
            .enable(MapperFeature.USE_GETTERS_AS_SETTERS)
            // Lenient request bodies: content after the JSON value is ignored
            // and null for a primitive is its default. Unknown properties are
            // already ignored by Jackson 3. Validators that must refuse
            // trailing content parse with StrictJson.
            .disable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            // Enums by name(), never toString().
            .disable(EnumFeature.WRITE_ENUMS_USING_TO_STRING)
            .disable(EnumFeature.READ_ENUMS_USING_TO_STRING)
            // Dates stay ISO-8601 strings (Jackson 3's default); these two
            // are Jackson 2's rules for UTC offsets and java.util month numbers.
            .enable(DateTimeFeature.WRITE_UTC_AS_OFFSET)
            .disable(DateTimeFeature.ONE_BASED_MONTHS)
            // JsonNode decimals and empty beans as Jackson 2 had them.
            .enable(JsonNodeFeature.STRIP_TRAILING_BIGDECIMAL_ZEROES)
            .enable(SerializationFeature.FAIL_ON_EMPTY_BEANS);
    }
}
