import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGlow } from "../styles/glow";
import { Icon } from "../components/glow/GlowPrimitives";
import { GlowScreen } from "../components/glow/GlowChrome";
import { tenantApi, handleApiError } from "../utils/api";

// Self-serve store signup. The backend resolves tenants by Host header, so a
// created store is live the moment the row exists (on the deployed wildcard
// domain; locally reachable via ?tenant=<subdomain>).
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

export default function CreateStore() {
  const { T } = useGlow();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [touchedSub, setTouchedSub] = useState(false);
  const [accent, setAccent] = useState("#6366f1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(null);

  const sub = touchedSub ? subdomain : slugify(name);

  const submit = async () => {
    setError("");
    if (!name.trim()) return setError("Store name is required");
    if (sub.length < 3) return setError("Subdomain must be at least 3 characters");
    setBusy(true);
    try {
      const t = await tenantApi.create({
        name: name.trim(),
        subdomain: sub,
        primaryColor: accent,
      });
      setCreated(t);
    } catch (e) {
      setError(handleApiError(e, "Could not create the store"));
    } finally {
      setBusy(false);
    }
  };

  const field = {
    width: "100%",
    height: 52,
    padding: "0 16px",
    borderRadius: 14,
    background: T.surface,
    border: `1.5px solid ${T.border}`,
    color: T.text,
    font: `500 14px ${T.font}`,
    outline: "none",
  };

  if (created) {
    const url = `https://${created.subdomain}.esy.ge`;
    return (
      <GlowScreen T={T} padBottom={40}>
        <div style={{ maxWidth: 460, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
          <div style={{ width: 62, height: 62, borderRadius: 18, background: T.grad, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <Icon.check />
          </div>
          <div style={{ font: `700 24px/1.2 ${T.font}`, color: T.text, marginBottom: 8 }}>
            {created.displayName || created.name} is live
          </div>
          <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, marginBottom: 20 }}>
            Your store responds at this address. (Local dev: open
            <span style={{ color: T.text }}> /?tenant={created.subdomain}</span>.)
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, font: `600 14px ${T.mono}`, color: T.accentFg, wordBreak: "break-all" }}>
            {url}
          </div>
          <button onClick={() => navigate("/")} style={{ marginTop: 22, width: "100%", height: 52, borderRadius: 16, border: "none", background: T.grad, color: "#fff", font: `700 14.5px ${T.font}`, cursor: "pointer" }}>
            Back to storefront
          </button>
        </div>
      </GlowScreen>
    );
  }

  return (
    <GlowScreen T={T} padBottom={40}>
      <div style={{ position: "absolute", top: -160, left: -80, right: -80, height: 360, background: `radial-gradient(60% 80% at 50% 30%, ${accent}48, transparent 70%)`, filter: "blur(20px)", pointerEvents: "none" }} />
      <div style={{ maxWidth: 460, margin: "0 auto", position: "relative" }}>
        <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} aria-label="close" style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon.close /></button>
        </div>

        <div style={{ padding: "16px 24px 24px", textAlign: "center" }}>
          <div style={{ font: `700 26px/1.15 ${T.font}`, color: T.text, letterSpacing: "-0.03em", marginBottom: 8 }}>
            Open your store
          </div>
          <div style={{ font: `400 13.5px/1.5 ${T.font}`, color: T.textDim, maxWidth: 320, margin: "0 auto" }}>
            Pick a name and a subdomain. Your storefront goes live on esy instantly.
          </div>
        </div>

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Store name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Goods" style={field} />
          </div>

          <div>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Subdomain</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                value={sub}
                onChange={(e) => { setTouchedSub(true); setSubdomain(slugify(e.target.value)); }}
                placeholder="acme"
                style={{ ...field, flex: 1 }}
              />
              <span style={{ font: `600 14px ${T.mono}`, color: T.textDim, whiteSpace: "nowrap" }}>.esy.ge</span>
            </div>
            <div style={{ marginTop: 6, font: `500 11.5px ${T.font}`, color: T.textMute }}>
              {sub ? `${sub}.esy.ge` : "lowercase letters, numbers, hyphens · 3–30 chars"}
            </div>
          </div>

          <div>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Brand accent</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 52, height: 52, padding: 0, border: `1.5px solid ${T.border}`, borderRadius: 14, background: T.surface, cursor: "pointer" }} />
              <span style={{ font: `600 14px ${T.mono}`, color: T.textDim }}>{accent}</span>
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px 14px", borderRadius: 12, background: `${T.danger}14`, border: `1px solid ${T.danger}40`, color: T.danger, font: `500 12.5px ${T.font}` }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={busy} style={{ width: "100%", height: 54, borderRadius: 16, border: "none", background: T.grad, color: "#fff", font: `700 14.5px ${T.font}`, cursor: busy ? "default" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Creating…" : <>Create store <Icon.arrowR /></>}
          </button>
        </div>
      </div>
    </GlowScreen>
  );
}
