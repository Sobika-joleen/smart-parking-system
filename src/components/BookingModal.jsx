import React, { useEffect, useState } from "react";
import { calculateBookingAmount, simulateUPI } from "../services/paymentService";

// ── UPI Simulation Overlay ────────────────────────────────────────────────────
const UpiOverlay = ({ amount, onSuccess, onFail }) => {
  const [stage, setStage] = useState("qr"); // qr | processing | success | failed

  useEffect(() => {
    const t1 = setTimeout(() => setStage("processing"), 900);
    const t2 = setTimeout(() => {
      simulateUPI(amount)
        .then(() => { setStage("success"); setTimeout(onSuccess, 900); })
        .catch(() => { setStage("failed"); setTimeout(onFail, 1200); });
    }, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [amount, onSuccess, onFail]);

  return (
    <div className="absolute inset-0 z-20 bg-[#161616]/97 rounded-3xl flex flex-col items-center justify-center gap-5">
      {stage === "qr" && (
        <>
          <div className="w-28 h-28 bg-white rounded-xl p-2 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-90">
              {[0,1,2,3,4,5,6].map(r => [0,1,2,3,4,5,6].map(c => {
                const b = (r<2&&c<2)||(r<2&&c>4)||(r>4&&c<2)||(r===3&&c===3);
                const f = b || (r+c)%3===0 || (r*c)%2===0 ? "#000" : "transparent";
                return <rect key={`${r}${c}`} x={c*13+3} y={r*13+3} width="11" height="11" fill={f} rx="1"/>;
              }))}
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Scan with any UPI app to pay</p>
            <p className="text-2xl font-black text-[#c6ff00] mt-1">₹{amount.toFixed(2)}</p>
          </div>
        </>
      )}

      {stage === "processing" && (
        <>
          <svg className="animate-spin h-10 w-10 text-[#c6ff00]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-sm text-gray-400">Verifying payment…</p>
        </>
      )}

      {stage === "success" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[#c6ff00]/10 border border-[#c6ff00]/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2.5" className="w-8 h-8">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm font-bold text-[#c6ff00]">Payment Successful!</p>
        </div>
      )}

      {stage === "failed" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-red-400">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-sm font-bold text-red-400">Payment Failed</p>
          <p className="text-xs text-gray-500 mt-1">Please try again</p>
        </div>
      )}
    </div>
  );
};

// ── Main BookingModal ─────────────────────────────────────────────────────────
const BookingModal = ({
  isOpen, onClose, onConfirm,
  selectedSlot, selectedRange = {}, level, session,
  walletBalance = 0,
}) => {
  const [name, setName]                   = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [upiId, setUpiId]                 = useState("");
  const [isProcessing, setIsProcessing]   = useState(false);
  const [showUpi, setShowUpi]             = useState(false);

  useEffect(() => {
    if (isOpen) {
      const meta = session?.user?.user_metadata || {};
      setName(meta.full_name || "");
      setVehicleNumber(meta.vehicle_number || "");
      setPaymentMethod("wallet");
      setUpiId(meta.phone_number ? `${meta.phone_number}@upi` : "");
      setIsProcessing(false);
      setShowUpi(false);
    }
  }, [isOpen, session]);

  // Compute duration + timeRange from selectedRange object
  const startTime = selectedRange?.startTime || "";
  const endTime   = selectedRange?.endTime   || "";
  const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : "";

  const timeToMins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const durationMins = startTime && endTime
    ? Math.max(0, timeToMins(endTime) - timeToMins(startTime))
    : 0;
  const duration = durationMins / 60; // decimal hours
  const { subtotal, tax, total } = calculateBookingAmount(duration);

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && !isProcessing && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, isProcessing]);

  if (!isOpen) return null;

  const walletInsufficient = paymentMethod === "wallet" && walletBalance < total;

  const canConfirm =
    name.trim() &&
    vehicleNumber.trim() &&
    !walletInsufficient &&
    (paymentMethod === "wallet" ||
      (paymentMethod === "upi" && upiId.includes("@")));

  const handleConfirm = () => {
    if (paymentMethod === "upi") {
      setShowUpi(true); // UPI overlay handles the rest
    } else {
      // Wallet — just process
      setIsProcessing(true);
      setTimeout(() => {
        onConfirm({ total, timeRange, duration, name, vehicleNumber, paymentMethod });
      }, 600);
    }
  };

  const handleUpiSuccess = () => {
    setShowUpi(false);
    setIsProcessing(true);
    setTimeout(() => {
      onConfirm({ total, timeRange, duration, name, vehicleNumber, paymentMethod: "upi" });
    }, 400);
  };

  const handleUpiFail = () => {
    setShowUpi(false);
  };

  // Payment option tile helper
  const PayTile = ({ id, label, icon }) => (
    <button
      onClick={() => setPaymentMethod(id)}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
        paymentMethod === id
          ? "bg-[#c6ff00]/10 border-[#c6ff00] shadow-[0_0_12px_rgba(198,255,0,0.15)]"
          : "bg-[#1e1e1e] border-white/5 hover:bg-white/5 text-gray-500 hover:text-gray-300"
      }`}
    >
      <span className={paymentMethod === id ? "text-[#c6ff00]" : ""}>{icon}</span>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${paymentMethod === id ? "text-white" : ""}`}>
        {label}
      </span>
      {id === "wallet" && (
        <span className={`text-[9px] font-semibold mt-0.5 ${
          walletInsufficient ? "text-red-400" : "text-[#c6ff00]/60"
        }`}>
          ₹{walletBalance.toFixed(2)}
        </span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center font-['Inter']">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isProcessing && !showUpi ? onClose : undefined}
      />

      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 animate-slideUp">
        <div className="bg-[#161616] border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative">
          {/* UPI overlay */}
          {showUpi && (
            <UpiOverlay
              amount={total}
              onSuccess={handleUpiSuccess}
              onFail={handleUpiFail}
            />
          )}

          {/* Top accent line */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#c6ff00] to-transparent" />

          <div className="p-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Express Checkout</h2>
                <p className="text-xs text-gray-500 mt-0.5">Details pre-filled · Choose how to pay</p>
              </div>
              {!isProcessing && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
                    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Spot + time info */}
            <div className="bg-[#1e1e1e] rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between items-center">
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

            {/* Payment method selector — 2 columns: Wallet | UPI */}
            <div className="grid grid-cols-2 gap-3">
              <PayTile
                id="wallet"
                label="Wallet"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path strokeLinecap="round" d="M16 2H6a2 2 0 00-2 2v3"/>
                    <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none"/>
                  </svg>
                }
              />
              <PayTile
                id="upi"
                label="UPI"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                    <rect x="2" y="5" width="20" height="14" rx="2"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                    <path d="M8 14h.01M12 14h.01M16 14h.01"/>
                  </svg>
                }
              />
            </div>

            {/* Wallet insufficient warning */}
            {walletInsufficient && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-400 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-xs text-red-400">
                  Insufficient balance. Need ₹{total.toFixed(2)}, have ₹{walletBalance.toFixed(2)}. Recharge wallet or use UPI.
                </span>
              </div>
            )}

            {/* UPI ID input (only when UPI selected) */}
            {paymentMethod === "upi" && (
              <div className="bg-[#1a1a1a] rounded-xl px-4 py-3 border border-white/5 focus-within:border-[#c6ff00]/30 transition-colors">
                <input
                  type="text"
                  placeholder="e.g. phone@upi or number@gpay"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                  className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-gray-600"
                />
              </div>
            )}

            {/* Price breakdown */}
            <div className="border-t border-white/5 pt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Base ({duration.toFixed(1)}hr × ₹30)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Service tax (8%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/5 mt-1">
                <span className="text-sm text-gray-400 font-semibold">Total</span>
                <span className="text-2xl font-black text-[#c6ff00]">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {!isProcessing && (
                <button
                  onClick={onClose}
                  className="px-5 py-3.5 rounded-xl border border-white/10 text-gray-400 text-sm font-semibold hover:bg-white/5 hover:text-white transition-all flex-[0.5]"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || isProcessing}
                className={`flex-[1.5] py-3.5 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden ${
                  canConfirm && !isProcessing
                    ? "bg-[#c6ff00] text-[#0f0f0f] shadow-[0_0_20px_rgba(198,255,0,0.4)] hover:shadow-[0_0_32px_rgba(198,255,0,0.7)] hover:scale-[1.02] active:scale-95"
                    : "bg-[#222] text-gray-500 cursor-not-allowed border border-white/5"
                }`}
              >
                <div className={`flex items-center justify-center gap-2 transition-transform duration-300 ${isProcessing ? "-translate-y-10" : "translate-y-0"}`}>
                  {paymentMethod === "wallet" ? "Pay from Wallet" : "Pay via UPI"} · ₹{total.toFixed(2)}
                </div>
                <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ${isProcessing ? "translate-y-0" : "translate-y-10"}`}>
                  <svg className="animate-spin h-5 w-5 text-[#0f0f0f]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Processing…
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
