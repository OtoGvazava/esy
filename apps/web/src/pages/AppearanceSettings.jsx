import { useNavigate } from "react-router-dom";
import { useThemeMode } from "../contexts/ThemeModeContext";
import { useGlow } from "../styles/glow";
import { Icon } from "../components/glow/GlowPrimitives";
import { GlowScreen } from "../components/glow/GlowChrome";

export default function AppearanceSettings() {
  const { T } = useGlow();
  const navigate = useNavigate();
  const { mode, setMode } = useThemeMode();
  const current = mode === "dark" ? "dark" : "light";

  const apply = (id) => {
    if (id === "system") {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      setMode?.(prefersDark ? "dark" : "light");
    } else {
      setMode?.(id);
    }
  };

  const options = [
    { id: "light", label: "Light", icon: <Icon.sun />, bg: "#fafafe", fg: "#0b0b14", surface: "#ffffff", border: "rgba(15,15,35,0.08)" },
    { id: "dark", label: "Dark", icon: <Icon.moon />, bg: "#0a0a12", fg: "#f2f2f7", surface: "#13131e", border: "rgba(255,255,255,0.08)" },
    { id: "system", label: "System · Auto", icon: <Icon.auto />, bg: "linear-gradient(90deg,#fafafe 0 50%,#0a0a12 50% 100%)", fg: "#0b0b14", surface: "#cfcfe0", border: "rgba(15,15,35,0.08)" },
  ];

  return (
    <GlowScreen T={T} padBottom={120}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
          <span style={{ width: 38, height: 4, borderRadius: 999, background: T.border }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 6px" }}>
          <span onClick={() => navigate(-1)} style={{ font: `500 13px ${T.font}`, color: T.textDim, cursor: "pointer" }}>Cancel</span>
          <span style={{ font: `700 15px ${T.font}`, color: T.text, letterSpacing: "-0.01em" }}>Choose appearance</span>
          <span onClick={() => navigate(-1)} style={{ font: `700 13px ${T.font}`, color: T.accentFg, cursor: "pointer" }}>Done</span>
        </div>
        <div style={{ padding: "6px 22px 18px", font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
          Pick how the storefront looks. <span style={{ color: T.text }}>System</span> follows your device setting.
        </div>

        <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {options.map((opt) => {
            const active = opt.id === current;
            return (
              <div key={opt.id} onClick={() => apply(opt.id)} style={{
                display: "flex", flexDirection: "column", gap: 8, padding: 8, borderRadius: 16,
                background: active ? T.accentBg : "transparent",
                border: `1.5px solid ${active ? T.accent : T.border}`, cursor: "pointer",
              }}>
                <div style={{ position: "relative", aspectRatio: "0.78", borderRadius: 10, overflow: "hidden", background: opt.bg, border: `1px solid ${opt.border}` }}>
                  <div style={{ position: "absolute", top: 8, left: 8, right: 8, height: 8, borderRadius: 4, background: opt.surface, opacity: 0.85 }} />
                  <div style={{ position: "absolute", top: 22, left: 8, width: 36, height: 5, borderRadius: 2, background: opt.fg, opacity: 0.8 }} />
                  <div style={{ position: "absolute", top: 32, left: 8, width: 22, height: 4, borderRadius: 2, background: opt.fg, opacity: 0.4 }} />
                  <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    <div style={{ aspectRatio: "1", borderRadius: 5, background: opt.surface, opacity: 0.9 }} />
                    <div style={{ aspectRatio: "1", borderRadius: 5, background: opt.surface, opacity: 0.9 }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, font: `600 11.5px ${T.font}`, color: T.text }}>{opt.icon} {opt.label}</span>
                  {active ? (
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: T.accent, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon.check /></span>
                  ) : (
                    <span style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${T.borderStr}` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlowScreen>
  );
}
