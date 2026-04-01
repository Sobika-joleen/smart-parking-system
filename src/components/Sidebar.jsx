import React, { useState } from "react";

// ── Icons ─────────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinejoin="round" strokeLinecap="round"/>
    <path d="M9 21V12h6v9" strokeLinecap="round"/>
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path strokeLinecap="round" d="M16 2H6a2 2 0 00-2 2v3"/>
    <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
  </svg>
);

// ── Active indicator positions ─────────────────────────────────────────────
const INDICATOR_TOP = { dashboard: "82px", history: "122px", wallet: "162px", security: "202px" };

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = ({
  bookings = [],
  onBookingsClick,
  onLogout,
  walletBalance = 0,
  onWalletClick,
  session,
}) => {
  const confirmedCount    = bookings.filter((b) => b.status === "confirmed" || b.status === "parked_unverified").length;
  const unverifiedCount  = bookings.filter((b) => b.status === "parked_unverified").length;
  const [activeItem, setActiveItem]   = useState("dashboard");
  const [logoHovered, setLogoHovered] = useState(false);

  // User initials from session
  const initials = (() => {
    const name = session?.user?.user_metadata?.full_name || "";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  })();

  const navItems = [
    { id: "dashboard", icon: <HomeIcon />, label: "Dashboard", onClick: () => {} },
    {
      id: "history",
      icon: <HistoryIcon />,
      label: "History",
      badge: confirmedCount > 0 ? confirmedCount : null,
      badgePulse: unverifiedCount > 0,
      onClick: onBookingsClick,
    },
    {
      id: "wallet",
      icon: <WalletIcon />,
      label: "Wallet",
      sub: walletBalance > 0 ? `₹${walletBalance % 1 === 0 ? walletBalance : walletBalance.toFixed(0)}` : null,
      onClick: onWalletClick,
    },
  ];

  return (
    <aside className="flex flex-col items-center justify-between w-16 py-5 bg-[#111] border-r border-white/5 flex-shrink-0 h-full relative">
      {/* Active indicator pill */}
      <div
        className="absolute left-0 w-[3px] bg-[#c6ff00] rounded-r-full transition-all duration-300 shadow-[0_0_8px_rgba(198,255,0,0.7)]"
        style={{ top: INDICATOR_TOP[activeItem] || "82px", height: "36px" }}
      />

      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div
          className={`w-9 h-9 rounded-xl bg-[#c6ff00] flex items-center justify-center transition-all duration-300 cursor-pointer ${
            logoHovered
              ? "shadow-[0_0_24px_rgba(198,255,0,0.8)] rotate-6 scale-110"
              : "shadow-[0_0_18px_rgba(198,255,0,0.45)]"
          }`}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
        >
          <span className="text-[#0f0f0f] font-black text-base leading-none">P</span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-1.5">
          {navItems.map((item) => (
            <div key={item.id} className="has-tooltip relative">
              <button
                onClick={() => {
                  setActiveItem(item.id);
                  if (item.onClick) item.onClick();
                }}
                className={`sidebar-icon w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative flex-col gap-0.5 ${
                  item.adminStyle
                    ? activeItem === item.id
                      ? "bg-red-500/20 text-red-400 scale-105 border border-red-500/30"
                      : "text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                    : activeItem === item.id
                    ? "bg-[rgba(198,255,0,0.12)] text-[#c6ff00] scale-105"
                    : "text-gray-600 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.icon}
                {/* Wallet balance micro-badge */}
                {item.id === "wallet" && item.sub && (
                  <span className="text-[7px] font-bold text-[#c6ff00]/60 leading-none">
                    {item.sub}
                  </span>
                )}
                {/* History / unverified count badge */}
                {item.badge && (
                  <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#c6ff00] text-[#0f0f0f] text-[8px] font-black flex items-center justify-center ${
                    item.badgePulse ? "animate-ping" : "animate-bounce"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
              <span className="tooltip absolute left-14 top-1/2 -translate-y-1/2 bg-[#222] text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap border border-white/10 z-50 shadow-lg">
                {item.label}
                {item.id === "wallet" && walletBalance > 0 && (
                  <span className="text-[#c6ff00] font-bold ml-1">₹{walletBalance.toFixed(2)}</span>
                )}
                {item.hint && (
                  <span className="ml-2 text-[9px] text-gray-500 bg-white/5 px-1 rounded">{item.hint}</span>
                )}
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-3">
        {/* Settings */}
        <div className="has-tooltip relative">
          <button className="sidebar-icon w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:text-white transition-all duration-200">
            <SettingsIcon />
          </button>
          <span className="tooltip absolute left-14 top-1/2 -translate-y-1/2 bg-[#222] text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap border border-white/10 z-50">
            Settings
          </span>
        </div>

        {/* Logout */}
        <div className="has-tooltip relative mb-2">
          <button
            onClick={onLogout}
            className="sidebar-icon w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
          >
            <LogoutIcon />
          </button>
          <span className="tooltip absolute left-14 top-1/2 -translate-y-1/2 bg-[#222] text-white text-xs px-2.5 py-1 rounded-lg whitespace-nowrap border border-white/10 z-50 text-red-400 font-bold">
            Sign Out
          </span>
        </div>

        {/* Avatar */}
        <div className="relative">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-700 to-indigo-900 border border-white/10 flex items-center justify-center avatar-online">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#c6ff00] border-2 border-[#111] shadow-[0_0_6px_rgba(198,255,0,0.8)]" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
