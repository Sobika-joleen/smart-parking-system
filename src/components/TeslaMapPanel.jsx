import React, { useEffect, useRef, useState } from "react";

// ── Slot positions ──────────────────────────────────────────────────────────────
const SLOT_POSITIONS = {
  top: [
    { id: 0, x: 58,  y: 70,  w: 68, h: 100 },
    { id: 1, x: 140, y: 70,  w: 68, h: 100 },
    { id: 2, x: 222, y: 70,  w: 68, h: 100 },
    { id: 3, x: 304, y: 70,  w: 68, h: 100 },
    { id: 4, x: 386, y: 70,  w: 68, h: 100 },
    { id: 5, x: 468, y: 70,  w: 68, h: 100 },
  ],
  bottom: [
    { id: 0, x: 58,  y: 280, w: 68, h: 100 },
    { id: 1, x: 140, y: 280, w: 68, h: 100 },
    { id: 2, x: 222, y: 280, w: 68, h: 100 },
    { id: 3, x: 304, y: 280, w: 68, h: 100 },
    { id: 4, x: 386, y: 280, w: 68, h: 100 },
    { id: 5, x: 468, y: 280, w: 68, h: 100 },
  ],
};

const ENTRANCE = { x: 5, y: 225 };

function buildPath(slot) {
  if (!slot) return "";
  const cx = slot.x + slot.w / 2;
  const isTopRow = slot.y < 200;
  const targetY = isTopRow ? slot.y + slot.h : slot.y;
  return `M ${ENTRANCE.x} ${ENTRANCE.y} L ${cx} ${ENTRANCE.y} L ${cx} ${targetY}`;
}

// ── Animated nav path ───────────────────────────────────────────────────────────
const AnimatedPath = ({ d }) => (
  <>
    <path d={d} stroke="rgba(198,255,0,0.12)" strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} stroke="#c6ff00" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray="10 6"
      style={{ animation: "dashFlow 0.7s linear infinite" }}
      filter="url(#neonGlow)" />
  </>
);

