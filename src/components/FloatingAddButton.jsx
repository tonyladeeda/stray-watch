import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function FloatingAddButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Optionally hide the FAB on specific pages (like the add report page itself)
  if (location.pathname === '/report') return null;

  return (
    <button
      onClick={() => navigate('/report')}
      className="fixed bottom-24 right-4 sm:right-[calc(50%-224px+16px)] z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 flex items-center justify-center"
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>
  );
}