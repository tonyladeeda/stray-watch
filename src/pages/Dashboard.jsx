import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Activity, MapPin, Bookmark, Bell, CheckCircle2, Download, Users, ShieldAlert, Heart, Building2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MapWidget from '../components/MapWidget';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('community'); 
  const pdfRef = useRef(null);

  // Personal Stats State
  const [myStats, setMyStats] = useState({ reported: 0, rescued: 0, adopted: 0 });
  const [reports, setReports] = useState([]);
  const [saved, setSaved] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Community Stats State
  const [allSightings, setAllSightings] = useState([]);
  const [allAbuseReports, setAllAbuseReports] = useState([]);
  const [locationFilter, setLocationFilter] = useState('');
  const [communityStats, setCommunityStats] = useState({ reported: 0, rescued: 0, adopted: 0, abuse: 0 });
  const [filteredMapData, setFilteredMapData] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchPersonalData(session.user.id);
    });
    fetchCommunityData();
  }, []);

  // Recalculate community stats and map data whenever the location filter changes
  useEffect(() => {
    if (!allSightings.length) return;

    let filteredSightings = allSightings;
    if (locationFilter.trim()) {
      const lowerLoc = locationFilter.toLowerCase();
      filteredSightings = allSightings.filter(s => s.location && s.location.toLowerCase().includes(lowerLoc));
    }

    setFilteredMapData(filteredSightings);

    // Isolate unique animals in the filtered area
    const uniqueAnimalIds = [...new Set(filteredSightings.map(s => s.animal_id).filter(Boolean))];
    
    let rescuedCount = 0;
    let adoptedCount = 0;
    
    const animalStatusMap = {};
    filteredSightings.forEach(s => {
      if (s.animal_id && s.animal) {
        animalStatusMap[s.animal_id] = s.animal.status;
      }
    });

    Object.values(animalStatusMap).forEach(status => {
      if (['Rescued', 'In-care', 'Fostered'].includes(status)) rescuedCount++;
      if (status === 'Adopted') adoptedCount++;
    });

    const abuseCount = allAbuseReports.filter(r => uniqueAnimalIds.includes(r.animal_id)).length;

    setCommunityStats({
      reported: uniqueAnimalIds.length,
      rescued: rescuedCount,
      adopted: adoptedCount,
      abuse: abuseCount
    });

  }, [locationFilter, allSightings, allAbuseReports]);

  const fetchCommunityData = async () => {
    const { data: sightings } = await supabase.from('sightings').select('*, animal:animals(status)');
    const { data: abuse } = await supabase.from('abuse_reports').select('animal_id');
    
    if (sightings) {
      setAllSightings(sightings);
      setFilteredMapData(sightings);
    }
    if (abuse) setAllAbuseReports(abuse);
    setLoading(false);
  };

  const fetchPersonalData = async (userId) => {
    const { data: myReports } = await supabase.from('sightings').select('*, animal:animals(status)').eq('user_id', userId).order('created_at', { ascending: false });
    const { data: myHandled } = await supabase.from('animals').select('status').eq('handler_id', userId);
    const { data: mySaved } = await supabase.from('follows').select('animal_id, animals(*)').eq('user_id', userId).order('created_at', { ascending: false });
    const { data: myNotifs } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });

    if (myReports) setReports(myReports);
    if (mySaved) setSaved(mySaved.map(f => f.animals));
    if (myNotifs) setNotifications(myNotifs);

    const reportedCount = myReports ? myReports.length : 0;
    const rescuedCount = myHandled ? myHandled.filter(a => ['Rescued', 'In-care', 'Fostered'].includes(a.status)).length : 0;
    const adoptedCount = myHandled ? myHandled.filter(a => a.status === 'Adopted').length : 0;

    setMyStats({ reported: reportedCount, rescued: rescuedCount, adopted: adoptedCount });
  };

  const markAsRead = async (notifId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    const element = pdfRef.current;
    
    try {
      // useCORS is required to capture the external Leaflet map tiles
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = locationFilter ? `StrayWatch_Report_${locationFilter.replace(/\s+/g, '_')}.pdf` : `StrayWatch_Report_All_Areas.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF.");
    }
    
    setIsGeneratingPDF(false);
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading dashboard...</div>;

  return (
    <div className="pb-6">
      
      {/* Dashboard Header & Tabs */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-[72px] z-10 shadow-sm">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-4">Dashboard</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'community' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Community Impact
          </button>
          <button 
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'personal' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            My Impact
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* --- COMMUNITY IMPACT TAB --- */}
        {activeTab === 'community' && (
          <div className="space-y-6">
            
            {/* Filter & Export Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Filter by City or Location</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="e.g., Los Angeles, Downtown, 90210..." 
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 pl-9 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>
              <button 
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white disabled:bg-slate-400 font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Download size={16} />
                {isGeneratingPDF ? 'Generating...' : 'Download Official PDF Report'}
              </button>
            </div>

            {/* Printable Area */}
            <div ref={pdfRef} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="text-center mb-6 pb-4 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Stray Watch Civic Report</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  Location: {locationFilter ? locationFilter.toUpperCase() : 'ALL AREAS'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Generated: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                  <Users size={24} className="text-blue-600 mb-2" />
                  <span className="text-3xl font-black text-slate-800">{communityStats.reported}</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">Animals Reported</span>
                </div>
                
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex flex-col items-center text-center">
                  <ShieldAlert size={24} className="text-rose-600 mb-2" />
                  <span className="text-3xl font-black text-rose-700">{communityStats.abuse}</span>
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wide mt-1">Abuse Reports</span>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col items-center text-center">
                  <Heart size={24} className="text-amber-600 mb-2" />
                  <span className="text-3xl font-black text-amber-700">{communityStats.rescued}</span>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wide mt-1">Total Rescued</span>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col items-center text-center">
                  <CheckCircle2 size={24} className="text-emerald-600 mb-2" />
                  <span className="text-3xl font-black text-emerald-700">{communityStats.adopted}</span>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide mt-1">Total Adopted</span>
                </div>
              </div>

              {/* Dynamic Heatmap */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="font-black text-slate-800 mb-4 tracking-tight">Activity Heatmap</h3>
                <MapWidget sightings={filteredMapData} />
              </div>
              
              <div className="mt-8 pt-4 border-t border-slate-100">
                 <p className="text-[10px] text-slate-400 text-justify leading-relaxed">
                   *This report is generated from verified community-submitted data on the Stray Watch platform. These figures reflect real-time active cases and historical logs tied to the specified search perimeter.
                 </p>
              </div>
            </div>

          </div>
        )}

        {/* --- MY IMPACT TAB --- */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            {!session ? (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 text-center">
                <p className="text-slate-600 font-medium mb-4">You need an account to track your personal impact.</p>
                <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Sign In / Sign Up</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <Activity size={24} className="text-blue-600 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{myStats.reported}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">Reported</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <CheckCircle2 size={24} className="text-amber-500 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{myStats.rescued}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">Rescued</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
                    <MapPin size={24} className="text-emerald-500 mb-2" />
                    <span className="text-2xl font-black text-slate-800">{myStats.adopted}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase">Adopted</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Bell size={18} /> Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-slate-500 italic bg-white p-4 rounded-xl border border-slate-100">No new notifications.</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map(notif => (
                        <div key={notif.id} onClick={() => !notif.is_read && markAsRead(notif.id)} className={`p-3 rounded-xl border transition-colors ${notif.is_read ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-blue-50 border-blue-100 cursor-pointer hover:bg-blue-100'}`}>
                          <h4 className="text-sm font-bold text-slate-800">{notif.title}</h4>
                          <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Bookmark size={18} /> Saved Animals</h3>
                  {saved.length === 0 ? (
                    <p className="text-sm text-slate-500 italic bg-white p-4 rounded-xl border border-slate-100">You haven't saved any animals yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {saved.map(animal => (
                        <Link key={animal.id} to={`/animal/${animal.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden block hover:border-blue-300 transition-colors">
                          <div className="p-3">
                            <p className="font-bold text-slate-800 text-sm">{animal.type || 'Unknown'}</p>
                            <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold inline-block mt-1">{animal.status}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><MapPin size={18} /> My Reports</h3>
                  {reports.length === 0 ? (
                    <p className="text-sm text-slate-500 italic bg-white p-4 rounded-xl border border-slate-100">You haven't reported any animals yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {reports.map(report => (
                        <Link key={report.id} to={`/animal/${report.animal_id}`} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex gap-3 hover:border-blue-300 transition-colors">
                          {report.image_url && <img src={report.image_url} alt="Report" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                          <div className="flex-grow min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{report.location}</p>
                            <span className="text-xs text-slate-500 block mt-1">{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}