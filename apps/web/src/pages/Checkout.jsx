import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useOrders } from "../contexts/OrdersContext";
import { useAuth } from "../contexts/AuthContext";
import { useGlow } from "../styles/glow";
import { orderApi } from "../utils/api";
import { GlowScreen, GlowTopNav, GlowStickyCTA, money } from "../components/glow/GlowChrome";

function Field({ T, label, defaultValue, span }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: span ? "span 2" : undefined }}>
      <span style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
      <input defaultValue={defaultValue} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.dark ? T.surface2 : "#fff", color: T.text, font: `500 13px ${T.font}`, outline: "none" }} />
    </div>
  );
}

export default function Checkout() {
  const { T, tenant } = useGlow();
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { user } = useAuth();
  const [express, setExpress] = useState(false);
  const [placing, setPlacing] = useState(false);

  const subtotal = getTotalPrice();
  const count = items.reduce((s, it) => s + it.quantity, 0);
  const shipping = express ? 12 : 0;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = +(subtotal + shipping + tax).toFixed(2);
  const email = user?.email || "guest@esy.shop";

  if (items.length === 0) {
    return (
      <GlowScreen T={T}>
        <GlowTopNav T={T} title="Checkout" onBack={() => navigate(-1)} />
        <div style={{ padding: "60px 24px", textAlign: "center", color: T.textDim, font: `500 14px ${T.font}` }}>
          Your bag is empty.
          <div style={{ marginTop: 16 }}>
            <button onClick={() => navigate("/")} style={{ height: 44, padding: "0 20px", borderRadius: 999, border: "none", background: T.grad, color: "#fff", font: `600 13px ${T.font}`, cursor: "pointer" }}>Browse {tenant.name}</button>
          </div>
        </div>
      </GlowScreen>
    );
  }

  const pay = async () => {
    setPlacing(true);
    // Persist a real order so it shows in the cross-store account hub.
    // Best-effort: requires sign-in; guests still complete the local flow.
    try {
      const devTenant = new URLSearchParams(window.location.search).get("tenant");
      await orderApi.create(
        items.map((i) => ({ productId: i.id, title: i.title, price: i.price, quantity: i.quantity })),
        devTenant,
      );
    } catch {
      /* not signed in / offline — local order flow below still works */
    }
    const res = await createOrder({
      items: items.map((i) => ({ id: i.id, title: i.title, price: i.price, quantity: i.quantity, image: i.image || i.thumbnail })),
      subtotal, shipping, tax, total, count,
      shippingMethod: express ? "Express · 1–2 days" : "Standard · 3–5 days",
      email,
    });
    clearCart();
    navigate("/success", { replace: true, state: { orderId: res?.order?.id, total, count } });
  };

  return (
    <GlowScreen T={T} padBottom={170}>
      <GlowTopNav T={T} title="Checkout" onBack={() => navigate(-1)} right={<span style={{ font: `500 11px ${T.font}`, color: T.textMute, letterSpacing: "0.06em" }}>2/3</span>} />
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* stepper */}
        <div style={{ padding: "4px 22px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          {["Contact", "Shipping", "Payment"].map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, flex: i < 2 ? 1 : "0 0 auto" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: i < 1 ? T.accent : i === 1 ? T.surface2 : T.surface2, color: i < 1 ? "#fff" : T.textDim, border: `1px solid ${i === 1 ? T.accent : T.border}`, font: `700 11px ${T.font}`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i < 1 ? "✓" : i + 1}</span>
                <span style={{ font: `${i === 1 ? 700 : 500} 12px ${T.font}`, color: i <= 1 ? T.text : T.textMute }}>{s}</span>
              </div>
              {i < 2 && <span style={{ flex: 1, height: 1, background: i < 1 ? T.accent : T.border }} />}
            </div>
          ))}
        </div>

        {/* contact confirmed */}
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ padding: "12px 14px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: T.accentBg, color: T.accentFg, display: "inline-flex", alignItems: "center", justifyContent: "center", font: `700 11px ${T.font}` }}>✓</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: "0.08em", textTransform: "uppercase" }}>Contact</div>
              <div style={{ font: `600 13px ${T.font}`, color: T.text }}>{email}</div>
            </div>
            <span style={{ font: `600 12.5px ${T.font}`, color: T.accentFg, cursor: "pointer" }}>Edit</span>
          </div>
        </div>

        {/* shipping form active */}
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ padding: "14px 14px 16px", borderRadius: 16, background: T.surface, border: `1.5px solid ${T.accent}` }}>
            <div style={{ font: `500 10.5px ${T.font}`, color: T.textMute, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Shipping address</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field T={T} label="First name" defaultValue={user?.firstName || ""} />
              <Field T={T} label="Last name" defaultValue={user?.lastName || ""} />
              <Field T={T} label="Address" defaultValue="" span />
              <Field T={T} label="City" defaultValue="" />
              <Field T={T} label="ZIP" defaultValue="" />
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {[{ label: "Standard · 3–5 days", price: "Free", ex: false }, { label: "Express · 1–2 days", price: "$12", ex: true }].map((opt) => {
                const active = opt.ex === express;
                return (
                  <label key={opt.label} onClick={() => setExpress(opt.ex)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 12, border: `1.5px solid ${active ? T.accent : T.border}`, background: active ? T.accentBg : "transparent", cursor: "pointer" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${active ? T.accent : T.borderStr}`, background: active ? T.accent : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}</span>
                    <span style={{ flex: 1, font: `600 13px ${T.font}`, color: T.text }}>{opt.label}</span>
                    <span style={{ font: `700 13px ${T.font}`, color: opt.price === "Free" ? T.success : T.text }}>{opt.price}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* order summary */}
        <div style={{ padding: "0 22px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", font: `500 13px ${T.font}`, color: T.textDim }}><span>{count} item{count === 1 ? "" : "s"}</span><span style={{ color: T.text }}>{money(subtotal)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", font: `500 13px ${T.font}`, color: T.textDim }}><span>Shipping</span><span style={{ color: shipping ? T.text : T.success }}>{shipping ? money(shipping) : "Free"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", font: `500 13px ${T.font}`, color: T.textDim }}><span>Tax</span><span style={{ color: T.text }}>{money(tax)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span style={{ font: `700 14px ${T.font}`, color: T.text }}>Total</span><span style={{ font: `800 18px ${T.font}`, color: T.text }}>{money(total)}</span></div>
        </div>
      </div>

      <GlowStickyCTA T={T} label={placing ? "Placing order…" : "Pay now"} sub={money(total)} onClick={pay} disabled={placing} />
    </GlowScreen>
  );
}
