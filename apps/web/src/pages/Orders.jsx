import { useNavigate } from "react-router-dom";
import { useOrders } from "../contexts/OrdersContext";
import { useGlow } from "../styles/glow";
import { Icon, PoweredBy } from "../components/glow/GlowPrimitives";
import { GlowScreen, GlowTopNav, money } from "../components/glow/GlowChrome";

export default function Orders() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { orders } = useOrders();

  if (!orders || orders.length === 0) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title="Orders" onBack={() => navigate(-1)} />
        <div style={{ padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: T.surface, border: `1px solid ${T.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: T.accentFg }}>
            <Icon.bag width="34" height="34" />
          </div>
          <div style={{ font: `700 20px ${T.font}`, color: T.text, letterSpacing: "-0.02em" }}>No orders yet</div>
          <div style={{ font: `400 13px/1.5 ${T.font}`, color: T.textDim, maxWidth: 260 }}>
            Your orders will show here after checkout.
          </div>
          <button onClick={() => navigate("/")} style={{ marginTop: 8, height: 48, padding: "0 22px", borderRadius: 14, border: "none", background: T.grad, color: "#fff", font: `700 13.5px ${T.font}`, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: `0 10px 24px ${T.accent}55` }}>
            Browse {tenant.name} <Icon.arrowR />
          </button>
        </div>
      </GlowScreen>
    );
  }

  return (
    <GlowScreen T={T}>
      <GlowTopNav T={T} title="Orders" onBack={() => navigate(-1)} />
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ padding: "8px 22px 16px" }}>
          <div style={{ font: `700 24px ${T.font}`, color: T.text, letterSpacing: "-0.03em" }}>Your orders</div>
          <div style={{ font: `400 12.5px ${T.font}`, color: T.textDim, marginTop: 4 }}>{orders.length} order{orders.length === 1 ? "" : "s"}</div>
        </div>

        <div style={{ padding: "0 16px 6px", display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map((o, idx) => {
            const id = (o.id || `ESY-${idx}`).toString().slice(-7).toUpperCase();
            const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
            const n = o.count ?? (Array.isArray(o.items) ? o.items.length : "—");
            const status = (o.status || "pending").toLowerCase();
            const tone = status === "delivered" || status === "completed" ? T.success
              : status === "cancelled" ? T.danger : T.accentFg;
            return (
              <div key={o.id || idx} style={{ padding: "14px 14px", borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 42, height: 42, borderRadius: 12, background: T.accentBg, color: T.accentFg, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon.bag /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `700 13px ${T.mono}`, color: T.text }}>#{id}</div>
                  <div style={{ font: `400 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>{date} · {n} item{n === 1 ? "" : "s"}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ font: `800 14px ${T.font}`, color: T.text, letterSpacing: "-0.02em" }}>{money(o.total)}</span>
                  <span style={{ font: `600 9.5px ${T.font}`, color: tone, letterSpacing: "0.06em", textTransform: "uppercase" }}>{status}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "18px 22px 8px" }}><PoweredBy T={T} /></div>
      </div>
    </GlowScreen>
  );
}
