import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FollowButton({ animalId, session }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && animalId) {
      checkFollowStatus();
    } else {
      setLoading(false);
    }
  }, [session, animalId]);

  const checkFollowStatus = async () => {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('animal_id', animalId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (data) setIsFollowing(true);
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!session) {
      alert('Please sign in to follow and track animals.');
      return;
    }

    setLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('animal_id', animalId)
        .eq('user_id', session.user.id);
        
      if (!error) setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from('follows')
        .insert([{ animal_id: animalId, user_id: session.user.id }]);
        
      if (!error) setIsFollowing(true);
    }
    
    setLoading(false);
  };

  return (
    <button 
      onClick={toggleFollow}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors border shadow-sm ${
        isFollowing 
          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Star size={16} className={isFollowing ? 'fill-amber-500 text-amber-500' : 'text-slate-400'} />
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}