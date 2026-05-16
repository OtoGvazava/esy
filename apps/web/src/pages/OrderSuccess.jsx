import { useLocation, useNavigate } from "react-router-dom";
import { useGlow } from "../styles/glow";
import { Icon } from "../components/glow/GlowPrimitives";
import { GlowScreen, money } from "../components/glow/GlowChrome";

export default function OrderSuccess() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { state } = useLocation();
  const total = state?.total;
  const count = state?.count ?? 0;
  const shortId = (state?.orderId || `ESY-${Date.now()}`).toString().slice(-8).toUpperCase();

  return (
    <GlowScreen T={T} padBottom={170}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* hero */}
        <div style={{ position: "relative", padding: "60px 24px 36px", textAlign: "center" }}>
          <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", width: 320, height: 220, background: `radial-gradient(60% 80% at 50% 50%, ${T.accent}55, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />
          <div style={{ position: "relative", width: 84, height: 84, borderRadius: "50%", background: T.grad, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", boxShadow: `0 20px 40px ${T.accent}60` }}>
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
          </div>
          <div style={{ position: "relative", font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: "-0.03em", marginBottom: 10 }}>Order placed!</div>
          <div style={{ position: "relative", font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 300, margin: "0 auto" }}>
            Thank you. We’ve emailed your confirmation and {tenant.name} is preparing your order.
          </div>
        </div>

        {/* order id chip */}
        <div style={{ padding: "0 24px 16px", display: "flex", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 999, background: T.surface, border: `1px solid ${T.border}` }}>
            <span style={{ font: `500 11px ${T.font}`, color: T.textMute, letterSpacing: "0.08em", textTransform: "uppercase" }}>Order</span>
            <span style={{ font: `700 13px ${T.mono}`, color: T.text }}>#{shortId}</span>
            <span style={{ width: 1, height: 12, background: T.border }} />
            <span onClick={() => navigator.clipboard?.writeText(shortId)} style={{ font: `600 12px ${T.font}`, color: T.accentFg, cursor: "pointer" }}>Copy</span>
          </div>
        </div>

        {/* tracker */}
        <div style={{ padding: "8px 16px 14px" }}>
          <div style={{ padding: "16px 14px", borderRadius: 16, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={{ font: `600 11.5px ${T.font}`, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Estimated · in 3–5 days</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              {["Placed", "Packed", "Shipped", "Delivered"].map((s, i) => (
                <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 3 ? 1 : "0 0 auto" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: i === 0 ? T.accent : (T.dark ? "#26263a" : "#e8e8f0"), boxShadow: i === 0 ? `0 0 0 4px ${T.accent}30` : "none" }} />
                    <span style={{ font: `${i === 0 ? 700 : 500} 10.5px ${T.font}`, color: i === 0 ? T.text : T.textMute, letterSpacing: "0.04em" }}>{s}</span>
                  </div>
                  {i < 3 && <span style={{ flex: 1, height: 2, background: T.border, margin: "0 4px", marginBottom: 18 }} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* mini summary */}
        {(count > 0 || total != null) && (
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ padding: 14, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: T.accentBg, color: T.accentFg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon.bag /></span>
              <div style={{ flex: 1 }}>
                <div style={{ font: `600 13px ${T.font}`, color: T.text }}>{count} item{count === 1 ? "" : "s"}{total != null ? ` · ${money(total)}` : ""}</div>
                <div style={{ font: `400 11.5px ${T.font}`, color: T.textMute }}>Ships from {tenant.location.split(" · ")[0]}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 92, padding: "14px 16px", background: T.bg, borderTop: `1px solid ${T.border}`, zIndex: 1100 }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", gap: 10 }}>
          <button onClick={() => navigate("/orders")} style={{ flex: 1, height: 50, borderRadius: 14, border: `1px solid ${T.border}`, background: T.surface, color: T.text, font: `600 13.5px ${T.font}`, cursor: "pointer" }}>View orders</button>
          <button onClick={() => navigate("/")} style={{ flex: 1.4, height: 50, borderRadius: 14, border: "none", background: T.grad, color: "#fff", font: `700 13.5px ${T.font}`, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 10px 28px ${T.accent}55` }}>Keep shopping <Icon.arrowR /></button>
        </div>
      </div>
    </GlowScreen>
  );
}
