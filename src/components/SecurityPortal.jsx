import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import Toast, { useToast } from "./Toast";
import TicketModal from "./TicketModal";

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
const elapsed = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
};

const LEVEL_1_SLOTS = ["P1-01", "P1-02", "P1-03", "P1-04", "P1-05", "P1-06"];

// ── Live clock ────────────────────────────────────────────────────────────────
const LiveClock = () => {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="flex items-baseline gap-1 font-mono">
      <span className="text-2xl font-black text-white">
        {t.getHours().toString().padStart(2, "0")}:{t.getMinutes().toString().padStart(2, "0")}
      </span>
      <span className="text-xl font-black text-[#c6ff00]">{t.getSeconds().toString().padStart(2, "0")}</span>
    </div>
  );
};

// ── Floor slot pill ───────────────────────────────────────────────────────────
const FloorPill = ({ slot, iotVal, logs }) => {
  const isOccupied = iotVal === "1";
  const activeLog = logs.find(l => l.slot_id === slot && l.status === "active");
  const isReserved = !isOccupied && !!activeLog;

  const color = isOccupied
    ? "bg-gradient-to-br from-red-500/20 to-red-900/10 border-red-500/30 shadow-[0_4px_16px_rgba(239,68,68,0.1)]"
    : isReserved
    ? "bg-gradient-to-br from-yellow-500/20 to-yellow-900/10 border-yellow-500/30 shadow-[0_4px_16px_rgba(234,179,8,0.1)]"
    : "bg-gradient-to-br from-[#c6ff00]/15 to-[#c6ff00]/5 border-[#c6ff00]/30 shadow-[0_4px_16px_rgba(198,255,0,0.05)]";

  const textColor = isOccupied ? "text-red-400" : isReserved ? "text-yellow-400" : "text-[#c6ff00]";
  const dot = isOccupied ? "bg-red-500" : isReserved ? "bg-yellow-400 animate-pulse" : "bg-[#c6ff00]";
  const label = isOccupied ? "OCCUPIED" : isReserved ? "RESERVED" : "AVAILABLE";

  return (
    <div className={`flex-1 flex flex-col justify-between min-w-[150px] p-4 rounded-2xl border ${color} transition-all duration-500 relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-3 relative z-10">
        <span className={`text-xl font-black ${textColor} tracking-tight`}>{slot}</span>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/40 border border-white/5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot} ${isOccupied ? 'shadow-[0_0_8px_rgba(239,68,68,0.8)]' : isReserved ? 'shadow-[0_0_8px_rgba(234,179,8,0.8)]' : 'shadow-[0_0_8px_rgba(198,255,0,0.8)]'}`} />
          <span className={`text-[9px] font-bold tracking-widest ${textColor}`}>{label}</span>
        </div>
      </div>
      
      <div className="flex items-end justify-between mt-1 h-8 relative z-10">
        {activeLog ? (
          <div className="flex flex-col">
            <span className="text-sm font-black text-white">{activeLog.vehicle_number}</span>
            {activeLog.driver_name && <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{activeLog.driver_name}</span>}
          </div>
        ) : (
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5 mt-auto pb-0.5">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
             Routable
          </span>
        )}
      </div>

      {/* Decorative gradient overlay */}
      <div className={`absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-[40px] opacity-[0.15] pointer-events-none ${isOccupied ? 'bg-red-500' : isReserved ? 'bg-yellow-500' : 'bg-[#c6ff00]'}`} />
    </div>
  );
};

