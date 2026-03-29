import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ParkingSlot from "./ParkingSlot";
import TimeSelector from "./TimeSelector";
import TeslaMapPanel from "./TeslaMapPanel";
import BookingModal from "./BookingModal";
import TicketModal from "./TicketModal";
import Toast, { useToast } from "./Toast";
import { useBookings } from "../hooks/useBookings";
import BookingHistoryPanel from "./BookingHistoryPanel";


// ── Static slot definitions per level ──────────────────────────────────────
const LEVEL_SLOTS = {
  1: [
    { id: "P1-01", status: "available" },
    { id: "P1-02", status: "occupied" },
    { id: "P1-03", status: "available" },
    { id: "P1-04", status: "available" },
    { id: "P1-05", status: "occupied" },
    { id: "P1-06", status: "available" },
  ],
  2: [
    { id: "P2-01", status: "available" },
    { id: "P2-02", status: "available" },
    { id: "P2-03", status: "occupied" },
    { id: "P2-04", status: "noparking" },
    { id: "P2-05", status: "available" },
    { id: "P2-06", status: "occupied" },
  ],
  3: [
    { id: "P3-01", status: "occupied" },
    { id: "P3-02", status: "noparking" },
    { id: "P3-03", status: "available" },
    { id: "P3-04", status: "available" },
    { id: "P3-05", status: "occupied" },
    { id: "P3-06", status: "available" },
  ],
  4: [
    { id: "P4-01", status: "available" },
    { id: "P4-02", status: "available" },
    { id: "P4-03", status: "available" },
    { id: "P4-04", status: "occupied" },
    { id: "P4-05", status: "available" },
    { id: "P4-06", status: "noparking" },
  ],
};

const TIMES = [
  "06:00", "07:00", "08:00", "09:00", "10:00",
  "11:00", "12:00", "13:00", "14:00", "15:00",
  "16:00", "17:00",
];

const PRICE_PER_HOUR = 4.25;

// ── Live Badge ────────────────────────────────────────────────────────────────
const LiveBadge = () => (
  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#c6ff00] bg-[#c6ff00]/10 px-2.5 py-1 rounded-full border border-[#c6ff00]/20">
    <span className="w-1.5 h-1.5 rounded-full bg-[#c6ff00] animate-ping inline-block" />
    Live
  </span>
);

