import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import SecurityPortal from "./components/SecurityPortal";
import { supabase } from "./supabaseClient";
import "./index.css";

// ── Error Boundary — catches render crashes & shows a recovery screen ────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || "Unknown error" };
  }
  componentDidCatch(err, info) {
    console.error("[ErrorBoundary] Caught:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: "100vh", width: "100vw", background: "#0a0a0a",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          fontFamily: "Inter, sans-serif", gap: "16px", padding: "24px",
        }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "#c6ff00", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "24px",
          }}>⚡</div>
          <h1 style={{ color: "#fff", fontSize: "20px", fontWeight: 800, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#555", fontSize: "13px", margin: 0, textAlign: "center", maxWidth: "360px" }}>
            {this.state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px", padding: "10px 28px", borderRadius: "12px",
              background: "#c6ff00", color: "#0f0f0f", fontWeight: 700,
              fontSize: "14px", border: "none", cursor: "pointer",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [session, setSession]   = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isSecurityMode, setIsSecurityMode] = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Supabase session error:", err);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setShowAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-t-2 border-[#c6ff00] animate-spin" />
      </div>
    );
  }

  if (isSecurityMode) {
    return <SecurityPortal onClose={() => setIsSecurityMode(false)} />;
  }

  if (showAuth && !session) {
    return (
      <AuthPage
        onAuthSuccess={() => setShowAuth(false)}
        onBack={() => setShowAuth(false)}
      />
    );
  }

  if (!session) {
    return <LandingPage onLogin={() => setShowAuth(true)} onSecurityAccess={() => setIsSecurityMode(true)} />;
  }

  return (
    <ErrorBoundary>
      <Dashboard
        onLogout={async () => { await supabase.auth.signOut(); }}
        session={session}
      />
    </ErrorBoundary>
  );
}

export default App;