// ── Log Row ───────────────────────────────────────────────────────────────────
const LogRow = ({ log, onPrint, onCheckout, idx }) => {
  const isActive = log.status === "active";
  return (
    <div
      className="group flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] hover:border-white/10 px-4 py-3 rounded-2xl transition-all duration-150 gap-4"
      style={{ animationDelay: `${idx * 30}ms` }}
    >
      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${isActive ? "bg-[#c6ff00] shadow-[0_0_8px_rgba(198,255,0,0.5)]" : "bg-gray-800"}`} />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-white tracking-wider">{log.vehicle_number}</span>
          <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-lg border border-white/8 font-bold">{log.slot_id}</span>
          {log.driver_name && <span className="text-[10px] text-gray-600 italic">{log.driver_name}</span>}
          {log.isBooking && <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-lg border border-blue-500/20 font-bold">PRE-BOOK</span>}
          {!isActive && <span className="text-[9px] bg-white/5 text-gray-600 px-2 py-0.5 rounded-lg border border-white/5 font-bold">OUT</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-600 mt-1">
          <span>In: {fmtTime(log.entry_time)}</span>
          {log.exit_time && <><span className="text-gray-800">·</span><span>Out: {fmtTime(log.exit_time)}</span></>}
          <span className="text-gray-800">·</span>
          <span>{elapsed(log.entry_time)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={() => onPrint(log)} title="Print Ticket"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-gray-600 hover:text-[#c6ff00] hover:border-[#c6ff00]/30 transition-all">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        {isActive && (
          <button onClick={() => onCheckout(log)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Checkout
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const SecurityPortal = ({ onClose }) => {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const [entryLoading, setEntryLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  const [logs, setLogs] = useState([]);
  const [liveStatus, setLiveStatus] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [totalEntriesToday, setTotalEntriesToday] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [alertLog, setAlertLog] = useState([]);
  const [iotConnected, setIotConnected] = useState(true);
  const alertRef = useRef([]);
  const { toasts, success, error, info, removeToast } = useToast();

  const fetchDailyStats = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("parking_logs").select("*", { count: "exact", head: true }).gte("entry_time", today.toISOString());
      setTotalEntriesToday(count || 0);
    } catch {}
  }, []);

  const pushAlert = useCallback((msg, type = "info") => {
    const entry = { msg, ts: new Date().toISOString(), type };
    alertRef.current = [entry, ...alertRef.current].slice(0, 30);
    setAlertLog([...alertRef.current]);
  }, []);

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await axios.get("https://api.thingspeak.com/channels/3317554/feeds.json?results=1");
      const data = res.data.feeds?.[0];
      if (!data) return;
      setIotConnected(true);
      const newStatus = [data.field1, data.field2, data.field3, data.field4, data.field5, data.field6];
      setLiveStatus(prev => {
        newStatus.forEach((val, i) => {
          if (prev[i] !== undefined && prev[i] !== val) {
            if (val === "1") pushAlert(`🚗 Vehicle detected at ${LEVEL_1_SLOTS[i]}`, "warn");
            if (val === "0") pushAlert(`✅ ${LEVEL_1_SLOTS[i]} vacated`, "ok");
          }
        });
        return newStatus;
      });
    } catch { setIotConnected(false); }
  }, [pushAlert]);

  const fetchLogs = useCallback(async () => {
    try {
      const [{ data: parkingData }, { data: bookingData }] = await Promise.all([
        supabase.from("parking_logs").select("*").order("entry_time", { ascending: false }),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      ]);
      const formattedBookings = (bookingData || [])
        .filter(b => ["reserved", "confirmed", "completed", "parked_unverified"].includes(b.status))
        .map(b => ({
          id: b.id, vehicle_number: b.vehicle_number, slot_id: b.slot_id,
          status: b.status === "completed" ? "completed" : "active",
          entry_time: b.start_time || b.created_at, exit_time: b.actual_end, isBooking: true,
        }));
      const combined = [...(parkingData || []), ...formattedBookings];
      combined.sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));
      setLogs(combined);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchLogs(); fetchLiveData(); fetchDailyStats();
    const iv = setInterval(() => { fetchLiveData(); fetchLogs(); }, 5000);
    return () => clearInterval(iv);
  }, [fetchLogs, fetchLiveData, fetchDailyStats]);

  // ── Manual entry helpers ──
  const getSlotState = (slot, idx) => {
    const iotVal = String(liveStatus[idx] ?? "0");
    const isOccupied = iotVal === "1";
    const isReserved = !isOccupied && !!logs.find(l => l.slot_id === slot && l.status === "active");
    return { isOccupied, isReserved, isFree: !isOccupied && !isReserved };
  };

  const getAutoSlot = () => {
    for (let i = 0; i < LEVEL_1_SLOTS.length; i++) {
      if (getSlotState(LEVEL_1_SLOTS[i], i).isFree) return LEVEL_1_SLOTS[i];
    }
    return null;
  };

  const freeCount = LEVEL_1_SLOTS.filter((s, i) => getSlotState(s, i).isFree).length;

  const handleManualEntry = async (e) => {
    e.preventDefault();
    const vNum = vehicleNumber.trim().toUpperCase();
    if (!vNum) return error("Invalid", "Enter a vehicle number.");
    const slot = autoAssign ? getAutoSlot() : selectedSlot;
    if (!slot) return error(autoAssign ? "No Slots" : "No Slot", autoAssign ? "No free slots." : "Select a slot.");
    setEntryLoading(true);
    try {
      const newLog = { vehicle_number: vNum, entry_time: new Date().toISOString(), slot_id: slot, status: "active", ...(driverName.trim() && { driver_name: driverName.trim() }) };
      const { data, error: err } = await supabase.from("parking_logs").insert([newLog]).select();
      if (err) throw err;
      if (!data?.length) throw new Error("Insert blocked.");
      setConfirmed({ slot, vehicle: vNum, name: driverName.trim() });
      pushAlert(`🚘 Manual entry: ${vNum} → ${slot}`, "ok");
      setLogs(prev => [data[0], ...prev].sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time)));
      fetchDailyStats();
      setTimeout(() => { setConfirmed(null); setVehicleNumber(""); setDriverName(""); setSelectedSlot(null); }, 3500);
    } catch (e) { error("Entry Failed", e.message); }
    finally { setEntryLoading(false); }
  };

  const handleMarkExit = async (log) => {
    try {
      const exitTimeStr = new Date().toISOString();
      if (log.isBooking) {
        const { error: err } = await supabase.from("bookings").update({ actual_end: exitTimeStr, status: "completed" }).eq("id", log.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from("parking_logs").update({ exit_time: exitTimeStr, status: "completed" }).eq("id", log.id);
        if (err) throw err;
      }
      success("Checked Out", `Slot ${log.slot_id} freed.`);
      pushAlert(`🏁 Checkout: ${log.vehicle_number} from ${log.slot_id}`, "ok");
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, status: "completed", exit_time: exitTimeStr } : l));
    } catch (e) { error("Checkout Failed", e.message); }
  };

  const activeCount = logs.filter(l => l.status === "active").length;
  const completedCount = logs.filter(l => l.status === "completed").length;
  const occupiedSensors = liveStatus.filter(v => v === "1").length;

  const filteredLogs = logs.filter(l => {
    const matchSearch = !search || l.vehicle_number?.toLowerCase().includes(search.toLowerCase()) || l.slot_id?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchType = filterType === "all" || (filterType === "manual" ? !l.isBooking : l.isBooking);
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="absolute inset-0 z-50 bg-[#090909] flex flex-col overflow-hidden font-['Inter'] selection:bg-[#c6ff00] selection:text-black">
      {/* Glows */}
      <div className="absolute top-[-100px] left-[30%] w-[500px] h-[300px] bg-[#c6ff00] rounded-full blur-[200px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-0 right-[20%] w-[300px] h-[200px] bg-blue-500 rounded-full blur-[180px] opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/[0.05] bg-[#0a0a0a]/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c6ff00]/10 border border-[#c6ff00]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-[9px] text-gray-600 font-semibold uppercase tracking-[0.25em]">Security Operations Center</p>
              <h1 className="text-sm font-black text-white leading-tight">SOC Dashboard</h1>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${iotConnected ? "border-[#c6ff00]/20 bg-[#c6ff00]/5 text-[#c6ff00]" : "border-red-500/20 bg-red-500/5 text-red-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${iotConnected ? "bg-[#c6ff00] animate-ping" : "bg-red-500"}`} />
            {iotConnected ? "IoT Live" : "IoT Offline"}
          </div>
        </div>

        <LiveClock />

        <div className="flex items-center gap-4">
          {/* Stat pills */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-1 py-1">
            {[
              { label: "Active", val: activeCount, color: "text-[#c6ff00]" },
              { label: "Today", val: totalEntriesToday, color: "text-white" },
              { label: "Sensors", val: `${occupiedSensors}/6`, color: "text-blue-400" },
              { label: "Done", val: completedCount, color: "text-gray-500" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex flex-col items-center px-4 py-1.5 rounded-xl">
                <span className={`text-sm font-black ${color}`}>{val}</span>
                <span className="text-[8px] text-gray-600 uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
          <button onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-bold text-xs border border-white/10 hover:border-white/20 active:scale-95">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="relative z-10 flex-1 overflow-hidden flex">

        {/* ══ LEFT — Manual Entry Form ══ */}
        <aside className="w-[380px] flex-shrink-0 border-r border-white/[0.05] flex flex-col overflow-y-auto p-8 gap-8"
          style={{ scrollbarWidth: "none" }}>

          {/* Section heading */}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-bold mb-1">Manual Vehicle Entry</p>
            <h2 className="text-lg font-black text-white">Register Walk-in</h2>
            <p className="text-xs text-gray-600 mt-1">Assign a parking slot to a vehicle directly</p>
          </div>

          {/* ── Confirmed flash ── */}
          {confirmed && (
            <div className="flex flex-col items-center gap-3 py-6 px-4 rounded-2xl bg-[#c6ff00]/8 border border-[#c6ff00]/25">
              <div className="w-12 h-12 rounded-full bg-[#c6ff00]/15 border border-[#c6ff00]/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2.5" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-[#c6ff00]">Entry Registered!</p>
                {confirmed.name && <p className="text-xs text-gray-500 mt-0.5">{confirmed.name}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-white bg-white/8 px-3 py-1.5 rounded-xl">{confirmed.vehicle}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2" className="w-4 h-4 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" /></svg>
                <span className="text-sm font-black text-[#c6ff00] bg-[#c6ff00]/10 px-3 py-1.5 rounded-xl border border-[#c6ff00]/20">{confirmed.slot}</span>
              </div>
            </div>
          )}

          {/* ── Form ── */}
          {!confirmed && (
            <form onSubmit={handleManualEntry} className="flex flex-col gap-6">
              {/* Vehicle Number */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400">Vehicle Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
                    <rect x="1" y="6" width="22" height="13" rx="2" /><path strokeLinecap="round" d="M5 6V4a1 1 0 011-1h12a1 1 0 011 1v2" />
                  </svg>
                  <input
                    type="text" placeholder="e.g. TN67 8079"
                    value={vehicleNumber}
                    onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                    maxLength={12}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-[#c6ff00]/40 focus:bg-white/[0.05] text-sm font-bold uppercase tracking-widest transition-all"
                  />
                </div>
              </div>

              {/* Driver Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400">Driver Name <span className="text-gray-700 font-normal">(optional)</span></label>
                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none">
                    <path strokeLinecap="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text" placeholder="Full name"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-[#c6ff00]/40 focus:bg-white/[0.05] text-sm transition-all"
                  />
                </div>
              </div>

              {/* Slot Assignment */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-400">Slot Assignment</label>
                  <button type="button" onClick={() => { setAutoAssign(p => !p); setSelectedSlot(null); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${autoAssign ? "bg-[#c6ff00]/10 border-[#c6ff00]/25 text-[#c6ff00]" : "bg-white/5 border-white/10 text-gray-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${autoAssign ? "bg-[#c6ff00] animate-pulse" : "bg-gray-600"}`} />
                    {autoAssign ? "Auto-assign" : "Manual pick"}
                  </button>
                </div>

                {/* Slot grid */}
                <div className="grid grid-cols-3 gap-2">
                  {LEVEL_1_SLOTS.map((slot, i) => {
                    const { isFree, isOccupied, isReserved } = getSlotState(slot, i);
                    const isSelected = !autoAssign && selectedSlot === slot;
                    const willAutoTarget = autoAssign && getAutoSlot() === slot;
                    const clickable = !autoAssign && isFree;

                    let classes = "flex flex-col items-center py-3 px-2 rounded-xl border transition-all duration-200 ";
                    if (isSelected) classes += "bg-[#c6ff00]/15 border-[#c6ff00]/50 shadow-[0_0_12px_rgba(198,255,0,0.2)] scale-105 cursor-pointer";
                    else if (willAutoTarget) classes += "bg-[#c6ff00]/8 border-[#c6ff00]/25 cursor-default";
                    else if (isOccupied) classes += "bg-red-500/8 border-red-500/20 opacity-60 cursor-default";
                    else if (isReserved) classes += "bg-yellow-500/8 border-yellow-500/15 opacity-70 cursor-default";
                    else if (clickable) classes += "bg-white/3 border-white/8 cursor-pointer hover:bg-[#c6ff00]/8 hover:border-[#c6ff00]/25";
                    else classes += "bg-white/3 border-white/8 cursor-default";

                    const numColor = isSelected
                      ? "text-[#c6ff00]"
                      : willAutoTarget ? "text-[#c6ff00]/70"
                      : isOccupied ? "text-red-400"
                      : isReserved ? "text-yellow-400"
                      : "text-gray-400";

                    const sub = isSelected ? "PICK" : willAutoTarget ? "AUTO" : isOccupied ? "OCC" : isReserved ? "RES" : "FREE";

                    return (
                      <button key={slot} type="button"
                        onClick={() => clickable && setSelectedSlot(p => p === slot ? null : slot)}
                        disabled={!clickable && !isSelected}
                        className={classes}>
                        <span className={`text-xs font-black ${numColor}`}>{slot.replace("P1-", "0")}</span>
                        <span className={`text-[8px] font-bold tracking-widest mt-1 ${numColor} opacity-70`}>{sub}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-center text-gray-600">
                  {freeCount > 0 ? (
                    <><span className="text-[#c6ff00] font-bold">{freeCount}</span> free{autoAssign && getAutoSlot() ? ` · auto → ${getAutoSlot()}` : ""}</>
                  ) : <span className="text-red-400 font-bold">No free slots</span>}
                </p>
              </div>

              {/* Submit */}
              <button type="submit" disabled={entryLoading || !vehicleNumber.trim() || (autoAssign ? freeCount === 0 : !selectedSlot)}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-2.5 ${
                  vehicleNumber.trim() && (autoAssign ? freeCount > 0 : selectedSlot) && !entryLoading
                    ? "bg-[#c6ff00] text-black shadow-[0_0_24px_rgba(198,255,0,0.3)] hover:shadow-[0_0_36px_rgba(198,255,0,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-white/5 text-gray-600 border border-white/8 cursor-not-allowed"
                }`}>
                {entryLoading ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 12a8 8 0 018-8" /></svg>Registering…</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {vehicleNumber.trim() && (autoAssign || selectedSlot)
                    ? `Register → ${autoAssign ? (getAutoSlot() || "—") : selectedSlot}`
                    : "Register Entry"}</>
                )}
              </button>
            </form>
          )}

          {/* ── Event Feed ── */}
          {alertLog.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-white/[0.05] pt-6">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Live Events</p>
              <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {alertLog.slice(0, 15).map((a, i) => (
                  <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-[10px] border ${
                    a.type === "warn" ? "bg-yellow-500/5 border-yellow-500/15 text-yellow-400"
                    : a.type === "ok" ? "bg-[#c6ff00]/5 border-[#c6ff00]/15 text-[#c6ff00]"
                    : "bg-white/3 border-white/5 text-gray-500"
                  }`}>
                    <span className="text-gray-600 tabular-nums font-mono flex-shrink-0">{fmtTime(a.ts)}</span>
                    <span className="leading-relaxed">{a.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ══ RIGHT — Floor strip + Logs ══ */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Floor status strip */}
          <div className="flex-shrink-0 border-b border-white/[0.05] p-6 bg-gradient-to-b from-white/[0.02] to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400">
                    <rect x="3" y="3" width="18" height="18" rx="3" /><path strokeLinecap="round" d="M8 17V7h5a3 3 0 010 6H8" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-none">Level 1 Floor Map</h3>
                  <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-widest mt-1 block">Live IoT Sensor Feed</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#111] border border-white/[0.08] px-3 py-1.5 rounded-xl">
                <span className="flex items-center gap-1.5 text-[9px] text-white font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c6ff00] animate-ping inline-block shadow-[0_0_8px_rgba(198,255,0,0.8)]" />
                  Sensors Active
                </span>
              </div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {LEVEL_1_SLOTS.map((slot, i) => (
                <FloorPill key={slot} slot={slot} iotVal={String(liveStatus[i] ?? "0")} logs={logs} />
              ))}
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-white/[0.04] flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input type="text" placeholder="Search vehicle or slot…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#c6ff00]/40 transition-colors" />
            </div>
            {[
              { val: filterStatus, set: setFilterStatus, opts: [["all","All"],["active","Active"],["completed","Done"]] },
              { val: filterType,   set: setFilterType,   opts: [["all","All Types"],["manual","Manual"],["booking","Bookings"]] },
            ].map(({ val, set, opts }, k) => (
              <div key={k} className="flex bg-white/[0.03] border border-white/[0.07] rounded-xl p-0.5">
                {opts.map(([v, label]) => (
                  <button key={v} onClick={() => set(v)}
                    className={`px-3 py-2 text-[11px] font-bold rounded-lg transition-all ${val === v ? "bg-[#c6ff00] text-black" : "text-gray-500 hover:text-white"}`}>
                    {label}
                  </button>
                ))}
              </div>
            ))}
            <button onClick={() => { fetchLogs(); fetchLiveData(); info("Refreshed", "Synced."); }}
              className="w-9 h-9 flex items-center justify-center bg-white/5 border border-white/[0.07] rounded-xl text-gray-600 hover:text-[#c6ff00] hover:border-[#c6ff00]/30 transition-all active:scale-90">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <span className="text-[10px] text-gray-600 ml-auto">{filteredLogs.length} record{filteredLogs.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#c6ff00 transparent" }}>
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-14 h-14 opacity-20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">No records match</p>
                <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all"); }} className="text-xs text-[#c6ff00] hover:underline">Clear filters</button>
              </div>
            ) : filteredLogs.map((log, idx) => (
              <LogRow key={log.id} log={log} idx={idx} onPrint={setSelectedTicket} onCheckout={handleMarkExit} />
            ))}
          </div>
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
      <TicketModal
        isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)}
        bookingName={selectedTicket?.isBooking ? "Pre-Booking Entry" : "Security Walk-in"}
        vehicleNumber={selectedTicket?.vehicle_number} slotId={selectedTicket?.slot_id}
        level={1} timeRange={selectedTicket?.isBooking ? "Pre-booked" : "Walk-in"} total={0}
        date={selectedTicket ? fmtDate(selectedTicket.entry_time) : ""}
      />
    </div>
  );
};

export default SecurityPortal;
