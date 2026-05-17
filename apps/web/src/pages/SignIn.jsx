import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGlow } from "../styles/glow";
import { Icon } from "../components/glow/GlowPrimitives";
import { GlowScreen } from "../components/glow/GlowChrome";

const GmailGlyph = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);

export default function SignIn() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();

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
            One esy account for buying and selling.
          </div>
        </div>

        <div style={{ padding: "8px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={signInWithGoogle} style={{
            width: "100%", height: 56, borderRadius: 14, border: `1px solid ${T.borderStr}`,
            background: T.surface, color: T.text, display: "flex", alignItems: "center", gap: 12,
            padding: "0 18px", font: `600 14.5px ${T.font}`, letterSpacing: "-0.01em", cursor: "pointer",
          }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: T.dark ? "rgba(255,255,255,0.06)" : "#ffffff", color: T.dark ? "#cfd0d8" : "#5a5a66", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{GmailGlyph}</span>
            <span style={{ flex: 1, textAlign: "left" }}>Continue with Gmail</span>
            <Icon.arrowR style={{ opacity: 0.35 }} />
          </button>
        </div>

        <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, font: `500 12px ${T.font}`, color: T.textDim }}>
          <span>Want to sell on esy?</span>
          <span onClick={() => navigate("/create-store")} style={{ color: T.accentFg, fontWeight: 700, cursor: "pointer" }}>Open your store</span>
        </div>

        <div style={{ padding: "20px 24px 28px" }}>
          <div style={{ padding: "12px 14px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: T.accentBg, color: T.accentFg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </span>
            <div style={{ flex: 1, font: `500 11.5px/1.45 ${T.font}`, color: T.textDim }}>
              Encrypted end-to-end. <span style={{ color: T.text }}>esy</span> never sees your Google password.
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
