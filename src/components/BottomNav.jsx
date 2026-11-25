import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PawPrint, LayoutDashboard, Users } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  const isAnimalsActive = path === '/' || path.startsWith('/animal/');
  const isRescueDashboard = path === '/rescue-dashboard';
  const isDashboardActive = path === '/dashboard' || isRescueDashboard;
  const isDirectoryActive = path.startsWith('/directory');

  return (
    <nav className="fixed bottom-0 w-full max-w-md mx-auto left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-socal-sand-border flex justify-around items-center px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-40 shadow-[0_-4px_12px_-2px_rgba(43,58,74,0.06)]">
      <Link
        to="/"
        className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
          isAnimalsActive
            ? 'text-socal-orange bg-socal-orange-light/70'
            : 'text-slate-400 hover:text-socal-ink'
        }`}
      >
        <PawPrint size={22} strokeWidth={isAnimalsActive ? 2.5 : 2} />
        <span className="text-[9px] font-black uppercase tracking-wider">Animals</span>
      </Link>

      <Link
        to="/dashboard"
        className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
          isRescueDashboard
            ? 'text-socal-plum bg-socal-plum-light/80'
            : isDashboardActive
            ? 'text-socal-orange bg-socal-orange-light/70'
            : 'text-slate-400 hover:text-socal-ink'
        }`}
      >
        <LayoutDashboard size={22} strokeWidth={isDashboardActive ? 2.5 : 2} />
        <span className="text-[9px] font-black uppercase tracking-wider">Dashboard</span>
      </Link>

      <Link
        to="/directory"
        className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
          isDirectoryActive
            ? 'text-socal-orange bg-socal-orange-light/70'
            : 'text-slate-400 hover:text-socal-ink'
        }`}
      >
        <Users size={22} strokeWidth={isDirectoryActive ? 2.5 : 2} />
        <span className="text-[9px] font-black uppercase tracking-wider">Directory</span>
      </Link>
    </nav>
  );
}