import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGlow } from "../styles/glow";
import { Icon } from "../components/glow/GlowPrimitives";
import { GlowScreen } from "../components/glow/GlowChrome";

export default function SignInVerify() {
  const { T } = useGlow();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { loginDev } = useAuth();
  const email = state?.email;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!email) navigate("/signin", { replace: true }); }, [email, navigate]);
  if (!email) return null;

  // Dev magic-link stand-in: the backend has no real OTP, so Verify completes
  // the sign-in via dev-login for the entered email (any code accepted).
  const verify = async () => {
    setBusy(true);
    const res = await loginDev(email);
    setBusy(false);
    if (res?.success) navigate("/account", { replace: true });
  };

  const boxes = Array.from({ length: 6 }, (_, i) => code[i] || "");

  return (
    <GlowScreen T={T} padBottom={40}>
      <div style={{ position: "absolute", top: -160, left: -80, right: -80, height: 360, background: `radial-gradient(60% 80% at 50% 30%, ${T.accent}48, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 460, margin: "0 auto", position: "relative" }}>
        <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => navigate(-1)} aria-label="back" style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon.arrowR style={{ transform: "rotate(180deg)" }} /></button>
          <span style={{ font: `500 11px ${T.font}`, color: T.textMute, letterSpacing: "0.08em", textTransform: "uppercase" }}>Step 2 / 2</span>
          <span style={{ width: 38 }} />
        </div>

        <div style={{ padding: "30px 24px 22px", textAlign: "center" }}>
          <div style={{ width: 62, height: 62, borderRadius: 18, background: T.accentBg, color: T.accentFg, display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}><Icon.mail width="26" height="26" /></div>
          <div style={{ font: `700 24px/1.2 ${T.font}`, color: T.text, letterSpacing: "-0.03em", marginBottom: 10 }}>Check your inbox</div>
          <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 300, margin: "0 auto" }}>
            We sent a 6-digit code to <span style={{ color: T.text, fontWeight: 600 }}>{email}</span>. Enter it (any code works in this demo).
          </div>
        </div>

        <div style={{ position: "relative", padding: "6px 24px 14px" }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {boxes.map((d, i) => {
              const focused = i === Math.min(code.length, 5);
              return (
                <div key={i} style={{ width: 44, height: 56, borderRadius: 12, border: `1.5px solid ${focused ? T.accent : T.border}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", font: `700 22px ${T.font}`, color: T.text, boxShadow: focused ? `0 0 0 4px ${T.accent}1a` : "none" }}>{d}</div>
              );
            })}
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            aria-label="verification code"
            autoFocus
            style={{ position: "absolute", inset: "6px 24px 14px", width: "calc(100% - 48px)", opacity: 0, cursor: "pointer" }}
          />
        </div>
        <div style={{ padding: "4px 24px 18px", textAlign: "center", font: `500 12px ${T.font}`, color: T.textDim }}>
          Didn't get it? <span style={{ color: T.accentFg, fontWeight: 700 }}>Resend</span>
        </div>

        <div style={{ padding: "4px 20px 16px" }}>
          <button onClick={verify} disabled={busy} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: T.grad, color: "#fff", font: `700 14.5px ${T.font}`, cursor: busy ? "default" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 10px 28px ${T.accent}55`, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Verifying…" : "Verify"} <Icon.arrowR />
          </button>
        </div>
      </div>
    </GlowScreen>
  );
}
