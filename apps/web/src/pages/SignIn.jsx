import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGlow } from "../styles/glow";
import { Icon } from "../components/glow/GlowPrimitives";
import { GlowScreen } from "../components/glow/GlowChrome";

// Original generic glyphs (not official Google/Apple marks) — matches the
// handoff's note: function is clear, artwork stays original.
const GmailGlyph = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
const ICloudGlyph = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 9.1 3.5 3.5 0 0 1 17 18H7Z" /></svg>
);

function SsoButton({ T, label, glyph, glyphBg, glyphFg, onClick, busy }) {
  return (
    <button onClick={onClick} disabled={busy} style={{
      width: "100%", height: 56, borderRadius: 14, border: `1px solid ${T.borderStr}`,
      background: T.surface, color: T.text, display: "flex", alignItems: "center", gap: 12,
      padding: "0 18px", font: `600 14.5px ${T.font}`, letterSpacing: "-0.01em",
      cursor: busy ? "default" : "pointer",
    }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: glyphBg, color: glyphFg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{glyph}</span>
      <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
      <Icon.arrowR style={{ opacity: 0.35 }} />
    </button>
  );
}

export default function SignIn() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithApple } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");

  // Real Google OAuth2: full-page redirect to the backend's authorization
  // endpoint. Same origin in prod (Render serves the SPA); in Vite dev (:5173)
  // hit the backend directly on :8080.
  const googleSignIn = () => {
    const base = window.location.port === "5173" ? "http://localhost:8080" : "";
    // tenant_origin: the backend funnels OAuth through one canonical host
    // (Google redirect URIs can't be wildcards), then returns the JWT to the
    // store the user actually started on.
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${base}/oauth2/authorization/google?tenant_origin=${origin}`;
  };

  // iCloud stays a dev stand-in (Apple OAuth not configured).
  const sso = async (which) => {
    setBusy(which);
    const res = which === "gmail" ? await loginWithGoogle() : await loginWithApple();
    setBusy("");
    if (res?.success) navigate("/account");
  };

  const continueEmail = () => {
    const e = email.trim();
    if (!e) return;
    navigate("/signin/verify", { state: { email: e } });
  };

  return (
    <GlowScreen T={T} padBottom={40}>
      <div style={{ position: "absolute", top: -160, left: -80, right: -80, height: 360, background: `radial-gradient(60% 80% at 50% 30%, ${T.accent}48, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 460, margin: "0 auto", position: "relative" }}>
        <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} aria-label="close" style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon.close /></button>
        </div>

        <div style={{ padding: "24px 24px", textAlign: "center" }}>
          <div style={{ width: 62, height: 62, borderRadius: 18, background: T.grad, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", font: `800 30px ${T.font}`, letterSpacing: "-0.04em", boxShadow: `0 16px 36px ${T.accent}55` }}>e</div>
          <div style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: "-0.03em", marginBottom: 8 }}>
            Sign in <span style={{ color: T.textDim, fontWeight: 600 }}>· {tenant.name}</span>
          </div>
          <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 300, margin: "0 auto" }}>
            One account, every shop on esy.
          </div>
        </div>

        <div style={{ padding: "8px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <SsoButton T={T} label={busy === "gmail" ? "Signing in…" : "Continue with Gmail"} glyph={GmailGlyph} glyphBg={T.dark ? "rgba(255,255,255,0.06)" : "#ffffff"} glyphFg={T.dark ? "#cfd0d8" : "#5a5a66"} onClick={googleSignIn} busy={!!busy} />
          {/* TEMP: iCloud sign-in hidden until a paid Apple Developer account is set up.
              To restore, uncomment the line below.
          <SsoButton T={T} label={busy === "icloud" ? "Signing in…" : "Continue with iCloud"} glyph={ICloudGlyph} glyphBg={T.dark ? "#f2f2f7" : "#0b0b14"} glyphFg={T.dark ? "#0b0b14" : "#ffffff"} onClick={() => sso("icloud")} busy={!!busy} /> */}
        </div>

        <div style={{ padding: "22px 24px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ font: `500 11px ${T.font}`, color: T.textMute, letterSpacing: "0.12em", textTransform: "uppercase" }}>or with email</span>
          <span style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        <div style={{ padding: "0 20px 12px" }}>
          <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Email address</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 16px", borderRadius: 14, background: T.surface, border: `1.5px solid ${email ? T.accent : T.border}`, boxShadow: email ? `0 0 0 4px ${T.accent}1a` : "none" }}>
            <Icon.mail />
            <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && continueEmail()} placeholder="you@example.com  (admin@… for admin)" style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: T.text, font: `500 14px ${T.font}` }} />
          </div>
        </div>

        <div style={{ padding: "6px 20px 16px" }}>
          <button onClick={continueEmail} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: T.grad, color: "#fff", font: `700 14.5px ${T.font}`, letterSpacing: "-0.01em", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 10px 28px ${T.accent}55` }}>
            Continue with email <Icon.arrowR />
          </button>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, font: `500 12px ${T.font}`, color: T.textDim }}>
            <span>New to {tenant.name}?</span>
            <span onClick={continueEmail} style={{ color: T.accentFg, fontWeight: 700, cursor: "pointer" }}>Create one</span>
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, font: `500 12px ${T.font}`, color: T.textDim }}>
            <span>Want to sell on esy?</span>
            <span onClick={() => navigate("/create-store")} style={{ color: T.accentFg, fontWeight: 700, cursor: "pointer" }}>Open your store</span>
          </div>
        </div>

        <div style={{ padding: "0 24px 28px" }}>
          <div style={{ padding: "12px 14px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: T.accentBg, color: T.accentFg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </span>
            <div style={{ flex: 1, font: `500 11.5px/1.45 ${T.font}`, color: T.textDim }}>
              Encrypted end-to-end. <span style={{ color: T.text }}>esy</span> never sees your provider password.
            </div>
          </div>
          <div style={{ marginTop: 10, font: `400 10.5px ${T.font}`, color: T.textMute, textAlign: "center" }}>
            By continuing you agree to esy's <u>Terms</u> &amp; <u>Privacy Policy</u>
          </div>
        </div>
      </div>
    </GlowScreen>
  );
}
