import React, { useState, useEffect } from 'react';
import { MapPin, AlertCircle, CheckCircle2, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const STATUS_FILTERS = ['All', 'Spotted', 'Rescued', 'In-care', 'Fostered', 'Adopted', 'Deceased'];

export default function Feed() {
  const [sightings, setSightings] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSightings();
  }, [activeFilter]);

  const fetchSightings = async () => {
    setLoading(true);
    
    // Fetch sightings AND the linked master animal profile
    const { data, error } = await supabase
      .from('sightings')
      .select('*, animal:animals(status, handler_email)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sightings:', error);
    } else {
      // Filter the data based on the master animal status
      const filteredData = activeFilter === 'All' 
        ? data 
        : data.filter(s => (s.animal ? s.animal.status : s.status) === activeFilter);
        
      setSightings(filteredData);
    }
    
    setLoading(false);
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex justify-between items-center mb-1">
        <h2 className="font-bold text-slate-700 tracking-tight">Recent Sightings</h2>
        <span className="text-xs bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-medium">Radius: 5mi</span>
      </div>

      <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter size={18} className="text-blue-600" />
          <span className="text-sm font-bold">Status:</span>
        </div>
        <div className="relative">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg focus:ring-2 focus:ring-blue-600 outline-none block pl-3 pr-8 py-2 w-36"
          >
            {STATUS_FILTERS.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
      </div>
      
      {loading ? (
        <p className="text-center text-slate-500 mt-10 font-bold">Loading feed...</p>
      ) : sightings.length === 0 ? (
        <p className="text-center text-slate-500 mt-10">No {activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} animals reported yet.</p>
      ) : (
        sightings.map((sighting) => {
          // Determine the correct status to display (Master animal status takes priority)
          const displayStatus = sighting.animal ? sighting.animal.status : sighting.status;
          
          return (
            <div key={sighting.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
              <Link to={`/animal/${sighting.animal_id}`} className="block">
                <img src={sighting.image_url} alt="Stray" className="w-full h-48 object-cover hover:opacity-90 transition-opacity" />
              </Link>
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-1">
                      <MapPin size={16} className="text-slate-400" />
                      {sighting.location}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 ml-5">{formatTime(sighting.created_at)}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${
                    displayStatus === 'Spotted' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {displayStatus === 'Spotted' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                    {displayStatus}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{sighting.notes}</p>
                
                {sighting.animal_id ? (
                  <Link to={`/animal/${sighting.animal_id}`} className="text-sm font-semibold text-blue-600 w-full text-left hover:text-blue-700 transition-colors">
                    View Full Profile & Timeline →
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400 italic">Legacy post (No profile linked)</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}