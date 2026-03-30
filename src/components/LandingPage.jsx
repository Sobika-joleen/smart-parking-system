import React, { useState, useEffect, useRef } from "react";

// ── Animated Counter ──────────────────────────────────────────────────────────
const CountUp = ({ end, duration = 1500, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now) => {
      const pct = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setCount(Math.round(eased * end));
      if (pct < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [end, duration]);

  return <>{count.toLocaleString()}{suffix}</>;
};

// ── Live slot mini-grid for hero mockup ───────────────────────────────────────
const MOCK_SLOTS = [
  "occupied","available","occupied","available","reserved","available",
  "available","occupied","available","occupied","available","reserved",
];

const LiveSlotGrid = () => {
  const [slots, setSlots] = useState(MOCK_SLOTS);

  useEffect(() => {
    const id = setInterval(() => {
      setSlots(prev => {
        const next = [...prev];
        const idx = next
          .map((s, i) => ({ s, i }))
          .filter(({ s }) => s !== "reserved")
          .map(({ i }) => i);
        if (!idx.length) return prev;
        const pick = idx[Math.floor(Math.random() * idx.length)];
        next[pick] = next[pick] === "available" ? "occupied" : "available";
        return next;
      });
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-6 gap-1.5">
      {slots.map((st, i) => (
        <div
          key={i}
          className="h-7 rounded-md transition-all duration-700 relative overflow-hidden"
          style={{
            background: st === "available" ? "rgba(198,255,0,0.18)" : st === "occupied" ? "rgba(239,68,68,0.18)" : "rgba(234,179,8,0.15)",
            border: `1px solid ${st === "available" ? "rgba(198,255,0,0.4)" : st === "occupied" ? "rgba(239,68,68,0.35)" : "rgba(234,179,8,0.35)"}`,
          }}
        />
      ))}
    </div>
  );
};

// ── Feature Card ──────────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, stat, statLabel }) => (
  <div className="group bg-[#0f0f0f] border border-white/[0.07] rounded-2xl p-7 flex flex-col gap-4 hover:border-[#c6ff00]/25 transition-all duration-300 hover:-translate-y-1">
    <div className="w-11 h-11 rounded-xl bg-[#161616] border border-white/[0.07] group-hover:border-[#c6ff00]/30 flex items-center justify-center text-[#c6ff00] transition-all duration-300 flex-shrink-0">
      {icon}
    </div>
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
    {stat && (
      <div className="pt-2 border-t border-white/[0.05] flex items-baseline gap-1.5 mt-auto">
        <span className="text-xl font-black text-[#c6ff00]">{stat}</span>
        <span className="text-[11px] text-gray-600 uppercase tracking-widest">{statLabel}</span>
      </div>
    )}
  </div>
);

// ── Main Landing Page ─────────────────────────────────────────────────────────
const LandingPage = ({ onLogin }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white font-['Inter'] overflow-x-hidden overflow-y-auto selection:bg-[#c6ff00] selection:text-black">

      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.014) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#c6ff00] rounded-full blur-[180px] opacity-[0.025] pointer-events-none" />

      {/* ── Navbar ── */}
      <nav className="relative z-20 w-full max-w-[1280px] mx-auto px-8 py-5 flex items-center justify-between border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c6ff00] flex items-center justify-center shadow-[0_0_14px_rgba(198,255,0,0.4)]">
            <span className="text-[#0a0a0a] font-black text-sm">P</span>
          </div>
          <span className="text-white font-bold text-sm tracking-widest uppercase">ParkMate</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "System", "Enterprise"].map(l => (
            <button key={l} className="text-xs text-gray-500 hover:text-white transition-colors uppercase tracking-widest font-medium">
              {l}
            </button>
          ))}
        </div>

        <button
          onClick={onLogin}
          className="hidden md:flex items-center gap-2 px-5 py-2 rounded-lg bg-[#c6ff00] text-[#0a0a0a] text-xs font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(198,255,0,0.5)] transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Open Dashboard
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 w-full max-w-[1280px] mx-auto px-8 pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Copy */}
          <div
            className="flex flex-col gap-8"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            {/* Status badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] w-fit">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c6ff00] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#c6ff00]" />
              </span>
              <span className="text-[10px] font-semibold text-[#c6ff00] uppercase tracking-widest">IoT Network Live · 99.9% Uptime</span>
            </div>

            {/* Headline */}
            <div className="flex flex-col gap-3">
              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.05] text-white">
                Intelligent<br />
                <span className="text-[#c6ff00]">Parking</span><br />
                Platform.
              </h1>
              <p className="text-base text-gray-500 leading-relaxed max-w-md mt-2">
                Command-center grade parking management with real-time IoT sensor integration, sub-50ms data ingestion, and precision slot routing.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-4">
              <button
                onClick={onLogin}
                className="group flex items-center gap-2.5 px-8 py-3.5 bg-[#c6ff00] text-[#0a0a0a] rounded-xl font-bold text-sm tracking-wide hover:shadow-[0_0_28px_rgba(198,255,0,0.55)] transition-all duration-200 hover:scale-[1.03] active:scale-95"
              >
                Launch Dashboard
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 transition-transform group-hover:translate-x-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <button className="px-8 py-3.5 border border-white/10 text-white rounded-xl font-medium text-sm tracking-wide hover:bg-white/5 hover:border-white/20 transition-all duration-200">
                View Docs
              </button>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-8 pt-4 border-t border-white/[0.06]">
              {[
                { val: 247, label: "Spots managed", suffix: "" },
                { val: 1342, label: "Bookings today", suffix: "" },
              ].map((s, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-black text-white">
                    {mounted ? <CountUp end={s.val} duration={1400} suffix={s.suffix} /> : "0"}
                  </span>
                  <span className="text-[11px] text-gray-600 uppercase tracking-widest">{s.label}</span>
                </div>
              ))}
              <div className="w-px h-10 bg-white/[0.08]" />
              <div className="flex flex-col gap-0.5">
                <span className="text-2xl font-black text-[#c6ff00]">99.9%</span>
                <span className="text-[11px] text-gray-600 uppercase tracking-widest">Uptime SLA</span>
              </div>
            </div>
          </div>

          {/* Right: Dashboard Mockup */}
          <div
            className="hidden lg:block"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
            }}
          >
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute inset-0 bg-[#c6ff00] rounded-3xl blur-[80px] opacity-[0.06]" />

              {/* Main card */}
              <div className="relative bg-[#0f0f0f] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
                {/* Window bar */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#0a0a0a]">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="text-[10px] text-gray-600 font-medium tracking-widest uppercase">SmartPark · Level 1</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c6ff00] animate-pulse" />
                    <span className="text-[9px] text-[#c6ff00] font-bold tracking-widest">LIVE</span>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-5">
                  {/* Slot grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Parking Grid</span>
                      <span className="text-[9px] text-[#c6ff00] font-bold">Real-time sensors</span>
                    </div>
                    <LiveSlotGrid />
                    <div className="flex gap-4 mt-2.5">
                      {[
                        { color: "rgba(198,255,0,0.4)", label: "Free" },
                        { color: "rgba(239,68,68,0.4)", label: "Taken" },
                        { color: "rgba(234,179,8,0.4)", label: "Reserved" },
                      ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: l.color }} />
                          <span className="text-[9px] text-gray-600">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-white/[0.05]" />

                  {/* Mock stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Available", val: "7", color: "text-[#c6ff00]" },
                      { label: "Occupied", val: "3", color: "text-red-400" },
                      { label: "Reserved", val: "2", color: "text-yellow-400" },
                    ].map(s => (
                      <div key={s.label} className="bg-[#161616] rounded-xl p-3 border border-white/[0.05] flex flex-col gap-0.5">
                        <span className={`text-xl font-black ${s.color}`}>{s.val}</span>
                        <span className="text-[9px] text-gray-600 uppercase tracking-widest">{s.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <div className="bg-[#0a0a0a] rounded-xl border border-white/[0.05] p-3">
                    <span className="text-[9px] text-gray-600 uppercase tracking-widest font-semibold block mb-2">Hourly occupancy</span>
                    <div className="flex items-end gap-1 h-14">
                      {[30,55,40,75,60,85,50,92,65,70,45,80].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${h}%`,
                            background: i === 7 ? "#c6ff00" : "rgba(255,255,255,0.07)",
                            boxShadow: i === 7 ? "0 0 10px rgba(198,255,0,0.4)" : "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating tag */}
              <div className="absolute -bottom-4 -left-6 bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl"
                style={{ animation: "float 6s ease-in-out infinite" }}>
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </div>
                <div>
                  <div className="text-white text-xs font-bold">P1-05 Occupied</div>
                  <div className="text-[10px] text-gray-500">Sensor confirmed · 38 min</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="w-full max-w-[1280px] mx-auto px-8">
        <div className="h-px bg-white/[0.05]" />
      </div>

      {/* ── Features ── */}
      <section className="relative z-10 w-full max-w-[1280px] mx-auto px-8 py-24">
        <div className="flex flex-col gap-3 mb-14">
          <span className="text-[11px] text-[#c6ff00] font-bold uppercase tracking-widest">Platform Capabilities</span>
          <h2 className="text-3xl font-black text-white tracking-tight">Built for real operations</h2>
          <p className="text-sm text-gray-500 max-w-lg">Every feature engineered from operator feedback — not guesswork. Speed, reliability, and clarity at every touchpoint.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="Real-Time IoT Sync"
            desc="Sensor data streams via ThingSpeak with sub-50ms latency. Every occupation event is reflected instantly across all clients."
            stat="<50ms"
            statLabel="Avg. latency"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <FeatureCard
            title="Visual Pathfinding"
            desc="Isometric parking maps render slot-by-slot navigation paths in real time, guiding drivers directly to available bays."
            stat="4"
            statLabel="Levels mapped"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            }
          />
          <FeatureCard
            title="Booking State Engine"
            desc="Reserved → Confirmed → Departed lifecycle with automatic 5-minute timeouts and sensor-triggered confirmations."
            stat="100%"
            statLabel="Auto-confirmed"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.05] w-full max-w-[1280px] mx-auto px-8 py-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-[#c6ff00] flex items-center justify-center">
            <span className="text-[#0a0a0a] font-black text-[10px]">P</span>
          </div>
          <span className="text-xs text-gray-600 font-semibold">SmartPark © 2026</span>
        </div>
        <span className="text-xs text-gray-700">IoT-Powered Precision Parking</span>
      </footer>
    </div>
  );
};

export default LandingPage;