// ── Animated stat chip ─────────────────────────────────────────────────────────
const StatChip = ({ label, value, color, bg }) => {
  const [displayVal, setDisplayVal] = useState(value);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
    setDisplayVal(value);
  }, [value]);

  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${bg} border border-white/5`}>
      <span key={animKey} className={`text-base font-black ${color} animate-[count-up_0.35s_ease_forwards]`}>
        {displayVal}
      </span>
      <span className="text-[9px] text-gray-600 font-medium tracking-widest uppercase">{label}</span>
    </div>
  );
};

// ── Real-time Clock ───────────────────────────────────────────────────────────
const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = time.getHours().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  const ss = time.getSeconds().toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1 font-mono text-xs text-gray-600 bg-[#161616] border border-white/5 rounded-xl px-3 py-1.5">
      <span className="text-white font-bold">{hh}:{mm}</span>
      <span className="text-[#c6ff00] font-black w-5 text-center">{ss}</span>
    </div>
  );
};

// ── Animated Price Display ────────────────────────────────────────────────────
const AnimatedPrice = ({ value }) => {
  const [key, setKey] = useState(0);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value) {
      setKey((k) => k + 1);
      prev.current = value;
    }
  }, [value]);

  return (
    <span key={key} className="text-2xl font-black text-[#c6ff00] animate-[bounce-in_0.4s_ease_forwards]">
      ${value.toFixed(2)}
    </span>
  );
};

// ── Main Dashboard ──────────────────────────────────────────────────────────
const Dashboard = ({ onLogout, session }) => {
  const [activeLevel, setActiveLevel] = useState(1);
  const [slots, setSlots] = useState(LEVEL_SLOTS[1]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [liveStatus, setLiveStatus] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [lastBookingData, setLastBookingData] = useState(null);

  const { toasts, removeToast, success, error, info } = useToast();
  const { bookings, addBooking, confirmBooking, cancelBooking, deleteBooking, getActiveReservation, reservedBookings, getTimedOutBookings } = useBookings(session);

  // ── Live IoT fetch ──────────────────────────────────────────────────────────
  const fetchLiveData = async () => {
    try {
      const res = await axios.get(
        "https://api.thingspeak.com/channels/3317554/feeds.json?results=1"
      );
      const data = res.data.feeds?.[0];
      if (!data) return;
      setLiveStatus([
        data.field1, data.field2, data.field3,
        data.field4, data.field5, data.field6,
      ]);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Timeouts check ──────────────────────────────────────────────────────────
  useEffect(() => {
    const checkTimeouts = setInterval(() => {
      const timedOut = getTimedOutBookings();
      timedOut.forEach((b) => {
        cancelBooking(b.id);
        error("Reservation Expired", `Spot ${b.slotId} cancelled — vehicle not detected in 5min.`);
      });
    }, 10000);
    return () => clearInterval(checkTimeouts);
  }, [getTimedOutBookings, cancelBooking, error]);

  // ── Merge slot data ─────────────────────────────────────────────────────────
  useEffect(() => {
    let base = [...LEVEL_SLOTS[activeLevel]];

    if (activeLevel === 1 && liveStatus.length === 6) {
      reservedBookings.forEach((b) => {
        const fieldIdx = b.level === 1 ? LEVEL_SLOTS[1].findIndex((s) => s.id === b.slotId) : -1;
        if (b.level === 1 && fieldIdx >= 0 && liveStatus[fieldIdx] === "1") {
          confirmBooking(b.id);
          success("Vehicle Detected", `Spot ${b.slotId} confirmed for ${b.vehicleNumber}.`);
        }
      });
      const confirmedBookings = bookings.filter((b) => b.status === "confirmed" && b.level === 1);
      confirmedBookings.forEach((b) => {
        const fieldIdx = b.level === 1 ? LEVEL_SLOTS[1].findIndex((s) => s.id === b.slotId) : -1;
        if (fieldIdx >= 0 && liveStatus[fieldIdx] === "0") {
          cancelBooking(b.id);
          info("Vehicle Departed", `Spot ${b.slotId} is now available again.`);
        }
      });
    }

    const mappedSlots = base.map((s, i) => {
      const res = getActiveReservation(s.id, activeLevel);

      let sensorOccupied = false;
      if (activeLevel === 1 && liveStatus[i] !== undefined) {
        sensorOccupied = liveStatus[i] === "1";
      } else {
        sensorOccupied = s.status === "occupied";
      }

      if (res) {
        if (res.status === "reserved") return { ...s, status: "reserved", reservedAt: res.reservedAt };
        if (res.status === "confirmed") return { ...s, status: "confirmed" };
      }
      if (sensorOccupied) return { ...s, status: "occupied" };
      if (s.status === "noparking") return { ...s, status: "noparking" };
      return { ...s, status: "available" };
    });

    setSlots(mappedSlots);
  }, [activeLevel, liveStatus, bookings, getActiveReservation, reservedBookings, confirmBooking, cancelBooking, success, info]);

  // Fix #7 — clear only slot on level change, keep times
  useEffect(() => {
    setSelectedSlot(null);
  }, [activeLevel]);

  // Fix #3 — toggle deselect on re-click
  const handleSlotClick = (slotId) => {
    setSelectedSlot((prev) => (prev === slotId ? null : slotId));
  };

  const toggleTime = (time) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  // Fix #8 — clear all times
  const clearAllTimes = () => setSelectedTimes([]);

  const totalPrice = selectedTimes.length * PRICE_PER_HOUR;
  const availableCount = slots.filter((s) => s.status === "available").length;
  const occupiedCount = slots.filter((s) => s.status === "occupied").length;

  // Fix #5 — precompute free slots per level for tab badges
  const freeByLevel = Object.fromEntries(
    Object.entries(LEVEL_SLOTS).map(([lvl, slotsArr]) => [
      lvl,
      slotsArr.filter((s) => s.status === "available").length,
    ])
  );

  // Fix #6 — contextual book button label
  const bookBtnReady = selectedSlot && selectedTimes.length > 0;
  const bookBtnLabel = !selectedSlot
    ? "Select a Spot"
    : selectedTimes.length === 0
    ? "Pick a Time"
    : "Book Place";

  const handleOpenModal = () => {
    if (!selectedSlot) return error("No spot selected", "Please choose an available parking spot first.");
    if (selectedTimes.length === 0) return error("No time selected", "Please select at least one hour.");
    setModalOpen(true);
  };

  const handleConfirmBooking = async ({ total, timeRange, duration, name, vehicleNumber, paymentMethod }) => {
    const fieldIndex = activeLevel === 1 ? LEVEL_SLOTS[1].findIndex((s) => s.id === selectedSlot) : 0;
    
    try {
      await addBooking({ slotId: selectedSlot, fieldIndex, level: activeLevel, name, vehicleNumber, times: selectedTimes, timeRange, duration, total });
      
      setModalOpen(false);
      setLastBookingData({ 
        bookingName: name, 
        vehicleNumber, 
        slotId: selectedSlot, 
        level: activeLevel, 
        timeRange, 
        total,
        date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) 
      });
      setTicketModalOpen(true);
    } catch (err) {
      error("Booking Failed", err.message);
    }
  };

  const handleCloseTicket = () => {
    setTicketModalOpen(false);
    success(`Slot Reserved! 🟡`, `Waiting for ${lastBookingData?.vehicleNumber} at ${lastBookingData?.slotId}.`);
    setSelectedSlot(null);
    setSelectedTimes([]);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] overflow-hidden relative selection:bg-[#c6ff00] selection:text-black font-['Inter']">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none opacity-50" />
      <div className="absolute top-0 right-[-100px] w-[500px] h-[500px] bg-[#c6ff00] rounded-full blur-[200px] opacity-[0.03] pointer-events-none mix-blend-screen" />

      <Sidebar onBookingsClick={() => setBookingsOpen(!bookingsOpen)} bookings={bookings} onLogout={onLogout} />

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden min-w-0">

        {/* ── LEFT PANEL ── */}
        <main className="flex flex-col flex-1 max-w-[650px] min-w-[450px] flex-shrink-0 overflow-y-auto p-6 lg:p-8 gap-5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>


            {/* Header */}
            <header className="flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-bold text-white tracking-tight">Central Parking Tower</h1>
                  <LiveBadge />
                </div>
                <p className="text-xs text-gray-600 mt-0.5">Downtown District · Block B-7</p>
              </div>
              {/* Stats + Clock */}
              <div className="flex items-center gap-2">
                <LiveClock />
                <StatChip label="Free" value={availableCount} color="text-[#c6ff00]" bg="bg-[#c6ff00]/5" />
                <StatChip label="Taken" value={occupiedCount} color="text-red-400" bg="bg-red-500/5" />
              </div>
            </header>

            {/* Level Tabs — Fix #5 free-slot badges */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {[1, 2, 3, 4].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setActiveLevel(lvl)}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
                    activeLevel === lvl
                      ? "bg-[#c6ff00] text-[#0f0f0f] border-[#c6ff00] shadow-[0_0_14px_rgba(198,255,0,0.35)]"
                      : "bg-[#161616] text-gray-500 border-white/[0.08] hover:border-[#c6ff00]/40 hover:text-[#c6ff00]"
                  }`}
                >
                  <span>Level {lvl}</span>
                  <span className={`text-[8px] font-semibold mt-0.5 ${
                    activeLevel === lvl ? "text-[#0f0f0f]/70" : "text-gray-600"
                  }`}>{freeByLevel[lvl]} free</span>
                </button>
              ))}
              <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-600">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#c6ff00]" />Free</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Taken</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Reserved</span>
              </div>
            </div>

            {/* Slot label */}
            <div className="flex items-center justify-between flex-shrink-0">
              <h2 className="text-xs font-semibold text-white tracking-wide">Choose a parking spot</h2>
              <span className="text-[10px] text-gray-600">tap to select</span>
            </div>

            {/* Parking Slots */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 flex-shrink-0" style={{ scrollbarWidth: "none" }}>
              {slots.map((slot, index) => (
                <ParkingSlot
                  key={slot.id}
                  slot={slot}
                  selected={selectedSlot === slot.id}
                  onClick={handleSlotClick}
                  index={index}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5 flex-shrink-0" />

            {/* Time Selector */}
            <div className="flex-shrink-0">
              <TimeSelector
                times={TIMES}
                selectedTimes={selectedTimes}
                onToggle={toggleTime}
                onClearAll={clearAllTimes}
              />
            </div>

            {/* Recent Bookings quick peek */}
            {bookings.length > 0 && (
              <div className="flex-shrink-0 bg-white/[0.02] border border-white/5 p-3 rounded-2xl relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#c6ff00] blur-[80px] rounded-full opacity-10 pointer-events-none" />
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Recent Bookings</h3>
                  <span className="text-[9px] text-[#c6ff00] font-bold tracking-widest bg-[#c6ff00]/10 border border-[#c6ff00]/20 px-2.5 py-1 rounded-md">
                    {bookings.filter((b) => b.status === "confirmed").length} ACTIVE
                  </span>
                </div>
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto relative z-10" style={{ scrollbarWidth: "none" }}>
                  {bookings.slice(0, 3).map((b, i) => (
                    <div
                      key={b.id}
                      className="group flex items-center justify-between bg-black/40 hover:bg-[#151515] rounded-xl px-3 py-2 border border-white/[0.03] hover:border-white/10 transition-colors gap-3"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-black text-[#c6ff00] drop-shadow-[0_0_8px_rgba(198,255,0,0.5)]">{b.slotId}</span>
                          <span className="text-[10px] text-gray-500 truncate bg-white/5 rounded px-1.5 py-0.5">{b.timeRange}</span>
                        </div>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest truncate">{b.vehicleNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase ${
                          b.status === "confirmed" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          b.status === "reserved" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                          "bg-gray-500/10 text-gray-400 border border-white/5"
                        }`}>
                          {b.status}
                        </span>
                        {(b.status === "reserved" || b.status === "confirmed") && (
                          <button
                            onClick={() => cancelBooking(b.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-md p-1.5 transition-all outline-none"
                            title="Cancel Booking"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fix #11 — Hint when times selected but no slot picked */}
            {selectedTimes.length > 0 && !selectedSlot && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[#c6ff00]/5 border border-[#c6ff00]/15 rounded-xl animate-[fade-in_0.3s_ease_forwards]">
                <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
                <span className="text-[11px] text-[#c6ff00]/70 font-medium">
                  {selectedTimes.length} hour{selectedTimes.length > 1 ? "s" : ""} selected — now pick a parking spot above
                </span>
              </div>
            )}

            <div className="flex-1" />

            {/* Booking Bar */}
            <div className="flex-shrink-0 bg-[#161616] border border-white/[0.08] rounded-2xl px-4 py-3 flex items-center justify-between gap-3 relative overflow-hidden">
              {/* Shimmer on active */}
              {selectedSlot && selectedTimes.length > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c6ff00]/5 to-transparent animate-[sweep_3s_ease-in-out_infinite] pointer-events-none" />
              )}
              <div className="flex flex-col relative z-10">
                <span className="text-[10px] text-gray-600 font-medium">Total Price</span>
                <div className="flex items-baseline gap-1">
                  <AnimatedPrice value={totalPrice} />
                  {selectedTimes.length > 0 && (
                    <span className="text-[10px] text-gray-600">· {selectedTimes.length}h</span>
                  )}
                </div>
              </div>

              {selectedSlot && (
                <div className="flex flex-col items-center relative z-10">
                  <span className="text-[9px] text-gray-600">Spot</span>
                  <span className="text-sm font-bold text-white">{selectedSlot}</span>
                </div>
              )}

              <button
                onClick={handleOpenModal}
                title={!selectedSlot ? "Select an available parking spot first" : selectedTimes.length === 0 ? "Select at least one time slot" : ""}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 relative z-10 ${
                  bookBtnReady
                    ? "bg-[#c6ff00] text-[#0f0f0f] shadow-[0_0_18px_rgba(198,255,0,0.4)] hover:shadow-[0_0_28px_rgba(198,255,0,0.7)] hover:scale-105 active:scale-95"
                    : "bg-[#1e1e1e] text-gray-500 cursor-default border border-white/5"
                }`}
              >
                {bookBtnLabel}
              </button>
            </div>
          </main>

          {/* ── RIGHT PANEL – Tesla Map ── */}
          <div className="flex-1 p-4 pl-0 min-w-0">
            <TeslaMapPanel
              slots={slots}
              selectedSlot={selectedSlot}
              activeLevel={activeLevel}
              occupiedCount={occupiedCount}
              availableCount={availableCount}
            />
          </div>
        </div>

      {/* ── Booking Modal ── */}
      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmBooking}
        selectedSlot={selectedSlot}
        selectedTimes={selectedTimes}
        level={activeLevel}
        session={session}
      />

      <TicketModal
        isOpen={ticketModalOpen}
        onClose={handleCloseTicket}
        {...(lastBookingData || {})}
      />

      {/* ── Booking History ── */}
      <BookingHistoryPanel
        isOpen={bookingsOpen}
        onClose={() => setBookingsOpen(false)}
        bookings={bookings}
        cancelBooking={cancelBooking}
        deleteBooking={deleteBooking}
      />

      {/* ── Toasts ── */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Dashboard;
