import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ShieldCheck, Heart, ChevronRight, ChevronDown, Phone, Mail,
  Clock, Car, User, Activity, Building2, MapPin, Globe
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { SHELTER_DIRECTORY } from '../shelterData';

const FOSTER_PREFS = [
  'Emergency / Short-Term',
  'Medical / Post-Op',
  'Large Breeds',
  'Bottle Babies / Maternity'
];

const VOLUNTEER_TYPES = [
  { label: 'Transport / Relay', value: 'Transport / Relay' },
  { label: 'Dog Walker / Socializer', value: 'Dog Walker / Socializer' },
  { label: 'Photography / Video', value: 'Photography / Video' },
  { label: 'Event Staff', value: 'Event Staff' },
  { label: 'Admin / Social Media', value: 'Admin / Social Media' }
];

const VOLUNTEER_TIMES = [
  'Weekday Mornings',
  'Weekday Afternoons',
  'Weekday Evenings',
  'Weekends'
];

const VALID_SHELTERS = SHELTER_DIRECTORY.filter(
  (s) => s.name && s.name !== 'Other / Not Listed'
);

const SHELTER_COUNTIES = [
  ...new Set(VALID_SHELTERS.map((s) => s.county).filter(Boolean))
];

export default function Directory() {
  const [activeTab, setActiveTab] = useState('Rescues');
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryData, setDirectoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVerifiedRescue, setIsVerifiedRescue] = useState(false);

  // Select Filter States
  const [selectedCounty, setSelectedCounty] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [filterFosterPref, setFilterFosterPref] = useState('');
  const [filterVolCap, setFilterVolCap] = useState('');
  const [filterVolTime, setFilterVolTime] = useState('');

  useEffect(() => {
    fetchDirectory();
  }, []);

  useEffect(() => {
    setSelectedCounty('');
    setFilterAvailability('');
    setFilterFosterPref('');
    setFilterVolCap('');
    setFilterVolTime('');
  }, [activeTab]);

  const fetchDirectory = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      let verified = false;

      const { data: teamData } = await supabase
        .from('rescue_team_members')
        .select('rescue_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (teamData?.rescue_id) {
        const { data: rescueData } = await supabase
          .from('rescue_partners')
          .select('is_verified')
          .eq('id', teamData.rescue_id)
          .maybeSingle();
        if (rescueData?.is_verified) verified = true;
      } else {
        const { data: rescueData } = await supabase
          .from('rescue_partners')
          .select('is_verified')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (rescueData?.is_verified) verified = true;
      }

      setIsVerifiedRescue(verified);
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

  const filteredData = directoryData.filter((item) => {
    let tabMatch = false;
    if (activeTab === 'Rescues') tabMatch = item.type === 'Rescue';
    else if (activeTab === 'Fosters') tabMatch = item.open_to_foster === true;
    else if (activeTab === 'Volunteers') tabMatch = item.open_to_volunteer === true;

    if (!tabMatch) return false;

    if (searchQuery && !item.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (activeTab === 'Fosters') {
      if (filterAvailability && item.availability_status !== filterAvailability) return false;
      if (filterFosterPref && (!item.foster_preferences || !item.foster_preferences.includes(filterFosterPref))) {
        return false;
      }
    }

    if (activeTab === 'Volunteers') {
      if (filterVolCap && (!item.volunteer_capabilities || !item.volunteer_capabilities.includes(filterVolCap))) {
        return false;
      }
      if (filterVolTime && (!item.volunteer_availability || !item.volunteer_availability.includes(filterVolTime))) {
        return false;
      }
    }

    return true;
  });

  const filteredShelters = VALID_SHELTERS.filter((shelter) => {
    const matchesCounty = !selectedCounty || shelter.county === selectedCounty;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      shelter.name.toLowerCase().includes(query) ||
      (shelter.county && shelter.county.toLowerCase().includes(query));

    return matchesCounty && matchesSearch;
  });

  const CATEGORIES = isVerifiedRescue
    ? ['Rescues', 'Shelters', 'Fosters', 'Volunteers']
    : ['Rescues', 'Shelters'];

  const selectClass =
    'w-full appearance-none bg-socal-sand/70 border border-socal-sand-border rounded-lg py-2 pl-3 pr-8 text-xs font-bold text-socal-ink outline-none focus:ring-2 focus:ring-socal-orange cursor-pointer';

  return (
    <div className="bg-socal-sand min-h-screen pb-24 font-sans text-socal-ink">
      <div className="bg-white/95 backdrop-blur-sm p-4 border-b border-socal-sand-border sticky top-[64px] z-10 shadow-sm space-y-3">
        <h1 className="text-xl font-black text-socal-ink tracking-tight">SoCal Directory</h1>

        <div className="relative">
          <input
            type="text"
            placeholder={
              activeTab === 'Shelters'
                ? 'Search shelters by name or county...'
                : activeTab === 'Volunteers'
                ? 'Search volunteers by name...'
                : activeTab === 'Fosters'
                ? 'Search fosters by name...'
                : 'Search SoCal rescues...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-socal-sand/70 border border-socal-sand-border p-2.5 pl-9 rounded-lg text-sm outline-none focus:ring-2 focus:ring-socal-orange"
          />
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        </div>

        {/* PRIMARY SEGMENTED TABS */}
        <div
          className={`grid gap-1 bg-socal-sand p-1 rounded-xl border border-socal-sand-border/60 ${
            CATEGORIES.length === 4 ? 'grid-cols-4' : 'grid-cols-2'
          }`}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all text-center truncate ${
                activeTab === cat
                  ? 'bg-socal-ink text-white shadow-sm'
                  : 'text-slate-500 hover:text-socal-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* SELECT FILTER: SHELTERS */}
        {activeTab === 'Shelters' && (
          <div className="relative">
            <select
              aria-label="Filter shelters by county"
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className={selectClass}
            >
              <option value="">All SoCal Counties ({VALID_SHELTERS.length})</option>
              {SHELTER_COUNTIES.map((county) => (
                <option key={county} value={county}>
                  {county} County
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* SELECT FILTERS: VOLUNTEERS */}
        {activeTab === 'Volunteers' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                aria-label="Filter volunteers by type"
                value={filterVolCap}
                onChange={(e) => setFilterVolCap(e.target.value)}
                className={selectClass}
              >
                <option value="">All Volunteer Types</option>
                {VOLUNTEER_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                aria-label="Filter volunteers by availability"
                value={filterVolTime}
                onChange={(e) => setFilterVolTime(e.target.value)}
                className={selectClass}
              >
                <option value="">Any Availability</option>
                {VOLUNTEER_TIMES.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* SELECT FILTERS: FOSTERS */}
        {activeTab === 'Fosters' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                aria-label="Filter fosters by status"
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                className={selectClass}
              >
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Fostering">Currently Fostering</option>
                <option value="Resting">Taking a Break</option>
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                aria-label="Filter fosters by preference"
                value={filterFosterPref}
                onChange={(e) => setFilterFosterPref(e.target.value)}
                className={selectClass}
              >
                <option value="">All Preferences</option>
                {FOSTER_PREFS.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      <main className="p-4 space-y-3">
        {activeTab === 'Shelters' ? (
          filteredShelters.length === 0 ? (
            <div className="text-center p-8 text-slate-500 font-bold text-sm bg-white rounded-xl border border-socal-sand-border">
              No shelters match your search.
            </div>
          ) : (
            filteredShelters.map((shelter) => (
              <div
                key={shelter.name}
                className="bg-white p-4 rounded-xl border border-socal-sand-border shadow-sm space-y-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-socal-ink bg-socal-sand px-2 py-0.5 rounded border border-socal-sand-border flex items-center gap-1">
                      <Building2 size={12} className="text-socal-orange" /> Municipal Shelter
                    </span>
                    {shelter.county && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-socal-plum bg-socal-plum-light px-2 py-0.5 rounded">
                        {shelter.county} County
                      </span>
                    )}
                  </div>

                  <h2 className="font-bold text-socal-ink text-sm">{shelter.name}</h2>
                  {shelter.phone && (
                    <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                      <Phone size={12} className="text-socal-orange" /> {shelter.phone}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-socal-sand-border/70">
                  {shelter.phone && (
                    <a
                      href={`tel:${shelter.phone}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-socal-orange-light hover:bg-socal-orange text-socal-orange-dark hover:text-white text-xs font-bold transition-colors"
                    >
                      <Phone size={13} /> Call
                    </a>
                  )}
                  {shelter.map && (
                    <a
                      href={shelter.map}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-socal-sand hover:bg-socal-sand-border text-socal-ink text-xs font-bold transition-colors border border-socal-sand-border"
                    >
                      <MapPin size={13} className="text-socal-orange" /> Map
                    </a>
                  )}
                  {shelter.website && (
                    <a
                      href={shelter.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg bg-socal-plum-light hover:bg-socal-plum text-socal-plum hover:text-white text-xs font-bold transition-colors"
                    >
                      <Globe size={13} /> Site
                    </a>
                  )}
                </div>
              </div>
            ))
          )
        ) : loading ? (
          <div className="text-center p-8 text-slate-500 font-bold text-sm">Loading directory...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center p-8 text-slate-500 font-bold text-sm bg-white rounded-xl border border-socal-sand-border">
            No {activeTab.toLowerCase()} match your current filters.
          </div>
        ) : (
          filteredData.map((item) => (
            <Link
              key={item.id}
              to={`/directory/${item.id}`}
              className="bg-white p-4 rounded-xl border border-socal-sand-border shadow-sm hover:border-socal-orange/60 transition-colors flex items-center justify-between group relative overflow-hidden"
            >
              <div className="min-w-0 pr-4">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {item.type === 'Rescue' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-socal-plum bg-socal-plum-light px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldCheck size={12} /> Rescue
                    </span>
                  )}
                  {item.open_to_foster && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <Heart size={12} /> Foster
                    </span>
                  )}
                  {item.open_to_volunteer && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-socal-orange-dark bg-socal-orange-light px-2 py-0.5 rounded flex items-center gap-1">
                      <Car size={12} /> Volunteer
                    </span>
                  )}
                  {item.type === 'Community' && !item.open_to_foster && !item.open_to_volunteer && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-socal-sand px-2 py-0.5 rounded flex items-center gap-1">
                      <User size={12} /> Community
                    </span>
                  )}
                  {!item.is_approved && item.type === 'Rescue' && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-socal-sand px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock size={10} /> Pending
                    </span>
                  )}
                  {item.availability_status && item.open_to_foster && (
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 ${
                        item.availability_status === 'Available'
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-500 bg-socal-sand'
                      }`}
                    >
                      <Activity size={10} /> {item.availability_status}
                    </span>
                  )}
                </div>

                <h2 className="font-bold text-socal-ink text-sm truncate">{item.name}</h2>

                {activeTab === 'Volunteers' && item.volunteer_capabilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.volunteer_capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] font-bold text-socal-ink/80 bg-socal-sand px-2 py-0.5 rounded border border-socal-sand-border"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
                  {item.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={12} /> {item.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 truncate">
                    <Mail size={12} /> {item.email}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-socal-orange shrink-0" />
            </Link>
          ))
        )}
      </main>
    </div>
  );
}