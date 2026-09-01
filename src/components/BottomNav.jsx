import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PawPrint, LayoutDashboard, Users } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/rescue-workspace';

  return (
    <nav className="fixed bottom-0 w-full max-w-md mx-auto left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center px-2 py-3 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <Link 
        to="/" 
        className={`flex flex-col items-center gap-1 p-2 transition-colors ${location.pathname === '/' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-800'}`}
      >
        <PawPrint size={22} />
        <span className="text-[9px] font-bold uppercase tracking-wider">Animals</span>
      </Link>
      
      <Link 
        to="/dashboard" 
        className={`flex flex-col items-center gap-1 p-2 transition-colors ${isDashboardActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-800'}`}
      >
        <LayoutDashboard size={22} />
        <span className="text-[9px] font-bold uppercase tracking-wider">Dashboard</span>
      </Link>
      
      <Link 
        to="/directory" 
        className={`flex flex-col items-center gap-1 p-2 transition-colors ${location.pathname === '/directory' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-800'}`}
      >
        <Users size={22} />
        <span className="text-[9px] font-bold uppercase tracking-wider">Directory</span>
      </Link>
    </nav>
  );
}