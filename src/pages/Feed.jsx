import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LayoutGrid, Square, Star, MapPin, MessageCircle, Send, Filter } from 'lucide-react';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchFeed(session?.user?.id);
    });
  }, []);

  const fetchFeed = async (userId) => {
    const { data: sightings } = await supabase
      .from('sightings')
      .select('*, animal:animals(status)')
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

  const toggleFollow = async (animalId, e) => {
    e.preventDefault(); 
    if (!session) {
      alert('Please log in to follow animals.');
      return;
    }

    const newFollows = new Set(followedAnimals);
    if (newFollows.has(animalId)) {
      newFollows.delete(animalId);
      setFollowedAnimals(newFollows);
      await supabase.from('follows').delete().match({ user_id: session.user.id, animal_id: animalId });
    } else {
      newFollows.add(animalId);
      setFollowedAnimals(newFollows);
      await supabase.from('follows').insert([{ user_id: session.user.id, animal_id: animalId }]);
    }
  };

  const handleAddComment = async (animalId, e) => {
    e.preventDefault();
    if (!session) {
      alert('Please log in to post a comment.');
      return;
    }
    
    const commentText = newComment[animalId];
    if (!commentText || !commentText.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert([{ user_id: session.user.id, animal_id: animalId, text: commentText }])
      .select('*, profiles(first_name)')
      .single();

    if (!error && data) {
      setComments({
        ...comments,
        [animalId]: [...(comments[animalId] || []), data]
      });
      setNewComment({ ...newComment, [animalId]: '' });
      setShowComments({ ...showComments, [animalId]: true });
    } else {
      console.error(error);
      alert('Failed to post comment.');
    }
  };

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
    const rest = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return { day, rest, time, groupKey: `${day} ${rest}` };
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'All') return true;
    return report.animal?.status === filter;
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
      <div className="bg-white p-3 border-b border-slate-200 sticky top-[72px] z-10 flex justify-between items-center shadow-sm gap-3">
        <div className="flex items-center gap-2 flex-grow">
          <Filter size={16} className="text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-50 text-slate-700 text-sm font-bold px-2 py-1.5 rounded-lg outline-none cursor-pointer border border-slate-200 flex-grow max-w-[150px]"
          >
            <option value="All">All Statuses</option>
            <option value="Spotted">Spotted</option>
            <option value="In-care">In-care</option>
            <option value="Rescued">Rescued</option>
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

      <div className="p-4 space-y-8">
        {Object.keys(groupedReports).length === 0 ? (
          <p className="text-center text-slate-500 font-bold mt-10">No sightings found for this filter.</p>
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
                    const isFollowed = followedAnimals.has(report.animal_id);
                    const postComments = comments[report.animal_id] || [];
                    const isShowingComments = showComments[report.animal_id];

                    return (
                      <div key={report.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 relative">
                        <Link to={`/animal/${report.animal_id}`} className="block relative">
                          {report.image_url ? (
                            <img 
                              src={report.image_url} 
                              alt="Sighting" 
                              className={`w-full object-cover ${viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/5]'}`} 
                            />
                          ) : (
                             <div className={`w-full bg-slate-100 flex items-center justify-center text-slate-400 ${viewMode === 'grid' ? 'aspect-square' : 'aspect-[4/5]'}`}>No Photo</div>
                          )}
                          <button 
                            onClick={(e) => toggleFollow(report.animal_id, e)}
                            className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors z-10"
                          >
                            <Star size={18} className={isFollowed ? 'fill-yellow-400 text-yellow-400' : ''} />
                          </button>
                        </Link>
                        
                        <div className="p-3">
                          <Link to={`/animal/${report.animal_id}`} className="block mb-2">
                            <div className="flex justify-between items-start">
                              <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                <MapPin size={14} className="text-slate-400 shrink-0" />
                                <span className="truncate">{report.location}</span>
                              </p>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full shrink-0">
                                {report.animal?.status || 'Spotted'}
                              </span>
                            </div>
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
                                    {postComments.length === 0 && (
                                      <p className="text-xs text-slate-400 italic">No comments yet. Be the first!</p>
                                    )}
                                  </div>
                                )}

                                <form onSubmit={(e) => handleAddComment(report.animal_id, e)} className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    placeholder="Add a comment..." 
                                    className="flex-grow bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                                    value={newComment[report.animal_id] || ''}
                                    onChange={(e) => setNewComment({ ...newComment, [report.animal_id]: e.target.value })}
                                  />
                                  <button 
                                    type="submit" 
                                    disabled={!newComment[report.animal_id]?.trim()}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                  >
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