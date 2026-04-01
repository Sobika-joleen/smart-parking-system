import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import ParkingSlot from "./ParkingSlot";
import TimeSelector from "./TimeSelector";
import TeslaMapPanel from "./TeslaMapPanel";
import BookingModal from "./BookingModal";
import TicketModal from "./TicketModal";
import Toast, { useToast } from "./Toast";
import ParkingVerificationModal from "./ParkingVerificationModal";
import { useBookings } from "../hooks/useBookings";
import { useWallet } from "../hooks/useWallet";
import { useNotifications } from "../hooks/useNotifications";
import BookingHistoryPanel from "./BookingHistoryPanel";
import WalletPanel from "./WalletPanel";
import {
  calculateOvertime,
  calculateEarlyExitRefund,
  BASE_RATE_PER_HOUR,
} from "../services/paymentService";
import { onNotificationAction } from "../services/notificationService";

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

// ── Live Badge ───────────────────────────────────────────────────────────────
const LiveBadge = () => (
  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#c6ff00] bg-[#c6ff00]/10 px-2.5 py-1 rounded-full border border-[#c6ff00]/20">
    <span className="w-1.5 h-1.5 rounded-full bg-[#c6ff00] animate-ping inline-block" />
    Live
  </span>
);

// ── Animated stat chip ───────────────────────────────────────────────────────
const StatChip = ({ label, value, color, bg }) => {
  const [displayVal, setDisplayVal] = useState(value);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { setAnimKey((k) => k + 1); setDisplayVal(value); }, [value]);
  return (
    <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${bg} border border-white/5`}>
      <span key={animKey} className={`text-base font-black ${color} animate-[count-up_0.35s_ease_forwards]`}>
        {displayVal}
      </span>
      <span className="text-[9px] text-gray-600 font-medium tracking-widest uppercase">{label}</span>
    </div>
  );
};

// ── Real-time Clock ──────────────────────────────────────────────────────────
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

// ── Animated Price Display ───────────────────────────────────────────────────
const AnimatedPrice = ({ value }) => {
  const [key, setKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) { setKey((k) => k + 1); prev.current = value; }
  }, [value]);
  return (
    <span key={key} className="text-2xl font-black text-[#c6ff00] animate-[bounce-in_0.4s_ease_forwards]">
      ₹{value.toFixed(2)}
    </span>
  );
};

// ── Notification Bell ────────────────────────────────────────────────────────
const NotificationBell = ({ count, permissionStatus, onRequest }) => (
  <button
    onClick={permissionStatus !== "granted" ? onRequest : undefined}
    title={permissionStatus !== "granted" ? "Enable push notifications" : "Notifications active"}
    className="relative w-8 h-8 flex items-center justify-center rounded-xl bg-[#161616] border border-white/5 hover:border-[#c6ff00]/30 text-gray-500 hover:text-[#c6ff00] transition-all"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path strokeLinecap="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
    {count > 0 && (
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#c6ff00] text-[#0f0f0f] text-[8px] font-black flex items-center justify-center">
        {count > 9 ? "9+" : count}
      </span>
    )}
    {permissionStatus !== "granted" && (
      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-[#0a0a0a]" />
    )}
  </button>
);

// ── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = ({ onLogout, session, onOpenAdmin }) => {
  const [activeLevel, setActiveLevel]              = useState(1);
  const [slots, setSlots]                          = useState(LEVEL_SLOTS[1]);
  const [selectedSlot, setSelectedSlot]            = useState(null);
  const [selectedTimes, setSelectedTimes]          = useState([]);
  const [liveStatus, setLiveStatus]                = useState([]);
  const [modalOpen, setModalOpen]                  = useState(false);
  const [bookingsOpen, setBookingsOpen]            = useState(false);
  const [walletOpen, setWalletOpen]                = useState(false);
  const [ticketModalOpen, setTicketModalOpen]      = useState(false);
  const [lastBookingData, setLastBookingData]      = useState(null);
  const [verifyModal, setVerifyModal]              = useState(null); // { bookingId, slotId, level, vehicleNumber, name }
  const [notifCount, setNotifCount]                = useState(0);
  const [simulatingSensor, setSimulatingSensor]    = useState(false);

  const { toasts, removeToast, success, error, info } = useToast();

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const {
    bookings,
    addBooking,
    confirmParking,
    reassignSlot,
    markParkedUnverified,
    handleWrongSlot,
    autoAssignSlot,
    triggerReminder,
    cancelBooking,
    activateBooking,
    completeBooking,
    deleteBooking,
    getActiveReservation,
    reservedBookings,
    unverifiedBookings,
    getTimedOutBookings,
    VERIFY_TIMEOUT_MS,
  } = useBookings(session);

  const {
    walletBalance, transactions, addMoney, deductWallet, processRefund,
  } = useWallet(session);

  const {
    permissionStatus,
    requestAndSetup,
    fireParking,
    fireReminder,
    fireCancelled,
    fireWarning,
    fireAutoConf,
  } = useNotifications(session);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const processedSensorActionsRef  = useRef(new Set());
  const lastLiveStatusKeyRef       = useRef(null);
  const warnedBookingsRef          = useRef(new Set());
  const verifyTimersRef            = useRef({}); // bookingId -> { reminder, autoConfirm }
  const pendingVerifyRef           = useRef(new Set()); // prevent double-trigger

  // ── Live IoT fetch ────────────────────────────────────────────────────────
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
    } catch { /* silently fail */ }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── Listen for SW notification action clicks ──────────────────────────────
  useEffect(() => {
    const unsub = onNotificationAction((msg) => {
      const { action, bookingId } = msg;
      if (!bookingId) return;

      if (action === "confirm") {
        handleConfirmParking(bookingId);
      } else if (action === "wrong_slot") {
        handleWrongSlotAction(bookingId);
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcut for Admin Panel ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.shiftKey && e.key === "A" && onOpenAdmin) onOpenAdmin();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenAdmin]);

  // ── 15-minute entry timeout + auto-refund ────────────────────────────────
  useEffect(() => {
    const checkTimeouts = setInterval(async () => {
      const timedOut = getTimedOutBookings();
      for (const b of timedOut) {
        await cancelBooking(b.id);
        fireCancelled({ slotId: b.slotId, bookingId: b.id });
        if (b.paymentMethod === "wallet") {
          const refundAmt = Number(b.amountPaid || b.total || 0);
          if (refundAmt > 0) {
            await processRefund(refundAmt, b.id, `Refund — no arrival at ${b.slotId}`);
            info("Wallet Refunded", `₹${refundAmt.toFixed(2)} returned — no vehicle detected.`);
          }
        }
        error("Reservation Expired", `Spot ${b.slotId} cancelled — no vehicle detected in 15min.`);
      }
    }, 10000);
    return () => clearInterval(checkTimeouts);
  }, [getTimedOutBookings, cancelBooking, processRefund, error, info, fireCancelled]);

  // ── 5-minute expiry warning ───────────────────────────────────────────────
  useEffect(() => {
    const checkWarnings = setInterval(() => {
      const WARN_WINDOW = 5 * 60 * 1000;
      const now = Date.now();
      bookings.forEach((b) => {
        if (b.status === "confirmed" && b.expectedEnd) {
          const timeLeft = new Date(b.expectedEnd).getTime() - now;
          const warnKey  = `warn:${b.id}`;
          if (timeLeft > 0 && timeLeft <= WARN_WINDOW && !warnedBookingsRef.current.has(warnKey)) {
            warnedBookingsRef.current.add(warnKey);
            const minsLeft = Math.ceil(timeLeft / 60000);
            fireWarning({ slotId: b.slotId, bookingId: b.id, minutesLeft: minsLeft });
            info("⏰ Parking Expiring Soon",
              `${b.slotId} expires in ${minsLeft} min. Move vehicle or face overtime.`);
          }
          if (b.status !== "confirmed") warnedBookingsRef.current.delete(warnKey);
        }
      });
    }, 30000);
    return () => clearInterval(checkWarnings);
  }, [bookings, info, fireWarning]);

  // ── Trigger verification flow for a booking ───────────────────────────────
  const triggerVerificationFlow = (booking) => {
    const { id: bookingId, slotId, level, vehicleNumber, name } = booking;

    if (pendingVerifyRef.current.has(bookingId)) return;
    pendingVerifyRef.current.add(bookingId);

    // Fire push notification
    fireParking({ slotId, bookingId, vehicleNumber });
    setNotifCount((c) => c + 1);

    // Open in-app modal for this tab
    setVerifyModal({ bookingId, slotId, level, vehicleNumber, name });

    // Clear any old timers for this booking
    clearVerifyTimers(bookingId);

    // Reminder at 4-minute mark (1 min remaining)
    const reminderTimer = setTimeout(async () => {
      const current = bookings.find((b) => b.id === bookingId);
      if (current?.status !== "parked_unverified") return;
      await triggerReminder(bookingId);
      fireReminder({ slotId, bookingId, minutesLeft: 1 });
      info("⏰ Reminder", `Please confirm your parking at Slot ${slotId} — 1 min left.`);
    }, 4 * 60 * 1000);

    // Auto-confirm after 5 minutes
    const autoTimer = setTimeout(async () => {
      const current = bookings.find((b) => b.id === bookingId);
      if (current?.status !== "parked_unverified") return;
      await autoAssignSlot(bookingId);
      fireAutoConf({ slotId, bookingId });
      pendingVerifyRef.current.delete(bookingId);
      setVerifyModal((prev) => (prev?.bookingId === bookingId ? null : prev));
      success("✅ Auto-Confirmed", `Slot ${slotId} auto-activated after no response.`);
    }, VERIFY_TIMEOUT_MS);

    verifyTimersRef.current[bookingId] = { reminderTimer, autoTimer };
  };

  const clearVerifyTimers = (bookingId) => {
    const timers = verifyTimersRef.current[bookingId];
    if (timers) {
      clearTimeout(timers.reminderTimer);
      clearTimeout(timers.autoTimer);
      delete verifyTimersRef.current[bookingId];
    }
  };

  // ── User confirms parking ─────────────────────────────────────────────────
  const handleConfirmParking = async (bookingId) => {
    clearVerifyTimers(bookingId);
    pendingVerifyRef.current.delete(bookingId);
    await confirmParking(bookingId);
    setVerifyModal((prev) => (prev?.bookingId === bookingId ? null : prev));
    success("✅ Parking Confirmed!", "Your session is now active. Timer has started.");
    setNotifCount(0);
  };

  // ── User says wrong slot ──────────────────────────────────────────────────
  const handleWrongSlotAction = async (bookingId) => {
    clearVerifyTimers(bookingId);
    pendingVerifyRef.current.delete(bookingId);
    await handleWrongSlot(bookingId);
    setVerifyModal((prev) => (prev?.bookingId === bookingId ? null : prev));
    info("↩️ Re-parking Required", "Please park your vehicle in your booked slot and wait for re-detection.");
  };

  // ── Auto-confirm when timer expires in modal ──────────────────────────────
  const handleAutoConfirmFromModal = async () => {
    if (!verifyModal?.bookingId) return;
    const bookingId = verifyModal.bookingId;
    clearVerifyTimers(bookingId);
    pendingVerifyRef.current.delete(bookingId);
    await autoAssignSlot(bookingId);
    fireAutoConf({ slotId: verifyModal.slotId, bookingId });
    setVerifyModal(null);
    success("✅ Auto-Confirmed", `Slot ${verifyModal.slotId} activated after timer expired.`);
  };

  // ── Simulate sensor detection (for non-IoT levels) ───────────────────────
  const handleSimulateSensor = async () => {
    const myBooking = reservedBookings.find(
      (b) => b.userId === session?.user?.id
    );
    if (!myBooking) {
      error("No Booking", "You have no active reserved booking to simulate.");
      return;
    }
    setSimulatingSensor(true);
    await markParkedUnverified(myBooking.id);
    setTimeout(() => {
      triggerVerificationFlow(myBooking);
      setSimulatingSensor(false);
    }, 500);
  };

  // ── Merge slot data with IoT + bookings ──────────────────────────────────
  useEffect(() => {
    const statusKey = liveStatus.join(",");
    if (lastLiveStatusKeyRef.current !== statusKey) {
      processedSensorActionsRef.current = new Set();
      lastLiveStatusKeyRef.current = statusKey;
    }

    let base = [...LEVEL_SLOTS[activeLevel]];

    if (activeLevel === 1 && liveStatus.length === 6) {
      reservedBookings.forEach((b) => {
        const fieldIdx = b.level === 1 ? LEVEL_SLOTS[1].findIndex((s) => s.id === b.slotId) : -1;
        const key = `unverified:${b.id}`;
        if (
          b.level === 1 && fieldIdx >= 0 &&
          liveStatus[fieldIdx] === "1" &&
          !processedSensorActionsRef.current.has(key)
        ) {
          processedSensorActionsRef.current.add(key);
          // New flow: go to parked_unverified instead of direct confirm
          markParkedUnverified(b.id).then(() => {
            triggerVerificationFlow(b);
          });
        }
      });

      const confirmedBookings = bookings.filter((b) => b.status === "confirmed" && b.level === 1);
      confirmedBookings.forEach((b) => {
        const fieldIdx = b.level === 1 ? LEVEL_SLOTS[1].findIndex((s) => s.id === b.slotId) : -1;
        const key = `depart:${b.id}`;
        if (fieldIdx >= 0 && liveStatus[fieldIdx] === "0" &&
          !processedSensorActionsRef.current.has(key)) {
          processedSensorActionsRef.current.add(key);
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
        if (res.status === "reserved")          return { ...s, status: "reserved",          reservedAt: res.reservedAt };
        if (res.status === "parked_unverified") return { ...s, status: "parked_unverified" };
        if (res.status === "confirmed")         return { ...s, status: "confirmed" };
      }
      if (sensorOccupied)        return { ...s, status: "occupied" };
      if (s.status === "noparking") return { ...s, status: "noparking" };
      return { ...s, status: "available" };
    });

    setSlots(mappedSlots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLevel, liveStatus, bookings, getActiveReservation, reservedBookings,
      markParkedUnverified, cancelBooking, success, info, triggerVerificationFlow]);

  useEffect(() => { setSelectedSlot(null); }, [activeLevel]);

  // ── Slot / Time interactions ──────────────────────────────────────────────
  const handleSlotClick  = (slotId) => setSelectedSlot((prev) => (prev === slotId ? null : slotId));
  const toggleTime       = (time)   => setSelectedTimes((prev) =>
    prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]);
  const clearAllTimes    = ()       => setSelectedTimes([]);

  const totalPrice     = selectedTimes.length * BASE_RATE_PER_HOUR;
  const availableCount = slots.filter((s) => s.status === "available").length;
  const occupiedCount  = slots.filter((s) => s.status === "occupied").length;

  const freeByLevel = Object.fromEntries(
    Object.entries(LEVEL_SLOTS).map(([lvl, slotsArr]) => {
      const lvlNum = Number(lvl);
      if (lvlNum === activeLevel) return [lvl, availableCount];
      const activeBookingsForLevel = bookings.filter(
        (b) => b.level === lvlNum && (b.status === "reserved" || b.status === "parked_unverified" || b.status === "confirmed")
      );
      const reservedSlotIds = new Set(activeBookingsForLevel.map((b) => b.slotId));
      const free = slotsArr.filter(
        (s) => s.status === "available" && !reservedSlotIds.has(s.id)
      ).length;
      return [lvl, free];
    })
  );

  const bookBtnReady = selectedSlot && selectedTimes.length > 0;
  const bookBtnLabel = !selectedSlot ? "Select a Spot" : selectedTimes.length === 0 ? "Pick a Time" : "Book Place";

  const handleOpenModal = () => {
    if (!selectedSlot)          return error("No spot selected", "Please choose an available parking spot first.");
    if (selectedTimes.length === 0) return error("No time selected", "Please select at least one hour.");
    setModalOpen(true);
  };

  // ── Booking Confirm (with payment) ────────────────────────────────────────
  const handleConfirmBooking = async ({ total, timeRange, duration, name, vehicleNumber, paymentMethod }) => {
    const fieldIndex  = activeLevel === 1 ? LEVEL_SLOTS[1].findIndex((s) => s.id === selectedSlot) : 0;
    const expectedEnd = new Date(Date.now() + duration * 3600000).toISOString();

    try {
      if (paymentMethod === "wallet") {
        await deductWallet(total, null, `Booking payment · ${selectedSlot}`);
      }
      try {
        await addBooking({
          slotId: selectedSlot, fieldIndex, level: activeLevel,
          name, vehicleNumber, times: selectedTimes, timeRange,
          duration, total, paymentMethod, amountPaid: total, expectedEnd,
        });
      } catch (bookingErr) {
        if (paymentMethod === "wallet") {
          await processRefund(total, null, `Booking failed refund · ${selectedSlot}`);
        }
        throw bookingErr;
      }
      setModalOpen(false);
      setLastBookingData({
        bookingName: name, vehicleNumber, slotId: selectedSlot, level: activeLevel,
        timeRange, total,
        date: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      });
      setTicketModalOpen(true);
    } catch (err) {
      error("Booking Failed", err.message);
    }
  };

  // ── Complete Booking (Exit & Pay) ────────────────────────────────────────
  const handleCompleteBooking = async (bookingId) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    const { extraMinutes, extraCharge } = calculateOvertime(booking.expectedEnd);
    const earlyRefund = extraCharge === 0 ? calculateEarlyExitRefund(booking.expectedEnd) : 0;
    try {
      if (extraCharge > 0) {
        try { await deductWallet(extraCharge, bookingId, `Overtime ${extraMinutes}min · ${booking.slotId}`); }
        catch { info("Overtime via UPI", `Processing ₹${extraCharge.toFixed(2)} overtime payment…`); }
        await completeBooking(bookingId, extraCharge);
        success("Parking Completed", `Overtime: ${extraMinutes}min · ₹${extraCharge.toFixed(2)} charged.`);
      } else {
        if (earlyRefund > 0) {
          await processRefund(earlyRefund, bookingId, `Early exit refund · ${booking.slotId}`);
          success("Parking Completed", `Early exit! ₹${earlyRefund.toFixed(2)} refunded to wallet.`);
        } else {
          success("Parking Completed", `Spot ${booking.slotId} is now free.`);
        }
        await completeBooking(bookingId, 0);
      }
    } catch (err) { error("Completion Failed", err.message); }
  };

  const handleCloseTicket = () => {
    setTicketModalOpen(false);
    success(`Slot Reserved! 🟡`, `Waiting for ${lastBookingData?.vehicleNumber} at ${lastBookingData?.slotId}.`);
    setSelectedSlot(null);
    setSelectedTimes([]);
  };

  const hasReserved  = reservedBookings.some((b) => b.userId === session?.user?.id);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen bg-[#0a0a0a] overflow-hidden relative selection:bg-[#c6ff00] selection:text-black font-['Inter']">
      {/* Background grid */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none opacity-50" />
      <div className="absolute top-0 right-[-100px] w-[500px] h-[500px] bg-[#c6ff00] rounded-full blur-[200px] opacity-[0.03] pointer-events-none mix-blend-screen" />

      <Sidebar
        onBookingsClick={() => setBookingsOpen(!bookingsOpen)}
        bookings={bookings}
        onLogout={onLogout}
        walletBalance={walletBalance}
        onWalletClick={() => setWalletOpen(!walletOpen)}
        session={session}
        onAdminClick={onOpenAdmin}
      />

      {/* ── Main layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-w-0">

        {/* ── LEFT PANEL ── */}
        <main className="flex flex-col w-full lg:flex-1 lg:max-w-[650px] lg:min-w-[450px] flex-shrink-0 lg:overflow-y-auto p-4 sm:p-6 lg:p-8 gap-5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>

          {/* Header */}
          <header className="flex flex-wrap items-center justify-between flex-shrink-0 gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Central Parking Tower</h1>
                <LiveBadge />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">Downtown District · Block B-7</p>
            </div>
            <div className="flex items-center gap-2">
              <LiveClock />
              <NotificationBell
                count={notifCount}
                permissionStatus={permissionStatus}
                onRequest={async () => {
                  const ok = await requestAndSetup();
                  if (ok) {
                    success("🔔 Notifications Enabled!", "You'll get push alerts for parking events.");
                    setNotifCount(0);
                  } else {
                    info("Notifications", "Please allow notifications in browser settings.");
                  }
                }}
              />
              <StatChip label="Free"  value={availableCount} color="text-[#c6ff00]" bg="bg-[#c6ff00]/5" />
              <StatChip label="Taken" value={occupiedCount}  color="text-red-400"   bg="bg-red-500/5" />
            </div>
          </header>

          {/* Level Tabs */}
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
                <span className={`text-[8px] font-semibold mt-0.5 ${activeLevel === lvl ? "text-[#0f0f0f]/70" : "text-gray-600"}`}>
                  {freeByLevel[lvl]} free
                </span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#c6ff00]" />Free</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Taken</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Booked</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />Verifying</span>
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

          {/* Simulate Sensor Button — for demo on any level */}
          {hasReserved && (
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-2xl">
              <div className="flex flex-col flex-1">
                <span className="text-xs font-bold text-blue-400">🔬 Demo: Simulate Sensor Detection</span>
                <span className="text-[10px] text-gray-500 mt-0.5">
                  Triggers the vehicle detection flow for your booking
                </span>
              </div>
              <button
                onClick={handleSimulateSensor}
                disabled={simulatingSensor}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/25 transition-all active:scale-95 disabled:opacity-50"
              >
                {simulatingSensor ? "Triggering…" : "Detect Car"}
              </button>
            </div>
          )}

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
                <div className="flex items-center gap-2">
                  {unverifiedBookings.length > 0 && (
                    <span className="text-[9px] text-blue-400 font-bold tracking-widest bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md animate-pulse">
                      {unverifiedBookings.length} VERIFYING
                    </span>
                  )}
                  <span className="text-[9px] text-[#c6ff00] font-bold tracking-widest bg-[#c6ff00]/10 border border-[#c6ff00]/20 px-2.5 py-1 rounded-md">
                    {bookings.filter((b) => b.status === "confirmed").length} ACTIVE
                  </span>
                </div>
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
                        b.status === "confirmed"         ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                        b.status === "parked_unverified" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse" :
                        b.status === "reserved"          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                        "bg-gray-500/10 text-gray-400 border border-white/5"
                      }`}>
                        {b.status === "confirmed" ? "Active" : b.status === "parked_unverified" ? "Verifying…" : b.status}
                      </span>
                      {/* Re-open verification modal */}
                      {b.status === "parked_unverified" && (
                        <button
                          onClick={() => setVerifyModal({ bookingId: b.id, slotId: b.slotId, level: b.level, vehicleNumber: b.vehicleNumber, name: b.name })}
                          className="text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-md p-1.5 transition-all"
                          title="Open verification"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                            <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
                          </svg>
                        </button>
                      )}
                      {(b.status === "reserved" || b.status === "confirmed") && (
                        <button
                          onClick={() => cancelBooking(b.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-md p-1.5 transition-all outline-none"
                          title="Cancel Booking"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          <div className="flex-shrink-0 bg-[#161616] border border-white/[0.08] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 relative overflow-hidden">
            {selectedSlot && selectedTimes.length > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c6ff00]/5 to-transparent animate-[sweep_3s_ease-in-out_infinite] pointer-events-none" />
            )}
            <div className="flex flex-col relative z-10">
              <span className="text-[10px] text-gray-600 font-medium">Total Price</span>
              <div className="flex items-baseline gap-1">
                <AnimatedPrice value={totalPrice} />
                {selectedTimes.length > 0 && <span className="text-[10px] text-gray-600">· {selectedTimes.length}h</span>}
              </div>
            </div>
            {selectedSlot && (
              <div className="flex flex-col items-center relative z-10">
                <span className="text-[9px] text-gray-600">Spot</span>
                <span className="text-sm font-bold text-white">{selectedSlot}</span>
              </div>
            )}
            <div className="flex flex-col items-center relative z-10">
              <span className="text-[9px] text-gray-600">Wallet</span>
              <span className={`text-sm font-bold ${walletBalance >= totalPrice && totalPrice > 0 ? "text-[#c6ff00]" : "text-gray-400"}`}>
                ₹{walletBalance.toFixed(0)}
              </span>
            </div>
            <button
              onClick={handleOpenModal}
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
        <div className="w-full lg:flex-1 p-4 lg:pl-0 min-w-0 min-h-[450px] lg:min-h-0">
          <TeslaMapPanel
            slots={slots}
            selectedSlot={selectedSlot}
            activeLevel={activeLevel}
            occupiedCount={occupiedCount}
            availableCount={availableCount}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmBooking}
        selectedSlot={selectedSlot}
        selectedTimes={selectedTimes}
        level={activeLevel}
        session={session}
        walletBalance={walletBalance}
      />
      <TicketModal
        isOpen={ticketModalOpen}
        onClose={handleCloseTicket}
        {...(lastBookingData || {})}
      />
      <BookingHistoryPanel
        isOpen={bookingsOpen}
        onClose={() => setBookingsOpen(false)}
        bookings={bookings}
        cancelBooking={cancelBooking}
        deleteBooking={deleteBooking}
        activateBooking={activateBooking}
        completeBooking={handleCompleteBooking}
        onOpenVerify={(b) => setVerifyModal({ bookingId: b.id, slotId: b.slotId, level: b.level, vehicleNumber: b.vehicleNumber, name: b.name })}
      />
      <WalletPanel
        isOpen={walletOpen}
        onClose={() => setWalletOpen(false)}
        walletBalance={walletBalance}
        transactions={transactions}
        addMoney={addMoney}
      />

      {/* ── Parking Verification Modal (Full-Screen Lockdown) ── */}
      <ParkingVerificationModal
        isOpen={!!verifyModal}
        booking={verifyModal}
        bookings={bookings}
        levelSlots={LEVEL_SLOTS}
        onConfirm={() => handleConfirmParking(verifyModal?.bookingId)}
        onRebook={async (newSlotId, newLevel) => {
          await reassignSlot(verifyModal?.bookingId, newSlotId, newLevel);
          success("Rebooked", `Transferred your session to ${newSlotId} safely.`);
          setVerifyModal(null);
        }}
        onAutoConfirm={handleAutoConfirmFromModal}
      />

      {/* Admin Panel is now a separate page, AdminOverridePanel removed from DOM */}

      {/* ── Toasts ── */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Dashboard;
