import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  LayoutGrid, Square, MapPin, MessageCircle, Send, 
  AlertTriangle, Clock, Building, Heart, Home, SlidersHorizontal, X 
} from 'lucide-react';
import FollowButton from '../components/FollowButton';
import ShareButton from '../components/ShareButton';

export default function Feed() {
  const [reports, setReports] = useState([]);
  const [rescueMap, setRescueMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [session, setSession] = useState(null);
  
  // Stream & Filter State
  const [primaryStream, setPrimaryStream] = useState('Recent');
  const [followedAnimals, setFollowedAnimals] = useState(new Set());
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    type: '', breed: '', sex: '', location: ''
  });
  
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    const initFeed = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const { data: follows } = await supabase
          .from('follows')
          .select('animal_id')
          .eq('user_id', session.user.id);
        if (follows) setFollowedAnimals(new Set(follows.map(f => f.animal_id)));
      }
      
      fetchFeed();
    };

    initFeed();
  }, []);

  const fetchFeed = async () => {
    setLoading(true);
    
    // Fetch Sightings and Animals
    const { data: sightings } = await supabase
      .from('sightings')
      .select('*, animal:animals(*)')
      .order('created_at', { ascending: false });

    if (sightings) setReports(sightings);

    // Fetch Rescue Partners to map handler_id to Rescue Details
    const { data: rescues } = await supabase
      .from('rescue_partners')
      .select('user_id, name, avatar_url');
      
    if (rescues) {
      const map = rescues.reduce((acc, rescue) => {
        acc[rescue.user_id] = rescue;
        return acc;
      }, {});
      setRescueMap(map);
    }

    // Fetch Comments
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, profiles(first_name)')
      .order('created_at', { ascending: true });
    
    if (commentsData) {
      const groupedComments = commentsData.reduce((acc, comment) => {
        const key = comment.animal_id || comment.sighting_id; 
        if (!acc[key]) acc[key] = [];
        acc[key].push(comment);
        return acc;
      }, {});
      setComments(groupedComments);
    }

    setLoading(false);
  };

  const handleAddComment = async (animalId, e) => {
    e.preventDefault();
    if (!session) return alert('Please log in to post a comment.');
    
    const commentText = newComment[animalId];
    if (!commentText || !commentText.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert([{ user_id: session.user.id, animal_id: animalId, text: commentText }])
      .select('*, profiles(first_name)')
      .single();

    if (!error && data) {
      setComments({ ...comments, [animalId]: [...(comments[animalId] || []), data] });
      setNewComment({ ...newComment, [animalId]: '' });
      setShowComments({ ...showComments, [animalId]: true });
    }
  };

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
    const rest = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return { day, rest, time, groupKey: `${day} ${rest}` };
  };

  const clearFilters = () => {
    setAdvancedFilters({ type: '', breed: '', sex: '', location: '' });
    setShowFiltersModal(false);
  };

  const filteredReports = reports.filter(report => {
    if (report.animal?.is_archived) return false;

    if (primaryStream === 'Urgent' && report.animal?.record_type !== 'Shelter Urgent') return false;
    if (primaryStream === 'Following' && !followedAnimals.has(report.animal_id)) return false;

    const a = report.animal || {};
    if (advancedFilters.type && a.type !== advancedFilters.type) return false;
    if (advancedFilters.sex && a.sex !== advancedFilters.sex && a.gender !== advancedFilters.sex) return false;
    if (advancedFilters.breed && !a.breed?.toLowerCase().includes(advancedFilters.breed.toLowerCase())) return false;
    if (advancedFilters.location && !report.location?.toLowerCase().includes(advancedFilters.location.toLowerCase())) return false;

    return true;
  });

  const groupedReports = filteredReports.reduce((groups, report) => {
    const { groupKey } = formatDateTime(report.created_at);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(report);
    return groups;
  }, {});

  const activeFilterCount = Object.values(advancedFilters).filter(val => val !== '').length;

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading collective stream...</div>;

  let globalPostCount = 0;

  return (
    <div className="pb-6">
      
      <div className="bg-white/95 backdrop-blur-sm px-4 py-3 border-b border-slate-200 sticky top-16 z-30 shadow-sm flex flex-col gap-3">
        
        <div className="flex bg-slate-100 p-1 rounded-xl w-full">
          <button 
            onClick={() => setPrimaryStream('Recent')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${primaryStream === 'Recent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Recent
          </button>
          <button 
            onClick={() => setPrimaryStream('Urgent')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${primaryStream === 'Urgent' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {primaryStream === 'Urgent' && <AlertTriangle size={14} />} Urgent
          </button>
          <button 
            onClick={() => {
              if (!session) return alert("Please log in to view animals you follow.");
              setPrimaryStream('Following');
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${primaryStream === 'Following' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Following
          </button>
        </div>

        <div className="flex justify-between items-center">
          <button 
            onClick={() => setShowFiltersModal(true)} 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors border ${activeFilterCount > 0 ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <SlidersHorizontal size={16} /> 
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-cyan-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                {activeFilterCount}
              </span>
            )}
          </button>
          
          <div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0 border border-slate-200/50">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
              <Square size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-8">
        {Object.keys(groupedReports).length === 0 ? (
          <div className="text-center mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-slate-500 font-bold mb-2">No animals match your current filters.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-cyan-600 font-bold text-sm hover:underline">
                Clear Advanced Filters
              </button>
            )}
          </div>
        ) : (
          Object.keys(groupedReports).map((dateKey) => {
            const { day, rest } = formatDateTime(groupedReports[dateKey][0].created_at);
            
            return (
              <div key={dateKey} className="space-y-4">
                <div className="border-b border-slate-300 pb-2">
                  <h3 className="text-sm text-slate-600 tracking-tight">
                    <span className="font-bold text-slate-900">{day}</span> {rest}
                  </h3>
                </div>

                <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-3" : "space-y-6"}>
                  {groupedReports[dateKey].map((report) => {
                    globalPostCount++;
                    const showCTA = !session && globalPostCount % 5 === 0;
                    const { time } = formatDateTime(report.created_at);
                    const postComments = comments[report.animal_id] || [];
                    const isShowingComments = showComments[report.animal_id];
                    const isUrgent = report.animal?.record_type === 'Shelter Urgent';
                    const deadline = report.animal?.urgent_deadline ? new Date(report.animal.urgent_deadline) : null;
                    const shareUrl = `${window.location.origin}/animal/${report.animal_id}`;
                    
                    // Lookup Rescue details
                    const rescue = rescueMap[report.animal?.handler_id];

                    return (
                      <React.Fragment key={report.id}>
                        <div className={`bg-white rounded-xl overflow-hidden shadow-sm border relative ${isUrgent ? 'border-rose-200' : 'border-slate-100'}`}>
                          <Link to={`/animal/${report.animal_id}`} className="block relative">
                            {(report.image_urls?.length > 0 || report.image_url) ? (
                              <div className="flex overflow-x-auto snap-x scrollbar-hide">
                                {(report.image_urls || [report.image_url]).map((url, i) => (
                                  <img key={i} src={url} alt="Animal" className={`w-full object-cover shrink-0 snap-center ${viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/5]'}`} />
                                ))}
                              </div>
                            ) : (
                               <div className={`w-full bg-slate-100 flex items-center justify-center text-slate-400 ${viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/5]'}`}>No Photo</div>
                            )}
                            
                            {isUrgent && (
                              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-rose-900/90 to-rose-800/80 backdrop-blur-sm text-white p-2 flex justify-between items-center pointer-events-none">
                                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                  <AlertTriangle size={12} /> At Risk
                                </span>
                                {deadline && (
                                  <span className="text-[10px] font-bold flex items-center gap-1">
                                    <Clock size={12} /> 
                                    Ends: {deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                              <FollowButton animalId={report.animal_id} session={session} />
                              <ShareButton 
                                url={shareUrl} title={`StrayGuard: ${report.animal?.name || 'Animal in need'}`} 
                                text="View this animal's rescue journey on StrayGuard." 
                                variant="ghost" className="bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white shadow-sm p-2 rounded-full" 
                              />
                            </div>
                          </Link>
                          
                          <div className="p-3">
                            <Link to={`/animal/${report.animal_id}`} className="block mb-2">
                              <div className="flex justify-between items-start mb-1.5">
                                <p className="font-bold text-slate-800 text-sm flex items-center gap-1 pr-2">
                                  {isUrgent && !report.latitude ? <Building size={14} className="text-rose-500 shrink-0" /> : <MapPin size={14} className="text-slate-400 shrink-0" />}
                                  <span className="truncate">{report.location}</span>
                                </p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isUrgent ? 'bg-rose-100 text-rose-700' : 'bg-cyan-50 text-cyan-700'}`}>
                                  {report.animal?.status || 'Spotted'}
                                </span>
                              </div>
                              {isUrgent && report.animal?.shelter_id && (
                                <p className="text-xs font-mono text-slate-500 mb-1">ID: {report.animal.shelter_id}</p>
                              )}
                            </Link>

                            {/* --- INJECTED RESCUE BADGE --- */}
                            {rescue && viewMode === 'list' && (
                              <Link to={`/rescue/${report.animal.handler_id}`} className="flex items-center gap-2 mb-3 w-fit group">
                                {rescue.avatar_url ? (
                                  <img src={rescue.avatar_url} className="w-5 h-5 rounded-full object-cover border border-slate-200" alt={rescue.name} />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                    <Building size={10} className="text-slate-400" />
                                  </div>
                                )}
                                <span className="text-xs font-bold text-slate-500 group-hover:text-cyan-600 transition-colors">
                                  {rescue.name}
                                </span>
                              </Link>
                            )}
                            
                            {viewMode === 'list' && (
                              <>
                                <p className="text-xs font-bold text-slate-400 mb-2">{time}</p>
                                <p className="text-sm text-slate-600 mb-3">{report.notes}</p>

                                <div className="border-t border-slate-100 pt-3">
                                  <button 
                                    onClick={() => setShowComments({ ...showComments, [report.animal_id]: !isShowingComments })}
                                    className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm font-bold mb-3"
                                  >
                                    <MessageCircle size={18} />
                                    {postComments.length} {postComments.length === 1 ? 'Comment' : 'Comments'}
                                  </button>

                                  {isShowingComments && (
                                    <div className="space-y-2 mb-3">
                                      {postComments.map((c) => (
                                        <div key={c.id} className="text-sm">
                                          <span className="font-bold text-slate-800 mr-2">{c.profiles?.first_name || 'User'}</span>
                                          <span className="text-slate-600">{c.text}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <form onSubmit={(e) => handleAddComment(report.animal_id, e)} className="flex items-center gap-2">
                                    <input 
                                      type="text" placeholder="Add a comment..." 
                                      className="flex-grow bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-600 transition-all disabled:opacity-50"
                                      value={newComment[report.animal_id] || ''}
                                      onChange={(e) => setNewComment({ ...newComment, [report.animal_id]: e.target.value })}
                                      disabled={!session}
                                      onClick={() => { if (!session) alert("Please log in to comment."); }}
                                    />
                                    <button type="submit" disabled={!newComment[report.animal_id]?.trim() || !session} className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors disabled:opacity-50">
                                      <Send size={18} />
                                    </button>
                                  </form>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {showCTA && (
                          <div className={`${viewMode === 'grid' ? 'col-span-2' : ''} bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-6 shadow-md text-white my-2 relative overflow-hidden flex flex-col items-center text-center`}>
                            <Heart size={80} className="absolute -top-6 -right-6 text-white/10 rotate-12" />
                            <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm">
                              <Home size={24} className="text-white" />
                            </div>
                            <h3 className="text-xl font-black mb-2 relative z-10 tracking-tight">Open your home. Save a life.</h3>
                            <p className="text-sm text-cyan-50 mb-5 relative z-10 max-w-sm">
                              Join our global network of fosters. Complete one master profile and instantly apply to help rescues in need.
                            </p>
                            <button 
                              onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                alert('Please use the Log In button at the top of the screen to create your Foster profile!');
                              }} 
                              className="bg-white text-cyan-700 font-black py-3 px-8 rounded-xl shadow-sm hover:bg-cyan-50 transition-all relative z-10 hover:scale-105"
                            >
                              Become a Foster
                            </button>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showFiltersModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <SlidersHorizontal className="text-cyan-600" /> Advanced Filters
              </h2>
              <button onClick={() => setShowFiltersModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-600 hover:bg-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Species</label>
                  <select 
                    value={advancedFilters.type} onChange={(e) => setAdvancedFilters({...advancedFilters, type: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">All Types</option>
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gender</label>
                  <select 
                    value={advancedFilters.sex} onChange={(e) => setAdvancedFilters({...advancedFilters, sex: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Any Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Breed / Guess</label>
                <input 
                  type="text" placeholder="e.g. Husky, Terrier mix" 
                  value={advancedFilters.breed} onChange={(e) => setAdvancedFilters({...advancedFilters, breed: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location / Zip / Shelter</label>
                <input 
                  type="text" placeholder="City, neighborhood, or shelter name..." 
                  value={advancedFilters.location} onChange={(e) => setAdvancedFilters({...advancedFilters, location: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 p-3 pl-10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500 relative"
                />
                <MapPin size={16} className="absolute left-9 bottom-12 text-slate-400" style={{ transform: 'translateY(-21px)' }} />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={clearFilters} className="px-6 py-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors w-1/3">
                Clear
              </button>
              <button onClick={() => setShowFiltersModal(false)} className="flex-grow bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}