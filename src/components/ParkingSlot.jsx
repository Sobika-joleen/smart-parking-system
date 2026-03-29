import React, { useState, useEffect } from "react";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ── Clean top-down car SVG ────────────────────────────────────────────────────
const CarTopView = ({ state = "available" }) => {
  const body = state === "occupied" ? "#ef4444" : state === "reserved" ? "#eab308" : "#c6ff00";
  const wheel = state === "occupied" ? "#b91c1c" : state === "reserved" ? "#ca8a04" : "#8fbb00";
  const win = "rgba(0,0,0,0.55)";
  const glow = state === "occupied" ? "rgba(239,68,68,0.25)" : state === "reserved" ? "rgba(234,179,8,0.25)" : "rgba(198,255,0,0.25)";

  return (
    <svg viewBox="0 0 44 72" className="w-9 h-14" fill="none" style={{ opacity: state === "reserved" ? 0.3 : 1 }}>
      <ellipse cx="22" cy="66" rx="14" ry="4" fill={glow} />
      <rect x="6" y="8" width="32" height="56" rx="9" fill={body} />
      <rect x="10" y="12" width="24" height="16" rx="4" fill={win} />
      <rect x="10" y="46" width="24" height="12" rx="4" fill={win} />
      <rect x="14" y="26" width="16" height="18" rx="3" fill="#000" fillOpacity="0.2" />
      <rect x="0" y="12" width="7" height="13" rx="3" fill={wheel} />
      <rect x="0" y="46" width="7" height="13" rx="3" fill={wheel} />
      <rect x="37" y="12" width="7" height="13" rx="3" fill={wheel} />
      <rect x="37" y="46" width="7" height="13" rx="3" fill={wheel} />
      <rect x="9" y="7" width="8" height="4" rx="2" fill="rgba(255,255,200,0.9)" />
      <rect x="27" y="7" width="8" height="4" rx="2" fill="rgba(255,255,200,0.9)" />
      <rect x="9" y="61" width="8" height="4" rx="2" fill="rgba(255,80,80,0.8)" />
      <rect x="27" y="61" width="8" height="4" rx="2" fill="rgba(255,80,80,0.8)" />
    </svg>
  );
};

// ── Countdown Timer ───────────────────────────────────────────────────────────
const Timer = ({ reservedAt }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!reservedAt) return;
    const tick = () => {
      const elapsed = Date.now() - new Date(reservedAt).getTime();
      const remaining = Math.max(0, 5 * 60 * 1000 - elapsed);
      setUrgent(remaining < 60000);
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const int = setInterval(tick, 1000);
    return () => clearInterval(int);
  }, [reservedAt]);

  return (
    <span className={`font-mono ${urgent ? "text-red-400 animate-pulse" : ""}`}>{timeLeft}</span>
  );
};

// ── ParkingSlot ───────────────────────────────────────────────────────────────
const ParkingSlot = ({ slot, onClick, selected, index = 0 }) => {
  const isAvailable = slot.status === "available";
  const isOccupied = slot.status === "occupied" || slot.status === "confirmed";
  const isReserved = slot.status === "reserved";
  const isNoParking = slot.status === "noparking";

  return (
    <div
      onClick={() => isAvailable && onClick(slot.id)}
      className={`
        slot-enter relative rounded-2xl overflow-hidden border transition-all duration-300 flex-shrink-0
        w-[112px] h-[172px] flex flex-col items-center justify-between p-2.5
        ${isAvailable
          ? selected
            ? "bg-[#131e00] border-[#c6ff00] cursor-pointer scale-[1.03] slot-selected-ring"
            : "bg-[#191919] border-white/[0.08] hover:border-[#c6ff00]/50 hover:bg-[#131e00] hover:-translate-y-1.5 cursor-pointer"
          : isReserved
          ? "bg-[#1e1b0b] border-yellow-500/50 cursor-not-allowed shadow-[0_0_15px_rgba(234,179,8,0.15)]"
          : isOccupied
          ? "bg-[#1a0f0f] border-red-500/25 cursor-not-allowed occupied-sweep"
          : "border-white/5 cursor-not-allowed"
        }
      `}
      style={{
        animationDelay: `${index * 55}ms`,
        ...(isNoParking ? { background: "repeating-linear-gradient(45deg, #1a1a1a, #1a1a1a 8px, #141414 8px, #141414 18px)" } : {}),
      }}
    >
      {/* Top row: ID + indicator */}
      <div className="w-full flex items-center justify-between">
        <span className={`text-[10px] font-bold tracking-widest ${
          isNoParking ? "text-white/20"
          : isOccupied ? "text-red-400"
          : isReserved ? "text-yellow-500"
          : selected ? "text-[#c6ff00]" : "text-[#c6ff00]/70"
        }`}>
          {slot.id}
        </span>
        {isOccupied && <span className="text-red-400"><AlertIcon /></span>}
        {isReserved && <span className="text-yellow-500 animate-pulse"><ClockIcon /></span>}
        {isAvailable && (
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            selected
              ? "bg-[#c6ff00] shadow-[0_0_10px_rgba(198,255,0,1)] animate-pulse"
              : "bg-[#c6ff00]/50"
          }`} />
        )}
      </div>

      {/* Center visual */}
      <div className="flex-1 flex items-center justify-center">
        {isNoParking ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full border-2 border-white/10 flex items-center justify-center">
              <span className="text-white/20 text-xl font-black leading-none">✕</span>
            </div>
            <span className="text-[8px] text-white/20 tracking-widest font-semibold">NO PARKING</span>
          </div>
        ) : (
          <div className="relative">
            <CarTopView state={isOccupied ? "occupied" : isReserved ? "reserved" : "available"} />
            {/* Selection halo */}
            {selected && (
              <div
                className="absolute inset-0 rounded-full opacity-25 animate-ping"
                style={{ background: "radial-gradient(circle, rgba(198,255,0,0.5) 0%, transparent 70%)", animationDuration: "1.5s" }}
              />
            )}
            {/* Reserved ghost label */}
            {isReserved && (
              <div className="absolute inset-x-0 bottom-[-10px] flex justify-center">
                <span className="text-[10px] text-yellow-500 font-bold tracking-widest bg-[#0f0f0f] px-1 rounded">RESVD</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom status pill */}
      <div className="w-full">
        {isOccupied ? (
          <div className="flex items-center gap-1.5 bg-red-500/12 rounded-lg px-2 py-1.5 border border-red-500/15">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
            <span className="text-[9px] text-red-400 font-semibold truncate">Occupied</span>
          </div>
        ) : isReserved ? (
          <div className="flex items-center justify-between gap-1 bg-yellow-500/15 rounded-lg px-2 py-1.5 border border-yellow-500/25">
            <span className="text-[9px] text-yellow-500 font-semibold">Waiting</span>
            <span className="text-[10px] text-yellow-400 font-bold"><Timer reservedAt={slot.reservedAt} /></span>
          </div>
        ) : isAvailable ? (
          <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 border transition-all duration-300 ${
            selected
              ? "bg-[#c6ff00]/18 border-[#c6ff00]/30"
              : "bg-[#c6ff00]/7 border-[#c6ff00]/12"
          }`}>
            <span className={selected ? "text-[#c6ff00]" : "text-[#c6ff00]/50"}><LockIcon /></span>
            <span className={`text-[9px] font-semibold truncate ${selected ? "text-[#c6ff00]" : "text-[#c6ff00]/50"}`}>
              {selected ? "Selected ✓" : "Reserve"}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ParkingSlot;
