import { useEffect } from "react";
import { setToken } from "../utils/api";
import { useGlow } from "../styles/glow";

// Landing point after Google OAuth: the backend success handler redirects here
// with ?token=<jwt>. We store it and hard-reload into the app so AuthProvider
// re-mounts and restores the session from the token via /api/auth/user.
export default function AuthCallback() {
  const { T } = useGlow();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      window.location.replace("/account");
    } else {
      window.location.replace("/signin?error=oauth");
    }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, font: `400 14px ${T.font}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${T.accent}`, borderTopColor: "transparent", animation: "glow-spin 1s linear infinite" }} />
      Signing you in…
      <style>{`@keyframes glow-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
