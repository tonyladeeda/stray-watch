import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, UserPlus, Trash2, Shield, User } from 'lucide-react';

export default function TeamManager({ workspaceId, currentUserRole }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (workspaceId) fetchTeam();
  }, [workspaceId]);

  const fetchTeam = async () => {
    const { data: teamData } = await supabase
      .from('rescue_team_members')
      .select('*')
      .eq('rescue_id', workspaceId);

    if (teamData && teamData.length > 0) {
      // Map user_ids to fetch directory details safely without foreign key conflicts
      const userIds = teamData.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('directory_profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);
        
      const merged = teamData.map(member => ({
        ...member,
        profile: profiles?.find(p => p.user_id === member.user_id) || {}
      }));
      
      // Sort owners to the top
      merged.sort((a, b) => a.role === 'owner' ? -1 : 1);
      setMembers(merged);
    }
    setLoading(false);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setInviteLoading(true);

    // 1. Look up user by email in the directory
    const { data: userProfile } = await supabase
      .from('directory_profiles')
      .select('user_id')
      .eq('email', inviteEmail.trim().toLowerCase())
      .maybeSingle();

    if (!userProfile) {
      alert("User not found. They must create a StrayGuard account first before being added.");
      setInviteLoading(false);
      return;
    }

    // 2. Add found user to the team
    const { error } = await supabase
      .from('rescue_team_members')
      .insert([{
        rescue_id: workspaceId,
        user_id: userProfile.user_id,
        role: inviteRole
      }]);

    if (error) {
      alert("Error adding member: " + error.message);
    } else {
      setInviteEmail('');
      fetchTeam();
    }
    setInviteLoading(false);
  };

  const handleRemove = async (memberId) => {
    if (window.confirm("Are you sure you want to remove this team member?")) {
      await supabase.from('rescue_team_members').delete().eq('id', memberId);
      fetchTeam();
    }
  };

  if (loading) return <div className="p-5 text-slate-500 text-sm font-bold animate-pulse">Loading team roster...</div>;

  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-6">
      <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
        <Users size={18} className="text-indigo-600" /> Workspace Team
      </h2>

      <div className="space-y-3">
        {members.map(member => (
          <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${member.role === 'owner' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                {member.role === 'owner' ? <Shield size={16} /> : <User size={16} />}
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800">{member.profile?.name || 'Unknown User'}</p>
                <p className="text-xs text-slate-500">{member.profile?.email || 'No email attached'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 bg-slate-200 px-2 py-1 rounded">
                {member.role}
              </span>
              {isOwnerOrAdmin && member.role !== 'owner' && (
                <button onClick={() => handleRemove(member.id)} className="text-rose-400 hover:text-rose-600 p-1 transition-colors" title="Remove member">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isOwnerOrAdmin && (
        <form onSubmit={handleAddMember} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Add New Member</h3>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="User's email address" 
              required 
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600" 
            />
            <select 
              value={inviteRole} 
              onChange={(e) => setInviteRole(e.target.value)}
              className="bg-slate-50 border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-slate-700"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={inviteLoading}
            className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <UserPlus size={16} /> {inviteLoading ? 'Adding to Workspace...' : 'Add to Workspace'}
          </button>
        </form>
      )}
    </div>
  );
}