import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";

const TicketModal = ({ isOpen, onClose, bookingName, vehicleNumber, slotId, level, timeRange, total, date }) => {
  const [mounted, setMounted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const ticketRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setMounted(true), 10);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#111',
        scale: 2,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `SmartPark-Pass-${slotId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to download ticket", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center font-['Inter']">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500"
        style={{ opacity: mounted ? 1 : 0 }}
      />

      {/* Ticket Container */}
      <div 
        className="relative w-full max-w-sm mx-4 flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
        style={{ 
          opacity: mounted ? 1 : 0, 
          transform: mounted ? "translateY(0) scale(1)" : "translateY(40px) scale(0.95)"
        }}
      >
        
        {/* Confetti / Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[120%] bg-[#c6ff00] blur-[140px] opacity-[0.15] pointer-events-none mix-blend-screen" />

        {/* The Pass */}
        <div ref={ticketRef} className="w-full bg-[#111] rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden border border-white/10 relative z-10">
          
          {/* Header */}
          <div className="bg-[#c6ff00] text-[#0f0f0f] px-6 pt-7 pb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-black uppercase tracking-widest text-black/60">Parking Pass</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-black">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-4xl font-black mt-3 tracking-tighter leading-none">Confirmed</h2>
            <p className="text-sm font-bold opacity-80 mt-2">Central Parking Tower</p>
          </div>

          {/* Scalloped divider */}
          <div className="relative h-6 bg-[#111] -mt-3 flex items-center justify-between before:content-[''] before:absolute before:-left-3 before:w-6 before:h-6 before:rounded-full before:bg-black/80 before:backdrop-blur-md after:content-[''] after:absolute after:-right-3 after:w-6 after:h-6 after:rounded-full after:bg-black/80 after:backdrop-blur-md z-20">
            <div className="w-full border-t-[2px] border-dashed border-white/20 mx-4" />
          </div>

          {/* Details */}
          <div className="px-6 py-6 flex flex-col gap-6 bg-[#111] relative z-20">
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest">Booked By</span>
                <span className="text-sm text-white font-bold">{bookingName || "Guest User"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest">Vehicle</span>
                <span className="text-sm text-white font-black font-mono tracking-wider">{vehicleNumber || "UNKNOWN"}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-widest">Level</span>
                <span className="text-sm text-white font-bold">L{level}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#c6ff00] uppercase font-black tracking-widest">Bay / Spot</span>
                <span className="text-2xl text-[#c6ff00] font-black leading-none">{slotId}</span>
              </div>

              <div className="col-span-2 flex flex-col gap-1 bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-semibold tracking-widest mb-1">
                  <span>Date</span>
                  <span>Duration</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-white">
                  <span>{date || "Today"}</span>
                  <span>{timeRange}</span>
                </div>
              </div>
            </div>

            {/* Total Paid */}
            <div className="flex items-center justify-between border-t border-b border-white/5 py-3 mt-2">
              <span className="text-xs text-gray-400 font-medium">Payment Successful via UPI</span>
              <span className="text-lg font-black text-white">${Number(total || 0).toFixed(2)}</span>
            </div>

            {/* Barcode Mock */}
            <div className="flex flex-col items-center mt-2 opacity-80">
              <div className="w-full flex gap-[3px] justify-center h-12 mb-2">
                {/* Random varying widths for fake barcode */}
                {[...Array(30)].map((_, i) => (
                  <div key={i} className="bg-white" style={{ width: Math.random() > 0.5 ? '2px' : Math.random() > 0.8 ? '6px' : '4px', opacity: Math.random() > 0.3 ? 0.9 : 0.4 }} />
                ))}
              </div>
              <span className="text-[10px] font-mono tracking-[0.2em] text-gray-500">
                {Math.random().toString(36).substring(2, 10).toUpperCase()}-{slotId}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-8 w-full">
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 group relative overflow-hidden bg-white/10 hover:bg-[#c6ff00] border border-white/20 hover:border-[#c6ff00] text-white hover:text-black font-bold text-sm px-6 py-3.5 rounded-full disabled:opacity-50 disabled:hover:bg-white/10 disabled:hover:border-white/20 disabled:hover:text-white"
          >
            {downloading ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            Download Ticket
          </button>
          <button 
            onClick={onClose}
            className="flex-[2] transition-transform hover:scale-105 active:scale-95 group relative overflow-hidden bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm px-10 py-3.5 rounded-full"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
