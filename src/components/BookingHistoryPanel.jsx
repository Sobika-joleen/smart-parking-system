import React, { useEffect, useState } from "react";

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ message }) => (
  <div className="p-6 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center bg-white/[0.02] gap-3">
    <svg viewBox="0 0 64 64" className="w-10 h-10 opacity-20" fill="none">
      <rect x="8" y="16" width="48" height="36" rx="4" stroke="#c6ff00" strokeWidth="2" />
      <path d="M8 24h48" stroke="#c6ff00" strokeWidth="2" />
      <path d="M20 36h8M36 36h8" stroke="#c6ff00" strokeWidth="2" strokeLinecap="round" />
    </svg>
    <span className="text-xs text-gray-600 font-medium">{message}</span>
  </div>
);

// ── Inline delete confirm ─────────────────────────────────────────────────────
const DeleteConfirm = ({ onConfirm, onCancel }) => (
  <div className="flex items-center gap-2 animate-[fade-in_0.15s_ease_forwards]">
    <span className="text-[10px] text-gray-500">Delete record?</span>
    <button
      onClick={onConfirm}
      className="px-2.5 py-1 rounded-md bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[10px] font-bold border border-red-500/20 transition-all"
    >
      Yes, delete
    </button>
    <button
      onClick={onCancel}
      className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 text-[10px] font-semibold border border-white/10 transition-all"
    >
      Keep
    </button>
  </div>
);

// ── Status color ──────────────────────────────────────────────────────────────
const getStatusColor = (status) => {
  switch (status) {
    case "confirmed": return "text-red-400 bg-red-500/10 border-red-500/20";
    case "reserved":  return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    case "completed": return "text-[#c6ff00] bg-[#c6ff00]/10 border-[#c6ff00]/20";
    default:          return "text-gray-500 bg-gray-500/10 border-white/5";
  }
};

// ── Active Booking Card ───────────────────────────────────────────────────────
const ActiveBookingCard = ({ b, cancelBooking, index }) => (
  <div
    className="card-stagger bg-[#121212] border border-white/5 rounded-2xl p-4 shadow-lg relative overflow-hidden group hover:border-white/10 transition-all duration-300"
    style={{ animationDelay: `${index * 70}ms` }}
  >
    <div className="absolute top-0 right-0 w-24 h-24 bg-[#c6ff00] blur-[60px] opacity-[0.05] pointer-events-none" />
    {/* Status stripe */}
    <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl ${b.status === "confirmed" ? "bg-red-500" : "bg-yellow-500"}`} />

    <div className="flex justify-between items-start mb-3 pl-2">
      <div>
        <span className="text-2xl font-black text-[#c6ff00]">{b.slotId}</span>
        {/* Fix #9 — show booker name */}
        {b.name && (
          <div className="text-[11px] text-white font-semibold mt-0.5">{b.name}</div>
        )}
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">
          {b.timeRange} · {b.duration}hr
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border ${getStatusColor(b.status)}`}>
        {b.status}
      </span>
    </div>

    <div className="flex items-center justify-between mt-4 p-3 bg-black/40 rounded-xl border border-white/5 pl-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] text-gray-500 font-semibold uppercase">Vehicle</span>
        <span className="text-xs font-bold text-white tracking-widest font-mono">{b.vehicleNumber}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-[9px] text-gray-500 uppercase block">Total</span>
          <span className="text-sm font-black text-[#c6ff00]">${Number(b.total || 0).toFixed(2)}</span>
        </div>
        <button
          onClick={() => cancelBooking(b.id)}
          className="px-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold tracking-wider uppercase border border-transparent hover:border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ── Past Booking Card ─────────────────────────────────────────────────────────
const PastBookingCard = ({ b, deleteBooking, index }) => {
  // Fix #1 — inline confirm instead of window.confirm
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className="card-stagger bg-[#121212] border border-white/5 rounded-2xl p-4 flex flex-col relative group opacity-60 hover:opacity-100 transition-all duration-300"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{b.slotId}</span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase border ${getStatusColor(b.status)}`}>
            {b.status}
          </span>
        </div>
        {/* Fix #1 — inline confirm UI */}
        {confirming ? (
          <DeleteConfirm
            onConfirm={() => deleteBooking(b.id)}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete record"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium flex-wrap">
        <span>{b.timeRange}</span>
        <span>·</span>
        <span className="font-mono">{b.vehicleNumber}</span>
        {b.name && <><span>·</span><span className="text-gray-400">{b.name}</span></>}
        <span>·</span>
        <span className="text-[#c6ff00]/50 font-bold">${Number(b.total || 0).toFixed(2)}</span>
      </div>
    </div>
  );
};

// ── Main Panel ────────────────────────────────────────────────────────────────
const BookingHistoryPanel = ({ isOpen, onClose, bookings, cancelBooking, deleteBooking }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  const activeBookings = bookings.filter((b) => b.status === "reserved" || b.status === "confirmed");
  const pastBookings   = bookings.filter((b) => b.status === "cancelled" || b.status === "completed");

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-['Inter']">
      <div
        className="absolute inset-0 cursor-pointer transition-all duration-300"
        style={{ background: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)", backdropFilter: visible ? "blur(4px)" : "blur(0px)" }}
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md h-full bg-[#0d0d0d] border-l border-white/10 shadow-2xl flex flex-col transition-transform ease-out"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)", transitionDuration: "350ms" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#111] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c6ff00]/3 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-lg font-black text-white tracking-wide">Booking History</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeBookings.length} active · {pastBookings.length} past
            </p>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8" style={{ scrollbarWidth: "none" }}>
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Active</h3>
              {activeBookings.length > 0 && (
                <span className="text-[9px] font-bold text-[#c6ff00] bg-[#c6ff00]/10 border border-[#c6ff00]/20 px-2 py-0.5 rounded-full">
                  {activeBookings.length}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {activeBookings.length === 0 ? (
                <EmptyState message="No active reservations" />
              ) : (
                activeBookings.map((b, i) => (
                  <ActiveBookingCard key={b.id} b={b} cancelBooking={cancelBooking} index={i} />
                ))
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Past</h3>
              {pastBookings.length > 0 && (
                <span className="text-[9px] font-bold text-gray-500 bg-gray-500/10 border border-white/5 px-2 py-0.5 rounded-full">
                  {pastBookings.length}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {pastBookings.length === 0 ? (
                <EmptyState message="No past history yet" />
              ) : (
                pastBookings.map((b, i) => (
                  <PastBookingCard key={b.id} b={b} deleteBooking={deleteBooking} index={i} />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BookingHistoryPanel;
