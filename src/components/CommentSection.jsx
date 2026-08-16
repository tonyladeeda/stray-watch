import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CommentSection({ animalId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (animalId) fetchComments();
  }, [animalId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('animal_id', animalId)
      .order('created_at', { ascending: true });
    
    if (error) console.error('Error fetching comments:', error);
    else setComments(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);

    const { error } = await supabase
      .from('comments')
      .insert([{ 
        animal_id: animalId, 
        text: newComment 
      }]);

    if (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment.');
    } else {
      setNewComment('');
      fetchComments();
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 mt-6">
      <h3 className="font-bold text-slate-700 mb-4 tracking-tight">Updates & Comments</h3>
      
      <div className="space-y-3 mb-5 max-h-60 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
            No comments yet. Add an update or share helpful info!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <p className="text-sm text-slate-700">{comment.text}</p>
              <span className="text-[10px] font-medium text-slate-400 mt-1.5 block">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add an update..."
          className="flex-1 border border-slate-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
          required
        />
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
        >
          {isSubmitting ? '...' : 'Post'}
        </button>
      </form>
    </div>
  );
}