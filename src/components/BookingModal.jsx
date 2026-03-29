import React, { useEffect, useState } from "react";

const PRICE_PER_HOUR = 4.25;
const TAX_RATE = 0.08;

const BookingModal = ({ isOpen, onClose, onConfirm, selectedSlot, selectedTimes, level, session }) => {
  const [name, setName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Auto-fill from session metadata if available
      const metadata = session?.user?.user_metadata || {};
      setName(metadata.full_name || "");
      setVehicleNumber(metadata.vehicle_number || "");
      
      setPaymentMethod("upi");
      setUpiId(metadata.phone_number ? `${metadata.phone_number}@upi` : "");
      setIsProcessing(false);
    }
  }, [isOpen, session]);

  const duration = selectedTimes.length;
  const subtotal = duration * PRICE_PER_HOUR;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const sortedTimes = [...selectedTimes].sort();
  const timeRange =
    sortedTimes.length > 0
      ? `${sortedTimes[0]} – ${sortedTimes[sortedTimes.length - 1].replace(
          /(\d+):/,
          (_, h) => `${(parseInt(h) + 1).toString().padStart(2, "0")}:`
        )}`
      : "";

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  const canConfirm = 
    name.trim() && 
    vehicleNumber.trim() && 
    (paymentMethod === "card" || (paymentMethod === "upi" && upiId.includes("@")));

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onConfirm({ total, timeRange, duration, name, vehicleNumber, paymentMethod });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center font-['Inter']">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isProcessing ? onClose : undefined} />

      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slideUp">
        <div className="bg-[#161616] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#c6ff00] to-transparent" />

          <div className="p-6 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Express Checkout</h2>
                <p className="text-xs text-gray-500 mt-0.5">Your details are pre-filled. Just securely pay to book.</p>
              </div>
              {!isProcessing && (
                <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* User & Spot Quick Info */}
            <div className="bg-[#1e1e1e] rounded-2xl p-4 flex flex-col gap-3 border border-white/5">
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span className="text-white font-bold block">{name || "Guest"}</span>
                  <span className="text-gray-500 text-xs font-mono">{vehicleNumber || "No Vehicle"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#c6ff00] font-black text-lg block">{selectedSlot}</span>
                  <span className="text-gray-500 text-xs">Level {level} · {timeRange}</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("upi")}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  paymentMethod === "upi" ? "bg-[#c6ff00]/10 border-[#c6ff00] shadow-[0_0_15px_rgba(198,255,0,0.15)]" : "bg-[#1e1e1e] border-white/5 hover:bg-white/5 text-gray-500 hover:text-gray-300"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-6 h-6 ${paymentMethod === 'upi' ? 'text-[#c6ff00]' : ''}`}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01" />
                </svg>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${paymentMethod === 'upi' ? 'text-white' : ''}`}>UPI</span>
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  paymentMethod === "card" ? "bg-[#c6ff00]/10 border-[#c6ff00] shadow-[0_0_15px_rgba(198,255,0,0.15)]" : "bg-[#1e1e1e] border-white/5 hover:bg-white/5 text-gray-500 hover:text-gray-300"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-[#c6ff00]' : ''}`}>
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${paymentMethod === 'card' ? 'text-white' : ''}`}>Card</span>
              </button>
            </div>

            {/* Dynamic Payment Input */}
            {paymentMethod === "upi" ? (
              <div className="bg-[#1a1a1a] rounded-xl px-4 py-3 border border-white/5">
                <input
                  type="text"
                  placeholder="e.g. phone@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-gray-600"
                />
              </div>
            ) : (
              <div className="bg-[#1a1a1a] rounded-xl px-4 py-3 border border-white/5 flex gap-2">
                <input type="text" placeholder="Card Number" className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-gray-600" />
                <input type="text" placeholder="MM/YY" className="w-16 bg-transparent text-sm text-white focus:outline-none placeholder-gray-600 text-center border-l border-white/10 pl-2" />
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-xs text-gray-500">Service tax (8%) included</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-semibold">Total</span>
                <span className="text-2xl font-black text-[#c6ff00]">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {!isProcessing && (
                <button onClick={onClose} className="px-6 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 hover:text-white transition-all flex-[0.5]">
                  Cancel
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || isProcessing}
                className={`flex-[1.5] py-4 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden ${
                  canConfirm && !isProcessing
                    ? "bg-[#c6ff00] text-[#0f0f0f] shadow-[0_0_20px_rgba(198,255,0,0.4)] hover:shadow-[0_0_32px_rgba(198,255,0,0.7)] hover:scale-105 active:scale-95"
                    : "bg-[#222] text-gray-500 cursor-not-allowed border border-white/5"
                }`}
              >
                <div className={`flex items-center justify-center gap-2 transition-transform duration-300 ${isProcessing ? "-translate-y-12" : "translate-y-0"}`}>
                  Pay & Get Ticket
                </div>
                <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ${isProcessing ? "translate-y-0" : "translate-y-12"}`}>
                  <svg className="animate-spin h-5 w-5 text-[#0f0f0f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
