import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import SecurityPortal from "./components/SecurityPortal";
import { supabase } from "./supabaseClient";
import "./index.css";

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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
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
    <Dashboard
      onLogout={async () => { await supabase.auth.signOut(); }}
      session={session}
    />
  );
}

export default App;