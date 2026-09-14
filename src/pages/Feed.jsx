import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LayoutGrid, Square, Star, MapPin, MessageCircle, Send, Filter, AlertTriangle, Clock, Building } from 'lucide-react';
import FollowButton from '../components/FollowButton';

export default function Feed() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [filter, setFilter] = useState('All');
  const [followedAnimals, setFollowedAnimals] = useState(new Set());
  const [session, setSession] = useState(null);
  
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showComments, setShowComments] = useState({});

  useEffect(() => {
    const initFeed = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        // Smart Routing: If user is a Rescue, default to Spotted for triage
        const { data: rescueData } = await supabase
          .from('rescue_partners')
          .select('is_verified')
          .eq('user_id', session.user.id)
          .single();
          
        if (rescueData?.is_verified) {
          setFilter('Spotted');
        }
      }
      
      fetchFeed(session?.user?.id);
    };

    initFeed();
  }, []);

  const fetchFeed = async (userId) => {
    setLoading(true);
    const { data: sightings } = await supabase
      .from('sightings')
      .select('*, animal:animals(*)')
      .order('created_at', { ascending: false });

    if (sightings) setReports(sightings);

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

    if (userId) {
      const { data: follows } = await supabase
        .from('follows')
        .select('animal_id')
        .eq('user_id', userId);
      if (follows) {
        setFollowedAnimals(new Set(follows.map(f => f.animal_id)));
      }
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

  // UNIFIED FEED FILTER LOGIC
  const filteredReports = reports.filter(report => {
    if (report.animal?.is_archived) return false;
    if (filter !== 'All' && report.animal?.status !== filter) return false;
    return true;
  });

  const groupedReports = filteredReports.reduce((groups, report) => {
    const { groupKey } = formatDateTime(report.created_at);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(report);
    return groups;
  }, {});

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading feed...</div>;

  return (
    <div className="pb-6">
      {/* Strict top-16 (64px) Sticky Offset to seal against header */}
      <div className="bg-white p-3 border-b border-slate-200 sticky top-16 z-40 shadow-sm flex flex-col gap-3">
        
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 flex-grow">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-50 text-slate-700 text-sm font-bold px-3 py-2 rounded-lg outline-none cursor-pointer border border-slate-200 flex-grow"
            >
              <option value="All">All Animals in Network</option>
              <option value="Spotted">Spotted & Reported</option>
              <option value="Rescued">Recently Rescued</option>
              <option value="In-care">In-Care</option>
              <option value="Fostered">Currently Fostered</option>
              <option value="Adopted">Adopted</option>
            </select>
          </div>
          <div className="flex bg-slate-100 rounded-lg p-1 shrink-0">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutGrid size={18} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
              <Square size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-8">
        {Object.keys(groupedReports).length === 0 ? (
          <div className="text-center mt-10">
            <p className="text-slate-500 font-bold mb-2">No records match this status.</p>
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
                    const { time } = formatDateTime(report.created_at);
                    const postComments = comments[report.animal_id] || [];
                    const isShowingComments = showComments[report.animal_id];
                    
                    const isUrgent = report.animal?.record_type === 'Shelter Urgent';
                    const deadline = report.animal?.urgent_deadline ? new Date(report.animal.urgent_deadline) : null;

                    return (
                      <div key={report.id} className={`bg-white rounded-xl overflow-hidden shadow-sm border relative ${isUrgent ? 'border-rose-200' : 'border-slate-100'}`}>
                        <Link to={`/animal/${report.animal_id}`} className="block relative">
                          
                          {(report.image_urls?.length > 0 || report.image_url) ? (
                            <div className="flex overflow-x-auto snap-x scrollbar-hide">
                              {(report.image_urls || [report.image_url]).map((url, i) => (
                                <img 
                                  key={i} 
                                  src={url} 
                                  alt="Sighting" 
                                  className={`w-full object-cover shrink-0 snap-center ${viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/5]'}`} 
                                />
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

                          <div className="absolute top-3 right-3 z-10">
                            <FollowButton animalId={report.animal_id} session={session} />
                          </div>
                        </Link>
                        
                        <div className="p-3">
                          <Link to={`/animal/${report.animal_id}`} className="block mb-2">
                            <div className="flex justify-between items-start mb-1.5">
                              <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
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
                                    type="text" 
                                    placeholder="Add a comment..." 
                                    className="flex-grow bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-600 transition-all"
                                    value={newComment[report.animal_id] || ''}
                                    onChange={(e) => setNewComment({ ...newComment, [report.animal_id]: e.target.value })}
                                  />
                                  <button type="submit" disabled={!newComment[report.animal_id]?.trim()} className="p-2 text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors disabled:opacity-50">
                                    <Send size={18} />
                                  </button>
                                </form>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}