// ── Animated navigator car ──────────────────────────────────────────────────────
const MapCar = ({ targetSlot }) => {
  const startX = ENTRANCE.x;
  const startY = ENTRANCE.y;
  const [pos, setPos] = useState({ x: startX, y: startY, angle: 90 });
  const animRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (!targetSlot) { setPos({ x: startX, y: startY }); return; }

    const tx = targetSlot.x + targetSlot.w / 2;
    const targetY = targetSlot.y + targetSlot.h / 2;
    const waypoints = [{ x: startX, y: startY }, { x: tx, y: startY }, { x: tx, y: targetY }];

    startTimeRef.current = performance.now();
    const duration = 1600;

    const tick = (now) => {
      const t = Math.max(0, Math.min((now - startTimeRef.current) / duration, 1));
      const eased = 1 - Math.pow(1 - t, 3);
      const total = waypoints.length - 1;
      const raw = eased * total;
      const seg = Math.max(0, Math.min(Math.floor(raw), total - 1));
      const frac = raw - seg;
      const from = waypoints[seg];
      const to = waypoints[seg + 1];

      let angle = 90;
      if (Math.abs(to.x - from.x) > 0.1) angle = to.x > from.x ? 90 : -90;
      else if (Math.abs(to.y - from.y) > 0.1) angle = to.y > from.y ? 180 : 0;

      setPos({ x: from.x + (to.x - from.x) * frac, y: from.y + (to.y - from.y) * frac, angle });
      if (t < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [targetSlot, startX, startY]);

  return (
    <g transform={`translate(${pos.x - 11}, ${pos.y - 16}) rotate(${pos.angle}, 11, 16)`}>
      <ellipse cx="11" cy="34" rx="9" ry="3.5" fill="rgba(198,255,0,0.35)" />
      <rect x="4" y="4"  width="14" height="26" rx="5" fill="#c6ff00" />
      <rect x="6" y="6"  width="10" height="8"  rx="2" fill="rgba(0,0,0,0.5)" />
      <rect x="6" y="20" width="10" height="6"  rx="2" fill="rgba(0,0,0,0.4)" />
      <rect x="0" y="6"  width="5"  height="7"  rx="2" fill="#8fbb00" />
      <rect x="0" y="20" width="5"  height="7"  rx="2" fill="#8fbb00" />
      <rect x="17" y="6"  width="5" height="7"  rx="2" fill="#8fbb00" />
      <rect x="17" y="20" width="5" height="7"  rx="2" fill="#8fbb00" />
      <rect x="5"  y="3"  width="4" height="2"  rx="1" fill="rgba(255,255,200,0.9)" />
      <rect x="13" y="3"  width="4" height="2"  rx="1" fill="rgba(255,255,200,0.9)" />
    </g>
  );
};

// ── Bay Car ─────────────────────────────────────────────────────────────────────
const BayCar = ({ x, y, w, h, occupied, selected, reserved }) => {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const color = occupied ? "#ef4444" : reserved ? "#eab308" : selected ? "#c6ff00" : "#22c55e";
  const wheel = occupied ? "#b91c1c" : reserved ? "#ca8a04" : selected ? "#8fbb00" : "#15803d";
  const opacity = reserved ? 0.3 : 1;

  return (
    <g transform={`translate(${cx - 8}, ${cy - 14})`}>
      <ellipse cx="8" cy="30" rx="8" ry="3" fill={`${color}33`} />
      <rect x="2" y="4"  width="12" height="22" rx="4" fill={color} fillOpacity="0.85" />
      <rect x="4" y="6"  width="8"  height="7"  rx="2" fill="rgba(0,0,0,0.45)" />
      <rect x="4" y="17" width="8"  height="5"  rx="1" fill="rgba(0,0,0,0.35)" />
      <rect x="0" y="6"  width="3"  height="5"  rx="1.5" fill={wheel} opacity={opacity} />
      <rect x="0" y="16" width="3"  height="5"  rx="1.5" fill={wheel} opacity={opacity} />
      <rect x="13" y="6"  width="3" height="5"  rx="1.5" fill={wheel} opacity={opacity} />
      <rect x="13" y="16" width="3" height="5"  rx="1.5" fill={wheel} opacity={opacity} />
      <rect x="3"  y="3"  width="4" height="2"  rx="1" fill={occupied ? "rgba(200,70,70,0.8)" : "rgba(255,255,180,0.9)"} opacity={opacity} />
      <rect x="9"  y="3"  width="4" height="2"  rx="1" fill={occupied ? "rgba(200,70,70,0.8)" : "rgba(255,255,180,0.9)"} opacity={opacity} />
      <rect x="3"  y="25" width="4" height="2"  rx="1" fill={occupied ? "rgba(255,60,60,0.8)" : "rgba(255,255,180,0.5)"} opacity={opacity} />
      <rect x="9"  y="25" width="4" height="2"  rx="1" fill={occupied ? "rgba(255,60,60,0.8)" : "rgba(255,255,180,0.5)"} opacity={opacity} />
    </g>
  );
};

// ── Animated Arc Gauge ──────────────────────────────────────────────────────────
const ArcGauge = ({ value, max, label, unit, color = "#c6ff00", size = 92 }) => {
  const [animVal, setAnimVal] = useState(0);
  const R = 34;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const startAngle = -215;
  const endAngle = 35;
  const totalAngle = endAngle - startAngle;
  const pct = Math.min(animVal / max, 1);
  const angle = startAngle + totalAngle * pct;

  // Animate value on change
  useEffect(() => {
    let frame;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const t = Math.min((now - start) / 800, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimVal(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const toRad = (d) => (d * Math.PI) / 180;
  const pt = (a) => ({ x: cx + R * Math.cos(toRad(a)), y: cy + R * Math.sin(toRad(a)) });
  const ts = pt(startAngle), te = pt(endAngle), fe = pt(angle);
  const tla = totalAngle > 180 ? 1 : 0;
  const fla = totalAngle * pct > 180 ? 1 : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={`M ${ts.x} ${ts.y} A ${R} ${R} 0 ${tla} 1 ${te.x} ${te.y}`}
        fill="none" stroke="#252525" strokeWidth="5" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${ts.x} ${ts.y} A ${R} ${R} 0 ${fla} 1 ${fe.x} ${fe.y}`}
          fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          filter="url(#neonGlow)" style={{ transition: "all 0.7s ease" }} />
      )}
      <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="800" fontFamily="Inter,sans-serif">{animVal}</text>
      <text x={cx} y={cy + 17} textAnchor="middle" fill="#555" fontSize="7" fontFamily="Inter,sans-serif">{unit}</text>
      <text x={cx} y={size - 3} textAnchor="middle" fill="#444" fontSize="7" fontFamily="Inter,sans-serif" letterSpacing="0.8">{label.toUpperCase()}</text>
    </svg>
  );
};

// ── Direction Arrow ─────────────────────────────────────────────────────────────
const DirectionArrow = ({ slotIndex }) => {
  if (slotIndex == null) return null;
  const turns = ["↑", "↖", "↗", "↑", "↖", "↗"];
  const labels = ["Straight", "Slight left", "Slight right", "Straight", "Slight left", "Slight right"];
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-[#c6ff00]/15 border border-[#c6ff00]/30 flex items-center justify-center shadow-[0_0_14px_rgba(198,255,0,0.2)]">
        <span className="text-[#c6ff00] text-xl font-black">{turns[slotIndex] || "↑"}</span>
      </div>
      <div>
        <div className="text-[10px] text-gray-500 tracking-widest uppercase">{labels[slotIndex] || "Ahead"}</div>
      </div>
    </div>
  );
};

// ── Last-updated timer ─────────────────────────────────────────────────────────
const LastUpdated = () => {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-[7px] text-gray-700 font-semibold tracking-widest">
      Updated {secs}s ago
    </span>
  );
};

// ── Main TeslaMapPanel ──────────────────────────────────────────────────────────
const TeslaMapPanel = ({ slots, selectedSlot, activeLevel, occupiedCount }) => {
  const topRow = SLOT_POSITIONS.top;
  const bottomRow = SLOT_POSITIONS.bottom;

  const targetIdx = selectedSlot ? slots.findIndex((s) => s.id === selectedSlot) : -1;
  const targetPos = targetIdx >= 0 ? topRow[targetIdx] : null;
  const navPath = buildPath(targetPos);
  const distance = targetPos ? 20 + targetIdx * 8 : 0;
  const occupancyPct = Math.round((occupiedCount / Math.max(slots.length, 1)) * 100);

  // Bottom row is purely decorative and unbookable; generate static statuses based on level so it doesn't mirror the active row
  const bottomSlotStatuses = slots.map((_, i) => ((i + activeLevel) % 3 === 0) ? "occupied" : "available");

  return (
    <div className="relative flex flex-col h-full bg-[#0d0d0d] rounded-2xl overflow-hidden border border-white/5">

      {/* ── Header overlay ── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-4 pb-8 flex items-start justify-between pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.98) 55%, transparent)" }}>

        {/* Left: direction + distance */}
        <div className="flex items-center gap-3">
          <DirectionArrow slotIndex={targetIdx >= 0 ? targetIdx : null} />
          <div>
            <div className="text-3xl font-black text-white leading-none tracking-tight">
              {distance > 0 ? `${distance}m` : <span className="text-gray-600 text-2xl">Ready</span>}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedSlot ? `Navigating → ${selectedSlot}` : `Level ${activeLevel} · Select a spot`}
            </div>
          </div>
        </div>

        {/* Right: minimap + live chip */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="bg-[#161616] border border-white/[0.08] rounded-xl px-2.5 py-2 flex flex-col items-center gap-1.5">
            <div className="flex gap-1">
              {slots.map((slot, i) => {
                const isSel = slot.id === selectedSlot;
                const isRes = slot.status === "reserved";
                const isOcc = slot.status === "occupied" || slot.status === "confirmed";
                const color = isSel ? "#c6ff00"
                  : isRes ? "#eab308"
                  : isOcc ? "#ef4444"
                  : slot.status === "noparking" ? "#2a2a2a"
                  : "#22c55e";
                return (
                  <div key={i} className="w-3.5 h-5 rounded-sm transition-all duration-500"
                    style={{ backgroundColor: color, boxShadow: isSel ? "0 0 8px rgba(198,255,0,0.9)" : "none" }} />
                );
              })}
            </div>
            <LastUpdated />
          </div>

          {/* Live chip */}
          <div className="flex items-center gap-1.5 bg-[#c6ff00]/10 border border-[#c6ff00]/20 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c6ff00] animate-ping" />
            <span className="text-[8px] text-[#c6ff00] font-bold tracking-widest">LIVE</span>
          </div>
        </div>
      </div>

      {/* ── SVG Map ── */}
      <div className="flex-1 relative">
        <svg viewBox="0 0 595 465" className="w-full h-full" style={{ display: "block" }}>
          <defs>
            <filter id="neonGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="subtleGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="floorGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1c1c1c" />
              <stop offset="100%" stopColor="#111" />
            </radialGradient>
            <pattern id="mapStripes" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#c6ff00" strokeWidth="3" strokeOpacity="0.25" />
            </pattern>
          </defs>

          {/* Floor plate */}
          <rect x="38" y="40" width="520" height="410" rx="14" fill="url(#floorGrad)" stroke="#1e1e1e" strokeWidth="1.5" />

          {/* Grid */}
          {[0,1,2,3,4,5,6,7].map((i) => (
            <line key={`h${i}`} x1="38" y1={40+i*55} x2="558" y2={40+i*55} stroke="#181818" strokeWidth="1" />
          ))}
          {[0,1,2,3,4,5,6,7,8,9].map((i) => (
            <line key={`v${i}`} x1={38+i*58} y1="40" x2={38+i*58} y2="450" stroke="#181818" strokeWidth="1" />
          ))}

          {/* Walls */}
          <rect x="38" y="40"  width="520" height="6" rx="3" fill="#222" />
          <rect x="38" y="444" width="520" height="6" rx="3" fill="#222" />

          {/* Pillars */}
          {[48,178,308,438,540].map((x, i) => (
            <g key={i}>
              <rect x={x} y={44}  width="10" height="10" rx="2" fill="#2a2a2a" stroke="#333" strokeWidth="0.5" />
              <rect x={x} y={435} width="10" height="10" rx="2" fill="#2a2a2a" stroke="#333" strokeWidth="0.5" />
            </g>
          ))}

          {/* Driving aisle */}
          <rect x="38" y="195" width="520" height="60" rx="4" fill="#161616" stroke="#1e1e1e" strokeWidth="1" />
          <line x1="38" y1="225" x2="558" y2="225" stroke="#222" strokeWidth="1" strokeDasharray="12 8" />
          {[90,175,255,335,415,495].map((x) => (
            <g key={x}>
              <polygon points={`${x},215 ${x+5},227 ${x-5},227`} fill="#c6ff00" opacity="0.18" />
            </g>
          ))}
          <text x="295" y="230" textAnchor="middle" fill="#2a2a2a" fontSize="8" fontFamily="Inter" letterSpacing="4" fontWeight="600">DRIVING AISLE</text>

          {/* Entry lane */}
          <rect x="0" y="195" width="38" height="60" rx="4" fill="#131313" stroke="#1e1e1e" />
          <text x="15" y="225" fill="#2e2e2e" fontSize="7" fontFamily="Inter" letterSpacing="2" fontWeight="600" transform="rotate(-90 15,225)" textAnchor="middle">ENTRANCE</text>
          <line x1="0" y1="195" x2="38" y2="195" stroke="#1f1f1f" strokeWidth="1" strokeDasharray="6 4" />
          <line x1="0" y1="255" x2="38" y2="255" stroke="#1f1f1f" strokeWidth="1" strokeDasharray="6 4" />

          {/* ── TOP ROW ── */}
          {topRow.map((pos, i) => {
            const slot = slots[i];
            const isSel = slot?.id === selectedSlot;
            const isRes = slot?.status === "reserved";
            const isOcc = slot?.status === "occupied" || slot?.status === "confirmed";
            const isNP  = slot?.status === "noparking";
            const isFree = slot?.status === "available";

            const fill = isSel ? "rgba(198,255,0,0.2)"
              : isRes ? "rgba(234,179,8,0.15)"
              : isOcc ? "rgba(239,68,68,0.15)"
              : isNP ? "rgba(40,40,40,0.7)"
              : "rgba(34,197,94,0.08)";
            const border = isSel ? "#c6ff00" : isRes ? "#eab308" : isOcc ? "#ef4444" : isNP ? "#282828" : "#22c55e";

            return (
              <g key={`top-${i}`}>
                <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="5"
                  fill={fill} stroke={border} strokeWidth={isSel ? 1.8 : 0.8}
                  style={{ transition: "all 0.4s ease" }}
                  filter={isSel ? "url(#neonGlow)" : undefined} />
                {isNP && <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="5" fill="url(#mapStripes)" />}
                <text x={pos.x+pos.w/2} y={pos.y+12} textAnchor="middle"
                  fill={isSel ? "#c6ff00" : isRes ? "#eab308" : isOcc ? "#f87171" : isNP ? "#333" : "#444"}
                  fontSize="7" fontWeight="700" fontFamily="Inter,sans-serif" letterSpacing="0.5">
                  {slot?.id || pos.id}
                </text>
                {(isOcc || isFree || isSel || isRes) && !isNP && (
                  <BayCar x={pos.x} y={pos.y+12} w={pos.w} h={pos.h-12} occupied={isOcc} selected={isSel} reserved={isRes} />
                )}
                <circle cx={pos.x+pos.w-7} cy={pos.y+7} r="4"
                  fill={isSel?"#c6ff00":isRes?"#eab308":isOcc?"#ef4444":isNP?"#2a2a2a":"#22c55e"}
                  filter={isSel||isFree?"url(#subtleGlow)":undefined} />
                {isNP && <text x={pos.x+pos.w/2} y={pos.y+pos.h/2+4} textAnchor="middle" fill="#333" fontSize="7" fontFamily="Inter">NO PARK</text>}
              </g>
            );
          })}

          {/* ── BOTTOM ROW — driven from real slot data mirrored ── */}
          {bottomRow.map((pos, i) => {
            const st = bottomSlotStatuses[i] || "available";
            const isOcc = st === "occupied" || st === "confirmed";
            const isRes = st === "reserved";
            const isNP  = st === "noparking";
            const isFree = st === "available";
            const fill = isOcc ? "rgba(239,68,68,0.13)" : isRes ? "rgba(234,179,8,0.13)" : isNP ? "rgba(40,40,40,0.7)" : "rgba(34,197,94,0.07)";
            const border = isOcc ? "#ef4444" : isRes ? "#eab308" : isNP ? "#282828" : "#22c55e";
            const rowId = `P${activeLevel}-B${String(i+1).padStart(2,"0")}`;

            return (
              <g key={`bot-${i}`}>
                <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="5"
                  fill={fill} stroke={border} strokeWidth={0.8}
                  style={{ transition: "all 0.4s ease" }} />
                {isNP && <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="5" fill="url(#mapStripes)" />}
                <text x={pos.x+pos.w/2} y={pos.y+12} textAnchor="middle"
                  fill={isOcc?"#f87171":isRes?"#eab308":isNP?"#333":"#444"} fontSize="7" fontWeight="700" fontFamily="Inter,sans-serif">
                  {rowId}
                </text>
                {(isOcc || isFree || isRes) && !isNP && (
                  <BayCar x={pos.x} y={pos.y+12} w={pos.w} h={pos.h-12} occupied={isOcc} selected={false} reserved={isRes} />
                )}
                <circle cx={pos.x+pos.w-7} cy={pos.y+7} r="4"
                  fill={isOcc?"#ef4444":isRes?"#eab308":isNP?"#2a2a2a":"#22c55e"}
                  filter={!isOcc&&!isNP&&!isRes?"url(#subtleGlow)":undefined} />
                {isNP && <text x={pos.x+pos.w/2} y={pos.y+pos.h/2+4} textAnchor="middle" fill="#333" fontSize="7" fontFamily="Inter">NO PARK</text>}
              </g>
            );
          })}

          {/* Navigation path */}
          {selectedSlot && <AnimatedPath d={navPath} />}

          {/* Navigator car */}
          <MapCar targetSlot={targetPos} />
        </svg>
      </div>

      {/* ── Bottom overlay: gauges ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-4 pt-10 flex items-end justify-between pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(10,10,10,0.98) 55%, transparent)" }}>

        <div className="flex items-end gap-3">
          <ArcGauge value={distance} max={80} label="Distance" unit="meters" color="#c6ff00" />
          <ArcGauge
            value={occupancyPct} max={100} label="Occupancy" unit="%"
            color={occupancyPct > 75 ? "#ef4444" : occupancyPct > 50 ? "#f97316" : "#22c55e"} />
          <ArcGauge
            value={slots.filter((s) => s.status === "available").length}
            max={slots.length} label="Free Spots" unit="slots" color="#c6ff00" />
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[9px] text-gray-700 font-semibold tracking-widest uppercase">Central Parking Tower</span>
          <span className="text-sm font-bold text-white">Downtown · Block B-7</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-600">Level {activeLevel}</span>
            <span className="text-gray-700">·</span>
            <span className="text-xs text-gray-600">6 spots / row</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeslaMapPanel;
