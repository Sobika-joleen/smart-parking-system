import React, { useState, useEffect } from "react";
import { simulateUPI } from "../services/paymentService";

// ── Icons ─────────────────────────────────────────────────────────────────────
const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path strokeLinecap="round" d="M16 2H6a2 2 0 00-2 2v3" />
    <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
  </svg>
);

// ── UPI Simulation Overlay ────────────────────────────────────────────────────
const UpiOverlay = ({ amount, onSuccess, onFail }) => {
  const [stage, setStage] = useState("qr"); // qr | processing | success | failed

  useEffect(() => {
    const t1 = setTimeout(() => setStage("processing"), 800);
    const t2 = setTimeout(() => {
      simulateUPI(amount)
        .then(() => { setStage("success"); setTimeout(onSuccess, 900); })
        .catch(() => { setStage("failed"); setTimeout(onFail, 1200); });
    }, 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [amount, onSuccess, onFail]);

  return (
    <div className="absolute inset-0 z-10 bg-[#0d0d0d]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-5 rounded-2xl">
      {stage === "qr" && (
        <>
          <div className="w-24 h-24 bg-white rounded-xl p-2 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Mock QR code blocks */}
              {[0,1,2,3,4,5,6].map(r => [0,1,2,3,4,5,6].map(c => {
                const corner = (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
                const fill = corner || Math.random() > 0.45 ? "#000" : "transparent";
                return <rect key={`${r}${c}`} x={c*14+1} y={r*14+1} width="12" height="12" fill={fill} rx="1" />;
              }))}
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Scan with any UPI app</p>
            <p className="text-xl font-black text-[#c6ff00] mt-1">₹{amount.toFixed(2)}</p>
          </div>
        </>
      )}
      {stage === "processing" && (
        <>
          <svg className="animate-spin h-10 w-10 text-[#c6ff00]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400 font-medium">Processing payment…</p>
        </>
      )}
      {stage === "success" && (
        <div className="flex flex-col items-center gap-3 animate-[bounce-in_0.4s_ease_forwards]">
          <div className="w-14 h-14 rounded-full bg-[#c6ff00]/15 border border-[#c6ff00]/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2.5" className="w-8 h-8">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[#c6ff00]">Payment Successful!</p>
          <p className="text-xs text-gray-500">₹{amount.toFixed(2)} added to wallet</p>
        </div>
      )}
      {stage === "failed" && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-red-400">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-bold text-red-400">Payment Failed</p>
          <p className="text-xs text-gray-500">Please try again</p>
        </div>
      )}
    </div>
  );
};

// ── Transaction Row ───────────────────────────────────────────────────────────
const TxRow = ({ tx }) => {
  const isCredit = tx.type === "credit";
  const isRefund  = tx.type === "refund";

  const color   = isCredit ? "text-emerald-400" : isRefund ? "text-blue-400" : "text-red-400";
  const bg      = isCredit ? "bg-emerald-500/10 border-emerald-500/20" : isRefund ? "bg-blue-500/10 border-blue-500/20" : "bg-red-500/10 border-red-500/20";
  const prefix  = isCredit ? "+" : isRefund ? "↩ " : "−";
  const icon    = isCredit ? "↑" : isRefund ? "↩" : "↓";

  const dateStr = new Date(tx.created_at).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className={`w-7 h-7 rounded-lg ${bg} border flex items-center justify-center flex-shrink-0`}>
        <span className={`text-xs font-black ${color}`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-white truncate">{tx.description}</p>
        <p className="text-[9px] text-gray-600 mt-0.5">{dateStr}</p>
      </div>
      <span className={`text-xs font-black ${color} flex-shrink-0`}>
        {prefix}₹{Number(tx.amount).toFixed(2)}
      </span>
    </div>
  );
};

// ── Preset Amount Button ───────────────────────────────────────────────────────
const PresetBtn = ({ amount, selected, onClick }) => (
  <button
    onClick={() => onClick(amount)}
    className={`py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
      selected
        ? "bg-[#c6ff00] text-[#0f0f0f] border-[#c6ff00] shadow-[0_0_12px_rgba(198,255,0,0.3)]"
        : "bg-white/5 text-gray-400 border-white/10 hover:border-[#c6ff00]/30 hover:text-white"
    }`}
  >
    ₹{amount}
  </button>
);

// ── Main WalletPanel ──────────────────────────────────────────────────────────
const PRESETS = [50, 100, 200, 500];

const WalletPanel = ({ isOpen, onClose, walletBalance = 0, transactions = [], addMoney }) => {
  const [visible, setVisible]       = useState(false);
  const [selectedPreset, setPreset] = useState(null);
  const [customAmt, setCustomAmt]   = useState("");
  const [showUpi, setShowUpi]       = useState(false);
  const [isAdding, setIsAdding]     = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  const rechargeAmount =
    customAmt && Number(customAmt) > 0
      ? Number(customAmt)
      : selectedPreset;

  const handleAddMoney = () => {
    if (!rechargeAmount || rechargeAmount <= 0) return;
    setShowUpi(true);
  };

  const handleUpiSuccess = async () => {
    setShowUpi(false);
    setIsAdding(true);
    try {
      await addMoney(rechargeAmount);
      setPreset(null);
      setCustomAmt("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpiFail = () => {
    setShowUpi(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-['Inter']">
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer transition-all duration-300"
        style={{
          background: visible ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
          backdropFilter: visible ? "blur(4px)" : "blur(0px)",
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md h-full bg-[#0d0d0d] border-l border-white/10 shadow-2xl flex flex-col transition-transform ease-out"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)", transitionDuration: "350ms" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#111] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c6ff00]/3 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
              <WalletIcon /> My Wallet
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Recharge · Pay · Refunds</p>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Balance Card */}
        <div className="mx-6 mt-6 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-[#c6ff00]/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c6ff00] blur-[80px] opacity-10 pointer-events-none" />
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">Available Balance</p>
          <p className="text-4xl font-black text-[#c6ff00] mt-1 drop-shadow-[0_0_20px_rgba(198,255,0,0.4)]">
            ₹{walletBalance.toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-600 mt-2">{transactions.length} transactions</p>
        </div>

        {/* Recharge Section */}
        <div className="mx-6 mt-5 relative">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Add Money</p>

          {/* Preset grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESETS.map((p) => (
              <PresetBtn
                key={p}
                amount={p}
                selected={selectedPreset === p && !customAmt}
                onClick={(v) => { setPreset(v); setCustomAmt(""); }}
              />
            ))}
          </div>

          {/* Custom input */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2 mb-4 focus-within:border-[#c6ff00]/40 transition-colors">
            <span className="text-gray-500 text-sm font-bold">₹</span>
            <input
              type="number"
              min="1"
              placeholder="Custom amount"
              value={customAmt}
              onChange={(e) => { setCustomAmt(e.target.value); setPreset(null); }}
              className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-gray-600"
            />
          </div>

          {/* Add Money button */}
          <button
            onClick={handleAddMoney}
            disabled={!rechargeAmount || rechargeAmount <= 0 || isAdding}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 relative overflow-hidden ${
              rechargeAmount && rechargeAmount > 0
                ? "bg-[#c6ff00] text-[#0f0f0f] shadow-[0_0_18px_rgba(198,255,0,0.35)] hover:shadow-[0_0_28px_rgba(198,255,0,0.6)] hover:scale-[1.02] active:scale-[0.98]"
                : "bg-[#1e1e1e] text-gray-500 cursor-not-allowed border border-white/5"
            }`}
          >
            {isAdding ? "Adding…" : rechargeAmount ? `Add ₹${rechargeAmount} via UPI` : "Select an Amount"}
          </button>

          {/* UPI overlay */}
          {showUpi && (
            <UpiOverlay
              amount={rechargeAmount}
              onSuccess={handleUpiSuccess}
              onFail={handleUpiFail}
            />
          )}
        </div>

        {/* Divider */}
        <div className="mx-6 mt-5 h-px bg-white/5" />

        {/* Transactions */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6" style={{ scrollbarWidth: "none" }}>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
            Transaction History
          </p>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-10 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <span className="text-3xl opacity-20">₹</span>
              <p className="text-xs text-gray-600">No transactions yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {transactions.map((tx) => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPanel;
