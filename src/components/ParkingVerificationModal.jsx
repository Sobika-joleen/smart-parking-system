import React, { useState, useEffect, useCallback, useMemo } from "react";

// ── Constants ───────────────────────────────────────────────────────────────
const VERIFY_SECONDS = 5 * 60; // 5 minutes

// ── Countdown Ring SVG ──────────────────────────────────────────────────────
const CountdownRing = ({ seconds, total }) => {
  const pct  = seconds / total;
  const r    = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color =
    pct > 0.5 ? "#c6ff00" : pct > 0.25 ? "#facc15" : "#f87171";

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg viewBox="0 0 88 88" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1e1e1e" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s" }}
        />
      </svg>
      <span className="relative font-mono text-lg font-black text-white z-10">
        {mm}:{ss}
      </span>
    </div>
  );
};

// ── Car Animation ────────────────────────────────────────────────────────────
const PulsingCar = ({ color = "#c6ff00" }) => (
  <div className="relative flex items-center justify-center">
    {/* Outer ping rings */}
    <span
      className="absolute inline-flex w-20 h-20 rounded-full opacity-20 animate-ping"
      style={{ backgroundColor: color }}
    />
    <span
      className="absolute inline-flex w-14 h-14 rounded-full opacity-10 animate-ping"
      style={{ backgroundColor: color, animationDelay: "0.3s" }}
    />
    {/* Icon container */}
    <div
      className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center border-2"
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        boxShadow: `0 0 24px ${color}30`,
      }}
    >
      <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9">
        <path
          d="M8 28l3-9a3 3 0 012.8-2h20.4a3 3 0 012.8 2l3 9"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
        />
        <rect x="6" y="28" width="36" height="10" rx="3"
          fill={`${color}20`} stroke={color} strokeWidth="2" />
        <circle cx="14" cy="39" r="4" fill={color} />
        <circle cx="34" cy="39" r="4" fill={color} />
        <path d="M14 24h20" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

