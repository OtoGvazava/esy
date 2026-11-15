package com.esyback.ecommerce.security;

import com.esyback.ecommerce.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final UrlPathHelper PATHS = new UrlPathHelper();

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    /**
     * Only the API and the (admin-only) API reference read who is signed in.
     * The SPA's pages, scripts and images do not, and each used to cost a
     * database query and three signature checks. The decoded path, as MVC
     * routes on, so an encoded "/%61pi/" is still an API request; skipping one
     * would anyway only make it anonymous, never more privileged.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !needsIdentity(PATHS.getPathWithinApplication(request));
    }

    static boolean needsIdentity(String path) {
        return path.startsWith("/api/")
            || path.equals("/docs") || path.equals("/swagger")
            || path.startsWith("/v3/api-docs");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        final String authorizationHeader = request.getHeader("Authorization");
        String jwt;
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
        } else {
            // Browser SPA: the session rides in the HttpOnly esy_token cookie
            // (shared across esy.ge + every *.esy.ge store). The Bearer header
            // still works for non-browser/test clients.
            jwt = AuthCookie.read(request);
        }

        // One signature check, which also refuses an expired token.
        String username = jwt == null ? null : jwtUtil.verifiedSubject(jwt);
        if (jwt != null && username == null) {
            logger.debug("JWT token is invalid or expired");
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                // A deactivated account keeps no access, whatever its cookie
                // says: it proceeds as anonymous.
                if (userDetails.isEnabled() && userDetails.isAccountNonLocked()
                        && username.equals(userDetails.getUsername())) {
                    UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (UsernameNotFoundException e) {
                // Orphaned cookie: a validly-signed JWT whose user is no longer
                // in the DB (account deleted, or — common on Render free — the
                // in-memory H2 reset on redeploy). Without this catch the
                // exception is uncaught and EVERY request carrying the stale
                // cookie 500s the whole page (incl. the SPA navigation), locking
                // out every logged-in user after a deploy. Degrade to anonymous
                // instead; the browser just sees a logged-out state.
                logger.warn("JWT references a user not in the DB; proceeding anonymous: " + username);
            }
        }

        filterChain.doFilter(request, response);
    }
}
