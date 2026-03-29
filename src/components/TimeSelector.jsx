import React, { useState, useEffect } from "react";

const TIMES = [
  "06:00","07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00",
];

const TimePill = ({ time, isSelected, isPast, onClick }) => (
  <button
    onClick={() => !isPast && onClick(time)}
    disabled={isPast}
    title={isPast ? "This time has already passed" : undefined}
    className={`
      px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
      ${isPast
        ? "bg-transparent border-white/5 text-white/15 cursor-not-allowed line-through decoration-white/10"
        : isSelected
        ? "bg-[#c6ff00] text-[#0f0f0f] border-[#c6ff00] shadow-[0_0_12px_rgba(198,255,0,0.4)] font-semibold"
        : "bg-[#1e1e1e] border-white/10 text-gray-300 hover:border-[#c6ff00]/50 hover:text-[#c6ff00] hover:bg-[#c6ff00]/5"
      }
    `}
  >
    {time}
  </button>
);

const formatDateLabel = (offset) => {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

const TimeSelector = ({ selectedTimes, onToggle, onClearAll, onDayChange }) => {
  const now = new Date();
  const currentHour = now.getHours();

  // Auto-advance to tomorrow if all of today's slots are in the past
  const allTodayPast = TIMES.every((t) => parseInt(t.split(":")[0], 10) <= currentHour);
  const [dayOffset, setDayOffset] = useState(() => (allTodayPast ? 1 : 0));

  // If the clock ticks past the last slot while the page is open, auto-advance
  useEffect(() => {
    if (allTodayPast && dayOffset === 0) {
      setDayOffset(1);
    }
  }, [allTodayPast, dayOffset]);

  // Notify parent when day changes (so it can clear selected times)
  useEffect(() => {
    if (onDayChange) onDayChange(dayOffset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOffset]);

  const handlePrev = () => setDayOffset((d) => Math.max(0, d - 1));
  const handleNext = () => setDayOffset((d) => Math.min(6, d + 1));

  const availableInDay = TIMES.filter((t) => {
    if (dayOffset > 0) return true;           // future day → all available
    return parseInt(t.split(":")[0], 10) > currentHour;
  });

  const isPast = (time) => {
    if (dayOffset > 0) return false;          // future day → nothing is past
    return parseInt(time.split(":")[0], 10) <= currentHour;
  };

  const ChevronLeft = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
  const ChevronRight = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Pick a timeslot</h3>
          {/* Clear all button */}
          {selectedTimes.length > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 px-2 py-0.5 rounded-md transition-all duration-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
              </svg>
              Clear ({selectedTimes.length})
            </button>
          )}
        </div>

        {/* Date navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            disabled={dayOffset === 0}
            className="w-7 h-7 rounded-lg bg-[#1e1e1e] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:border-[#c6ff00]/40 hover:text-[#c6ff00] transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:border-white/[0.08] disabled:hover:text-gray-400"
          >
            <ChevronLeft />
          </button>
          <div className="flex flex-col items-center min-w-[72px]">
            <span className="text-white font-semibold text-xs">{formatDateLabel(dayOffset)}</span>
            {dayOffset === 0 && availableInDay.length > 0 && (
              <span className="text-[8px] text-gray-600">{availableInDay.length} slots left</span>
            )}
            {dayOffset === 0 && availableInDay.length === 0 && (
              <span className="text-[8px] text-red-400">No slots left</span>
            )}
          </div>
          <button
            onClick={handleNext}
            disabled={dayOffset >= 6}
            className="w-7 h-7 rounded-lg bg-[#1e1e1e] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:border-[#c6ff00]/40 hover:text-[#c6ff00] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Auto-advance notice */}
      {dayOffset === 1 && allTodayPast && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#c6ff00]/5 border border-[#c6ff00]/15 rounded-xl">
          <svg viewBox="0 0 24 24" fill="none" stroke="#c6ff00" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-[11px] text-[#c6ff00]/70 font-medium">
            Today's slots have passed — showing tomorrow's availability
          </span>
        </div>
      )}

      {/* Pill grid */}
      <div className="flex flex-wrap gap-2">
        {TIMES.map((time) => (
          <TimePill
            key={time}
            time={time}
            isSelected={selectedTimes.includes(time)}
            isPast={isPast(time)}
            onClick={onToggle}
          />
        ))}
      </div>
    </div>
  );
};

export default TimeSelector;