// ── Main Modal (Full-Screen Lockdown) ────────────────────────────────────────
const ParkingVerificationModal = ({
  isOpen,
  booking,           // { bookingId, slotId, level, vehicleNumber, name }
  bookings = [],     // All DB bookings (for rebooking logic)
  levelSlots = {},   // Base layout map
  onConfirm,         // () => void
  onRebook,          // (newSlotId, newLevel) => void
  onAutoConfirm,     // () => void — called when timer expires
}) => {
  const [secondsLeft, setSecondsLeft] = useState(VERIFY_SECONDS);
  const [phase, setPhase]             = useState("idle"); // idle | confirming | rebooking | done
  const [reminderFired, setReminderFired] = useState(false);
  
  // Rebooking state
  const [activeLevel, setActiveLevel] = useState(booking?.level || 1);
  const [newSlot, setNewSlot]         = useState(null);

  // Reset whenever a new booking arrives
  useEffect(() => {
    if (isOpen && booking) {
      setSecondsLeft(VERIFY_SECONDS);
      setPhase("idle");
      setReminderFired(false);
      setActiveLevel(booking.level || 1);
      setNewSlot(null);
    }
  }, [isOpen, booking?.bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown ticker
  useEffect(() => {
    if (!isOpen || phase !== "idle") return;
    if (secondsLeft <= 0) {
      setPhase("done");
      onAutoConfirm?.();
      return;
    }

    // Fire reminder at 1 minute remaining
    if (secondsLeft === 60 && !reminderFired) {
      setReminderFired(true);
      // visual pulse handled by ring color
    }

    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isOpen, phase, secondsLeft, reminderFired, onAutoConfirm]);

  const handleConfirm = useCallback(() => {
    setPhase("confirming");
    setTimeout(() => {
      setPhase("done");
      onConfirm?.();
    }, 700);
  }, [onConfirm]);

  const handleWrongSlot = useCallback(() => {
    setPhase("rebooking");
  }, []);

  const handleConfirmRebooking = useCallback(() => {
    if (!newSlot) return;
    setPhase("confirming");
    setTimeout(() => {
      setPhase("done");
      onRebook?.(newSlot, activeLevel);
    }, 900);
  }, [newSlot, activeLevel, onRebook]);

  // ── Computing Free Slots for Rebooking ──
  const layoutSlots = levelSlots[activeLevel] || [];
  
  // Find which slots are actually active in DB
  const activeBookingsOnLevel = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.level === activeLevel &&
        ["reserved", "parked_unverified", "confirmed"].includes(b.status)
    );
  }, [bookings, activeLevel]);

  if (!isOpen || !booking) return null;

  const isReminderPhase = secondsLeft <= 60 && secondsLeft > 0;
  const accentColor     = isReminderPhase ? "#facc15" : "#c6ff00";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center font-['Inter'] px-4 py-8 overflow-y-auto">
      {/* Heavy Backdrop (Un-dismissible Lockdown) */}
      <div className="fixed inset-0 bg-[#0a0a0a]/95 backdrop-blur-xl pointer-events-none" />

      {/* Massive Modal Container */}
      <div
        className="relative w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl animate-[slideUp_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards] mx-auto"
        style={{
          background: "linear-gradient(145deg, #131313, #0a0a0a)",
          border: `1px solid ${accentColor}25`,
          boxShadow: `0 0 80px ${accentColor}10, 0 30px 80px rgba(0,0,0,0.9)`, // massive shadow
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        <div className="p-8 md:p-12 flex flex-col gap-8">
          
          {/* Header & Badges */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span
                className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg w-max mb-2"
                style={{
                  color: accentColor,
                  background: `${accentColor}15`,
                  border: `1px solid ${accentColor}25`,
                }}
              >
                {isReminderPhase ? "⚠️ Final Warning" : "🚗 Vehicle Detected"}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {phase !== "rebooking" ? "Verify Your Parking" : "Where are you parked?"}
              </h2>
            </div>
            
            {phase !== "rebooking" && (
              <div className="flex flex-col items-center gap-1">
                <CountdownRing seconds={secondsLeft} total={VERIFY_SECONDS} />
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                  Auto-Confirm
                </span>
              </div>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────────
              PHASE: IDLE (Standard Verification) 
          ────────────────────────────────────────────────────────────────── */}
          {phase === "idle" && (
            <div className="flex flex-col gap-8 animate-[fadeIn_0.3s_0.1s_both]">
              {/* Pulsing car center piece */}
              <div className="flex justify-center my-4">
                <PulsingCar color={accentColor} />
              </div>

              {/* Massive Slot Info Card */}
              <div
                className="rounded-3xl p-6 flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${accentColor}20`,
                }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-bold">Detected Slot</span>
                  <span
                    className="text-5xl md:text-7xl font-black"
                    style={{ color: accentColor, textShadow: `0 0 30px ${accentColor}60` }}
                  >
                    {booking.slotId}
                  </span>
                  <span className="text-xs md:text-sm font-medium text-gray-400">Level {booking.level} Floor</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-bold">Vehicle</span>
                  <span className="text-xl md:text-2xl font-black text-white font-mono bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                    {booking.vehicleNumber}
                  </span>
                  {booking.name && (
                    <span className="text-xs text-gray-400 mt-1">{booking.name}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <button
                  onClick={handleConfirm}
                  className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl font-black text-lg transition-all active:scale-95 group"
                  style={{
                    background: `${accentColor}`,
                    color: "#0f0f0f",
                    boxShadow: `0 0 30px ${accentColor}40`,
                  }}
                >
                  <span className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 group-hover:scale-125 transition-transform">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Yes, I parked here
                  </span>
                  <span className="text-[10px] uppercase tracking-widest opacity-70 font-bold">Session will begin immediately</span>
                </button>

                <button
                  onClick={handleWrongSlot}
                  className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl font-black text-lg text-[#f87171] bg-white/[0.03] border border-white/10 hover:bg-[#f87171]/10 hover:border-[#f87171]/30 transition-all active:scale-95 group"
                >
                  <span className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 group-hover:rotate-90 transition-transform">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
                      <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
                    </svg>
                    Wrong Slot
                  </span>
                  <span className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Re-assign your booking</span>
                </button>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              PHASE: REBOOKING (Wrong Slot Selection)
          ────────────────────────────────────────────────────────────────── */}
          {phase === "rebooking" && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_0.1s_both]">
              <p className="text-sm text-gray-400">
                It's okay! Pick the spot you actually parked your vehicle in below. Your payment and booking will be safely transferred immediately without extra charges.
              </p>

              {/* Level Selector */}
              <div className="flex bg-[#111] border border-white/10 rounded-xl p-1.5 w-max">
                {[1, 2, 3, 4].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => { setActiveLevel(lvl); setNewSlot(null); }}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                      activeLevel === lvl 
                        ? "bg-[#c6ff00] text-[#0f0f0f] shadow-[0_0_15px_rgba(198,255,0,0.3)]" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    Level {lvl}
                  </button>
                ))}
              </div>

              {/* Slot Grid Override */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {layoutSlots.map((baseSlot) => {
                  const dbBooking = activeBookingsOnLevel.find((b) => b.slot_id === baseSlot.id);
                  const isOccupiedStatus = baseSlot.status === "noparking";   // hardware blocked
                  // It's occupied if it's hardcoded blocked OR if a DB booking holds it (and that booking is NOT this exact user's old slot)
                  const isOccupied = isOccupiedStatus || (dbBooking && dbBooking.id !== booking?.bookingId);
                  
                  // The user's original slot
                  const isOldSlot = baseSlot.id === booking?.slotId;
                  const isSelected = newSlot === baseSlot.id;

                  let uiClasses = "bg-[#111] border border-white/[0.06] text-gray-400 hover:border-[#c6ff00]/30 hover:bg-[#c6ff00]/5";
                  if (isOccupied) {
                    uiClasses = "bg-red-500/5 text-gray-600 border border-red-500/10 cursor-not-allowed opacity-50";
                  } else if (isOldSlot) {
                    uiClasses = "bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 cursor-not-allowed";
                  } else if (isSelected) {
                    uiClasses = "bg-[#c6ff00] text-[#0a0a0a] border border-[#c6ff00] shadow-[0_0_20px_rgba(198,255,0,0.3)] font-black scale-[1.02]";
                  }

                  return (
                    <button
                      key={baseSlot.id}
                      disabled={isOccupied || isOldSlot}
                      onClick={() => !isOccupied && !isOldSlot ? setNewSlot(baseSlot.id) : null}
                      className={`h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative ${uiClasses}`}
                    >
                      <span className="text-xl font-black font-mono tracking-tight">{baseSlot.id}</span>
                      <span className="text-[9px] uppercase tracking-widest font-bold">
                        {isOldSlot ? "Old Slot" : isOccupied ? "Taken" : isSelected ? "Selected" : "Available"}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-black rounded-full text-[#c6ff00]">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Confirm Rebooking Button */}
              <button
                disabled={!newSlot}
                onClick={handleConfirmRebooking}
                className={`w-full py-5 rounded-xl font-black text-lg transition-all mt-4 ${
                  newSlot 
                    ? "bg-[#c6ff00] text-[#0a0a0a] hover:shadow-[0_0_30px_rgba(198,255,0,0.4)] hover:scale-[1.01]" 
                    : "bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed"
                }`}
              >
                {newSlot ? `Confirm Move to ${newSlot}` : "Select a slot above"}
              </button>
              
              <button
                onClick={() => setPhase("idle")}
                className="text-xs text-gray-500 hover:text-white transition-colors"
                style={{ alignSelf: "center" }}
              >
                Wait, I actually am in {booking?.slotId}. Go back.
              </button>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────
              PHASE: CONFIRMING / DONE
          ────────────────────────────────────────────────────────────────── */}
          {phase === "confirming" && (
            <div className="flex flex-col items-center justify-center gap-6 py-12 animate-[fadeIn_0.3s_both]">
              <div className="w-16 h-16 rounded-full bg-[#111] border-2 border-[rgba(198,255,0,0.2)] flex items-center justify-center relative">
                <svg className="animate-spin absolute w-full h-full text-[#c6ff00]" style={{ animationDuration: '3s' }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" strokeDasharray="15 30"/>
                </svg>
                <div className="w-8 h-8 rounded-full bg-[#c6ff00] animate-pulse" />
              </div>
              <span className="text-xl font-black text-white px-8 text-center">{newSlot ? `Transferring booking to ${newSlot}…` : "Starting active session…"}</span>
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center justify-center gap-4 py-12 animate-[fadeIn_0.3s_both]">
              <div className="w-20 h-20 rounded-full bg-[#c6ff00] flex items-center justify-center shadow-[0_0_40px_rgba(198,255,0,0.4)] scale-110">
                <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" className="w-10 h-10">
                  <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-center mt-4">
                <span className="text-2xl font-black text-white block">All Set!</span>
                <span className="text-sm text-gray-400 mt-2 block">Your parking session is now strictly active.</span>
              </div>
            </div>
          )}

          {/* Persistent Warning Text for Lockdown */}
          {phase !== "done" && phase !== "confirming" && (
            <div className="border-t border-white/[0.05] pt-6 flex flex-col gap-2">
              <p className="text-center text-[10px] text-gray-600 font-semibold tracking-wide uppercase leading-relaxed">
                <span className="text-yellow-500 align-middle mr-1">🔒</span> 
                Action Required. This screen cannot be closed.
              </p>
              <p className="text-center text-[9px] text-gray-700">
                Security systems require confirmation of physical presence. Automatic billing will commence.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ParkingVerificationModal;
