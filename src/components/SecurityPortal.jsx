import React, { useState, useEffect } from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import Toast, { useToast } from "./Toast";
import TicketModal from "./TicketModal";

const SecurityPortal = ({ onClose }) => {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [logs, setLogs] = useState([]);
  const [liveStatus, setLiveStatus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [totalEntriesToday, setTotalEntriesToday] = useState(0);
  const [activeTab, setActiveTab] = useState("manual");
  const { toasts, success, error, removeToast } = useToast();

  const LEVEL_1_SLOTS = ["P1-01", "P1-02", "P1-03", "P1-04", "P1-05", "P1-06"];

  useEffect(() => {
    fetchLogs();
    fetchLiveData();
    fetchDailyStats();
    const interval = setInterval(fetchLiveData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchDailyStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("parking_logs")
        .select('*', { count: 'exact', head: true })
        .gte("entry_time", today.toISOString());
      
      setTotalEntriesToday(count || 0);
    } catch {
      // ignore
    }
  };

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

  const fetchLogs = async () => {
    try {
      const { data: parkingData, error: pErr } = await supabase
        .from("parking_logs")
        .select("*")
        .order("entry_time", { ascending: false });
      
      if (pErr) throw pErr;

      const { data: bookingData, error: bErr } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bErr) throw bErr;

      const formattedBookings = (bookingData || [])
        .filter(b => ["reserved", "confirmed", "completed", "parked_unverified"].includes(b.status))
        .map(b => ({
          id: b.id,
          vehicle_number: b.vehicle_number,
          slot_id: b.slot_id,
          status: b.status === "completed" ? "completed" : "active",
          originalStatus: b.status,
          entry_time: b.start_time || b.created_at,
          exit_time: b.actual_end,
          isBooking: true
        }));

      const combinedLogs = [...(parkingData || []), ...formattedBookings];
      combinedLogs.sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));

      setLogs(combinedLogs);
    } catch (err) {
      console.error(err);
    }
  };

  const assignFreeSlot = () => {
    for (let i = 0; i < LEVEL_1_SLOTS.length; i++) {
        // Fallback to "0" (free) if the live status array isn't fully loaded yet
        const iotStatus = String(liveStatus[i] || "0");
        const isAssigned = logs.some(log => log.slot_id === LEVEL_1_SLOTS[i] && log.status === "active");
        
        // If IoT doesn't explicitly declare it occupied ("1") and it hasn't been assigned
        if (iotStatus !== "1" && !isAssigned) {
            return LEVEL_1_SLOTS[i];
        }
    }
    return null;
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) return error("Invalid", "Please enter a vehicle number.");
    
    setLoading(true);
    try {
      const assignedSlot = assignFreeSlot();
      if (!assignedSlot) {
        throw new Error("No available free slots right now.");
      }

      const newLog = {
        vehicle_number: vehicleNumber.toUpperCase(),
        entry_time: new Date().toISOString(),
        slot_id: assignedSlot,
        status: "active"
      };

      const { data, error: err } = await supabase
        .from("parking_logs")
        .insert([newLog])
        .select();
      
      if (err) throw err;
      if (!data || data.length === 0) {
        throw new Error("Supabase blocked the insert. Please verify the SQL policies.");
      }
      
      const insertedRow = data[0];
      success("Vehicle Entered", `Assigned to ${assignedSlot}`);
      setVehicleNumber("");
      
      // prepend and re-sort or just prepend
      setLogs([insertedRow, ...logs].sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time)));
    } catch (err) {
      error("Entry Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkExit = async (log) => {
    try {
      const exitTimeStr = new Date().toISOString();
      
      if (log.isBooking) {
        const { error: err } = await supabase
          .from("bookings")
          .update({
            actual_end: exitTimeStr,
            status: "completed"
          })
          .eq("id", log.id);

        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from("parking_logs")
          .update({
            exit_time: exitTimeStr,
            status: "completed"
          })
          .eq("id", log.id);

        if (err) throw err;
      }
      
      success("Vehicle Exited", `Slot ${log.slot_id} is now freed.`);
      setLogs(logs.map(l => l.id === log.id ? { ...l, status: "completed", exit_time: exitTimeStr } : l));
    } catch (err) {
      error("Exit Update Failed", err.message);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center overflow-y-auto w-full h-full font-['Inter'] selection:bg-[#c6ff00] selection:text-black p-6">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none opacity-50" />
      <div className="absolute top-0 right-[-100px] w-[500px] h-[500px] bg-[#c6ff00] rounded-full blur-[200px] opacity-[0.03] pointer-events-none mix-blend-screen" />

      <div className="w-full max-w-6xl relative z-10 flex flex-col gap-6 mt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Security Portal
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manual entry, ticket generation, and IoT sync</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-xl">
              <div className="flex flex-col px-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Live Traffic</span>
                <span className="text-sm font-black text-[#c6ff00]">{logs.filter(l => l.status === 'active').length} Vehicles</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col px-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Today's Entries</span>
                <span className="text-sm font-black text-white">{totalEntriesToday}</span>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-bold text-sm border border-white/10 hover:border-white/20 active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            {/* Left Col */}
            <div className="flex flex-col gap-6 lg:col-span-1">
                {/* Entry Form */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                        Manual Vehicle Entry
                    </h2>
                    <form onSubmit={handleManualEntry} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Vehicle Number</label>
                            <input 
                                type="text"
                                placeholder="e.g. MH 12 AB 1234"
                                value={vehicleNumber}
                                onChange={(e) => setVehicleNumber(e.target.value)}
                                className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#c6ff00]/50 transition-all font-medium uppercase"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="bg-[#c6ff00] text-black w-full py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(198,255,0,0.5)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? "Registering..." : "Assign & Enter"}
                        </button>
                    </form>
                </div>

                {/* Slot Status Map */}
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                            Live Sensor Data
                        </span>
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c6ff00] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c6ff00]"></span>
                        </span>
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {LEVEL_1_SLOTS.map((slot, i) => {
                            const rawVal = liveStatus[i];
                            const iotVal = rawVal === undefined ? "0" : String(rawVal);
                            const isAssigned = logs.some(log => log.slot_id === slot && log.status === "active");
                            // If IoT says 1, it's occupied physically. If assigned by us, we show it's booked.
                            
                            let statusText = "Free";
                            let colorClass = "border-[#c6ff00]/20 bg-[#c6ff00]/5 text-[#c6ff00]";
                            
                            if (iotVal === "1") {
                                statusText = "Occupied";
                                colorClass = "border-red-500/20 bg-red-500/5 text-red-500";
                            } 
                            if (isAssigned && iotVal === "0") {
                                statusText = "Reserved (Waiting)";
                                colorClass = "border-yellow-500/20 bg-yellow-500/5 text-yellow-500";
                            }

                            return (
                                <div key={slot} className={`flex flex-col items-center p-3 rounded-xl border ${colorClass} transition-colors`}>
                                    <span className="font-bold text-lg">{slot}</span>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest mt-1">{statusText}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Col / Active Vehicles List */}
            <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col h-[70vh] lg:h-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/></svg>
                        Vehicle Logs ({logs.length})
                    </h2>
                    
                    <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setActiveTab("manual")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === "manual" ? "bg-[#c6ff00] text-black shadow-sm" : "text-gray-400 hover:text-white"}`}
                        >
                            Manual Entries ({logs.filter(l => !l.isBooking).length})
                        </button>
                        <button
                            onClick={() => setActiveTab("booking")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === "booking" ? "bg-[#c6ff00] text-black shadow-sm" : "text-gray-400 hover:text-white"}`}
                        >
                            Prior Bookings ({logs.filter(l => l.isBooking).length})
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                    {logs.filter(l => activeTab === "manual" ? !l.isBooking : l.isBooking).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-16 h-16 opacity-30"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            <p className="text-sm font-medium">No {activeTab === "manual" ? "manual" : "booking"} logs found</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {logs.filter(l => activeTab === "manual" ? !l.isBooking : l.isBooking).map((log) => (
                                <div key={log.id} className="group relative bg-[#1a1a1a] border border-white/5 hover:border-white/15 p-4 rounded-xl flex items-center justify-between transition-all">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-white font-black tracking-wider text-base">{log.vehicle_number}</span>
                                            <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded uppercase font-semibold border border-white/10">
                                                Slot {log.slot_id}
                                            </span>
                                            {log.status === "completed" && (
                                                <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase font-semibold border border-red-500/20">
                                                    Checked Out
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            Entry: {new Date(log.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {log.exit_time && (
                                                <>
                                                    <span className="text-gray-600">|</span>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                    Exit: {new Date(log.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setSelectedTicket(log)}
                                            className="bg-white/5 text-white border border-white/10 px-3 py-2 rounded-lg font-bold text-sm hover:bg-[#c6ff00] hover:text-black hover:border-[#c6ff00] transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                            Print
                                        </button>
                                        {log.status === "active" && (
                                            <button 
                                                onClick={() => handleMarkExit(log)} 
                                                className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white transition-all active:scale-95"
                                            >
                                                Checkout
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
      <Toast toasts={toasts} removeToast={removeToast} />
      
      {/* ── Ticket Modal ── */}
      <TicketModal 
        isOpen={!!selectedTicket} 
        onClose={() => setSelectedTicket(null)}
        bookingName={selectedTicket?.isBooking ? "Pre-Booking Entry" : "Security Walk-in"}
        vehicleNumber={selectedTicket?.vehicle_number}
        slotId={selectedTicket?.slot_id}
        level={1}
        timeRange={selectedTicket?.isBooking ? "Pre-booked Route" : "Security Manual Entry"}
        total={0}
        date={selectedTicket ? new Date(selectedTicket.entry_time).toLocaleDateString() : ""}
      />
    </div>
  );
};

export default SecurityPortal;
