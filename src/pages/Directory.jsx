import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, Heart, ChevronRight, Phone, Mail, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Directory() {
  const [activeTab, setActiveTab] = useState('Rescues');
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryData, setDirectoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVerifiedRescue, setIsVerifiedRescue] = useState(false);

  useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async () => {
    setLoading(true);
    
    // Check if user is a verified rescue to show the Foster tab
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: rescueData } = await supabase
        .from('rescue_partners')
        .select('is_verified')
        .eq('user_id', session.user.id)
        .single();
        
      if (rescueData?.is_verified) {
        setIsVerifiedRescue(true);
      }
    }

    const { data, error } = await supabase
      .from('directory_profiles')
      .select('*')
      .order('name', { ascending: true });
      
    if (!error && data) {
      setDirectoryData(data);
    }
    setLoading(false);
  };

  const filteredData = directoryData.filter(item => {
    const tabMatch = activeTab === 'All' || item.type + 's' === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return tabMatch && matchesSearch;
  });

  const CATEGORIES = isVerifiedRescue ? ['All', 'Rescues', 'Fosters'] : ['Rescues'];

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <div className="bg-white p-4 border-b border-slate-200 sticky top-[72px] z-10 shadow-sm space-y-3">
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Community Directory</h1>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search organizations or fosters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 p-2.5 pl-9 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
          />
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        </div>

        {isVerifiedRescue && (
          <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-1">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${activeTab === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="p-4 space-y-3">
        {loading ? (
          <div className="text-center p-8 text-slate-500 font-bold text-sm">Loading directory...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center p-8 text-slate-500 font-bold text-sm">No results found.</div>
        ) : (
          filteredData.map(item => (
            <Link 
              key={item.id} 
              to={`/directory/${item.id}`}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors flex items-center justify-between group relative overflow-hidden"
            >
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  {item.type === 'Rescue' ? <ShieldCheck size={16} className="text-blue-600" /> : <Heart size={16} className="text-rose-600" />}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.type}</span>
                  {!item.is_approved && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock size={10} /> Pending
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-slate-800 text-sm truncate">{item.name}</h2>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                  {item.phone && <span className="flex items-center gap-1"><Phone size={12}/> {item.phone}</span>}
                  <span className="flex items-center gap-1 truncate"><Mail size={12}/> {item.email}</span>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 shrink-0" />
            </Link>
          ))
        )}
      </main>
    </div>
  );
}