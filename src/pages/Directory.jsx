import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, ShieldCheck, Heart, ChevronRight, Phone, Mail, 
  Clock, Car, User, SlidersHorizontal, X, Activity 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

const FOSTER_PREFS = ['Emergency / Short-Term', 'Medical / Post-Op', 'Large Breeds', 'Bottle Babies / Maternity'];
const VOLUNTEER_CAPS = ['Transport / Relay', 'Photography / Video', 'Event Staff', 'Dog Walker / Socializer', 'Admin / Social Media'];

export default function Directory() {
  const [activeTab, setActiveTab] = useState('Rescues');
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryData, setDirectoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVerifiedRescue, setIsVerifiedRescue] = useState(false);

  // Advanced Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterAvailability, setFilterAvailability] = useState('');
  const [filterFosterPref, setFilterFosterPref] = useState('');
  const [filterVolCap, setFilterVolCap] = useState('');

  useEffect(() => {
    fetchDirectory();
  }, []);

  // Reset advanced filters when switching tabs
  useEffect(() => {
    setFilterAvailability('');
    setFilterFosterPref('');
    setFilterVolCap('');
    setShowFilters(false);
  }, [activeTab]);

  const fetchDirectory = async () => {
    setLoading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: rescueData } = await supabase
        .from('rescue_partners')
        .select('is_verified')
        .eq('user_id', session.user.id)
        .maybeSingle();
        
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
    // 1. Tab Matching
    let tabMatch = false;
    if (activeTab === 'All') tabMatch = true;
    else if (activeTab === 'Rescues') tabMatch = item.type === 'Rescue';
    else if (activeTab === 'Fosters') tabMatch = item.open_to_foster === true;
    else if (activeTab === 'Volunteers') tabMatch = item.open_to_volunteer === true;

    if (!tabMatch) return false;

    // 2. Search Query Matching
    if (searchQuery && !item.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;

    // 3. Advanced Filters Matching
    if (filterAvailability && item.availability_status !== filterAvailability) return false;
    
    if (filterFosterPref) {
      if (!item.foster_preferences || !item.foster_preferences.includes(filterFosterPref)) return false;
    }

    if (filterVolCap) {
      if (!item.volunteer_capabilities || !item.volunteer_capabilities.includes(filterVolCap)) return false;
    }

    return true;
  });

  const CATEGORIES = isVerifiedRescue ? ['All', 'Rescues', 'Fosters', 'Volunteers'] : ['Rescues'];

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <div className="bg-white p-4 border-b border-slate-200 sticky top-[64px] z-10 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Community Directory</h1>
          {isVerifiedRescue && (activeTab === 'Fosters' || activeTab === 'Volunteers') && (
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {showFilters ? <X size={18} /> : <SlidersHorizontal size={18} />}
            </button>
          )}
        </div>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search organizations or community members..."
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

        {/* ADVANCED FILTERS PANEL */}
        {showFilters && (activeTab === 'Fosters' || activeTab === 'Volunteers') && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-3 animate-in fade-in slide-in-from-top-2 space-y-3">
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-blue-100 pb-2">
              <SlidersHorizontal size={14}/> Advanced Filters
            </h3>
            
            {activeTab === 'Fosters' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Status</label>
                  <select 
                    value={filterAvailability} 
                    onChange={e => setFilterAvailability(e.target.value)}
                    className="w-full bg-white border border-blue-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                  >
                    <option value="">Any Status</option>
                    <option value="Available">Available</option>
                    <option value="Fostering">Currently Fostering</option>
                    <option value="Resting">Taking a Break</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Foster Preferences</label>
                  <select 
                    value={filterFosterPref} 
                    onChange={e => setFilterFosterPref(e.target.value)}
                    className="w-full bg-white border border-blue-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                  >
                    <option value="">All Preferences</option>
                    {FOSTER_PREFS.map(pref => <option key={pref} value={pref}>{pref}</option>)}
                  </select>
                </div>
              </>
            )}

            {activeTab === 'Volunteers' && (
              <div>
                <label className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Capabilities</label>
                <select 
                  value={filterVolCap} 
                  onChange={e => setFilterVolCap(e.target.value)}
                  className="w-full bg-white border border-blue-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                >
                  <option value="">All Capabilities</option>
                  {VOLUNTEER_CAPS.map(cap => <option key={cap} value={cap}>{cap}</option>)}
                </select>
              </div>
            )}
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
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {item.type === 'Rescue' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldCheck size={12} /> Rescue
                    </span>
                  )}
                  {item.open_to_foster && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <Heart size={12} /> Foster
                    </span>
                  )}
                  {item.open_to_volunteer && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <Car size={12} /> Volunteer
                    </span>
                  )}
                  {item.type === 'Community' && !item.open_to_foster && !item.open_to_volunteer && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <User size={12} /> Community
                    </span>
                  )}
                  {!item.is_approved && item.type === 'Rescue' && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock size={10} /> Pending
                    </span>
                  )}
                  {item.availability_status && item.open_to_foster && (
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${item.availability_status === 'Available' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                      <Activity size={10} /> {item.availability_status}
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