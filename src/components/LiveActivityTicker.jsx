import React from "react";

// ── IoT activity events for the ticker ────────────────────────────────────────
const TICKER_EVENTS = [
  { icon: "🟢", text: "P1-03 · Available · Sensor clear" },
  { icon: "🔴", text: "P2-05 · Occupied · TN07-AB1234 detected" },
  { icon: "🟡", text: "P1-01 · Reserved · 5-min window started" },
  { icon: "✅", text: "P3-04 · Booking confirmed · Vehicle arrived" },
  { icon: "🔴", text: "P1-02 · Occupied · TN09-XZ4567 detected" },
  { icon: "🟢", text: "P4-06 · Available · Vehicle departed" },
  { icon: "🟡", text: "P2-01 · Reserved · Booking #BK-8821" },
  { icon: "✅", text: "P3-01 · Confirmed · MH12-CD3344" },
  { icon: "⚠️", text: "P1-05 · Timeout · Booking auto-cancelled" },
  { icon: "🔴", text: "P4-02 · Occupied · TN22-GH9900 detected" },
];

const LiveActivityTicker = () => {
  const doubled = [...TICKER_EVENTS, ...TICKER_EVENTS];

  return (
    <div className="ticker-wrap w-full border-y border-white/[0.04] bg-black/30 backdrop-blur-sm py-1.5 overflow-hidden">
      <div className="ticker-content gap-0">
        {doubled.map((ev, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6 text-[10px] font-semibold text-gray-500 whitespace-nowrap">
            <span>{ev.icon}</span>
            <span className="font-mono tracking-wide">{ev.text}</span>
            <span className="text-gray-700 mx-2">·</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default LiveActivityTicker;
