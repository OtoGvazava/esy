import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useOrders } from "../contexts/OrdersContext";
import { useSaved } from "../contexts/SavedContext";
import { useThemeMode } from "../contexts/ThemeModeContext";
import { useGlow } from "../styles/glow";
import { Icon, PoweredBy, langInfo } from "../components/glow/GlowPrimitives";
import { GlowScreen, GlowTopNav, money } from "../components/glow/GlowChrome";
import SignIn from "./SignIn";

export default function Account() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { orders, getTotalOrders, getTotalSpent } = useOrders();
  const { count: savedCount } = useSaved();
  const { mode, language } = useThemeMode();

  if (!isAuthenticated) return <SignIn />;

  const name = user?.name || user?.email || "Member";
  const initial = (name || "M").charAt(0).toUpperCase();
  const recent = (orders || []).slice(0, 3);

  const settings = [
    { k: "Language & region", v: langInfo(language).native, onClick: () => navigate("/settings/language") },
    { k: "Appearance", v: mode === "dark" ? "Dark" : "Light", onClick: () => navigate("/settings/appearance") },
    { k: "Addresses", v: null, onClick: null },
    { k: "Payment methods", v: null, onClick: null },
    ...(isAdmin ? [{ k: "Shop dashboard", v: "Admin", onClick: () => navigate("/admin") }] : []),
    { k: "Help & support", v: null, onClick: null },
    { k: "Sign out", v: null, danger: true, onClick: () => { logout(); navigate("/"); } },
  ];

  return (
    <GlowScreen T={T}>
      <GlowTopNav T={T} title="Account" onBack={() => navigate(-1)} />
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        {/* profile */}
        <div style={{ padding: "6px 16px 16px" }}>
          <div style={{ padding: "18px 16px", borderRadius: 18, background: `linear-gradient(135deg, ${T.accent}1c, transparent 70%), ${T.surface}`, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.grad, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", font: `800 22px ${T.font}` }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `700 17px ${T.font}`, color: T.text, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
              <div style={{ font: `400 12px ${T.font}`, color: T.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 999, background: T.accentBg, color: T.accentFg, font: `600 10.5px ${T.font}`, letterSpacing: "0.04em", textTransform: "uppercase" }}><Icon.star width="10" height="10" /> {isAdmin ? "Shop owner" : "Member"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* stats */}
        <div style={{ padding: "0 16px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[[String(getTotalOrders()), "Orders"], [money(getTotalSpent()), "Spent"], [String(savedCount), "Saved"]].map(([v, k]) => (
            <div key={k} style={{ padding: "12px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ font: `800 18px ${T.font}`, color: T.text, letterSpacing: "-0.02em" }}>{v}</span>
              <span style={{ font: `500 11px ${T.font}`, color: T.textMute, letterSpacing: "0.04em", textTransform: "uppercase" }}>{k}</span>
            </div>
          ))}
        </div>

        {/* recent orders */}
        {recent.length > 0 && (
          <>
            <div style={{ padding: "4px 22px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ font: `600 11.5px ${T.font}`, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Recent orders</div>
              <span onClick={() => navigate("/orders")} style={{ font: `600 12px ${T.font}`, color: T.accentFg, cursor: "pointer" }}>See all</span>
            </div>
            <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {recent.map((o, idx) => {
                const id = (o.id || `ESY-${idx}`).toString().slice(-7).toUpperCase();
                const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
                const n = o.count ?? (Array.isArray(o.items) ? o.items.length : "—");
                const delivered = o.status === "delivered" || o.status === "completed";
                return (
                  <div key={o.id || idx} style={{ padding: "12px 14px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: T.accentBg, color: T.accentFg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon.bag /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: `700 13px ${T.mono}`, color: T.text }}>#{id}</div>
                      <div style={{ font: `400 11.5px ${T.font}`, color: T.textMute }}>{date} · {n} item{n === 1 ? "" : "s"}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <span style={{ font: `700 13.5px ${T.font}`, color: T.text }}>{money(o.total)}</span>
                      <span style={{ font: `600 9.5px ${T.font}`, color: delivered ? T.success : T.accentFg, letterSpacing: "0.06em", textTransform: "uppercase" }}>{o.status || "pending"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* settings */}
        <div style={{ padding: "6px 16px 24px", display: "flex", flexDirection: "column" }}>
          {settings.map((s, i, arr) => (
            <div key={s.k} onClick={s.onClick || undefined} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 6px", borderBottom: i === arr.length - 1 ? "none" : `1px solid ${T.border}`, cursor: s.onClick ? "pointer" : "default" }}>
              <span style={{ font: `600 13.5px ${T.font}`, color: s.danger ? T.danger : T.text }}>{s.k}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: T.textMute, font: `500 12.5px ${T.font}` }}>{s.v}<Icon.arrowR /></span>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 22px 8px" }}><PoweredBy T={T} /></div>
      </div>
    </GlowScreen>
  );
}
