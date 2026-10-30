package com.esyback.ecommerce.security;

import com.esyback.ecommerce.entity.User;
import com.esyback.ecommerce.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;

/**
 * A verified phone is required to register: until an account has one, it can
 * read but not write.
 *
 * <p>The web shows a blocking gate, but a gate in the browser is a suggestion;
 * this is the rule. It sits after {@link JwtAuthenticationFilter} and refuses
 * every state-changing {@code /api} request from a signed-in account without a
 * verified phone with {@code 403 PHONE_REQUIRED} — except the endpoints the gate
 * itself needs (sign-in, sign-out, profile, phone) and the bank's callback,
 * which carries no session.
 *
 * <p>Reads stay open on purpose. The storefront is public anyway, and refusing
 * GETs would break the very screen that asks for the phone. The order and
 * payment checks in their controllers remain as a second line.
 *
 * <p>Not a {@code @Component}: Spring Boot registers every Filter bean in the
 * servlet chain as well, and this one must only ever run inside the security
 * chain, after authentication has been resolved. {@code SecurityConfig} builds
 * it.
 */
public class PhoneRequiredFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

    private final UserRepository users;

    public PhoneRequiredFilter(UserRepository users) {
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (mustVerifyFirst(request)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            String reason = "Verify your phone number to continue";
            response.getWriter().write("{\"error\":\"" + reason + "\",\"message\":\"" + reason
                + "\",\"status\":403,\"code\":\"PHONE_REQUIRED\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean mustVerifyFirst(HttpServletRequest request) {
        if (SAFE_METHODS.contains(request.getMethod())) return false;
        String path = request.getRequestURI();
        if (!path.startsWith("/api/") || isExempt(path)) return false;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return false; // anonymous writes are the controllers' business
        }
        Optional<User> user = users.findByUsername(auth.getName());
        return user.isPresent() && !Boolean.TRUE.equals(user.get().getPhoneVerified());
    }

    static boolean isExempt(String path) {
        return path.startsWith("/api/auth/")
            || path.equals("/api/account") || path.startsWith("/api/account/")
            || path.equals("/api/payments/bog/callback");
    }
}
