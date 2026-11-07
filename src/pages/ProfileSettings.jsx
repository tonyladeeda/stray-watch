import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  User, Mail, Phone, Building, FileText, 
  Globe, ShieldCheck, Check, Heart, CreditCard, Trash2, AlertTriangle, ChevronRight,
  Link as LinkIcon, Activity, Camera, Car, Calendar, MessageSquare, X
} from 'lucide-react';
import TeamManager from '../components/TeamManager';

const FOSTER_PREFS = ['Emergency / Short-Term', 'Medical / Post-Op', 'Large Breeds', 'Bottle Babies / Maternity'];
const VOLUNTEER_CAPS = ['Transport / Relay', 'Photography / Video', 'Event Staff', 'Dog Walker / Socializer', 'Admin / Social Media'];
const VOLUNTEER_TIMES = ['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekends'];

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingRescue, setIsDeletingRescue] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  
  const [isVerified, setIsVerified] = useState(false);
  const [fosterCompletion, setFosterCompletion] = useState(0);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [teamRole, setTeamRole] = useState(null); 
  const [activeTab, setActiveTab] = useState('personal');

  const [isSetupRescueOpen, setIsSetupRescueOpen] = useState(false);
  const [rescueSetupData, setRescueSetupData] = useState({
    orgName: '', ein: '', website: '', orgEmail: '', orgPhone: '',
    isOwner: true, ownerName: '', ownerEmail: '', alsoFoster: false
  });

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    availability: 'Available', orgName: '', ein: '', website: '',
    bio: '', instagram: '', twitter: '', maxCapacity: 40, stressLimit: 35,
    openToFoster: false, openToVolunteer: false,
    fosterPreferences: [], volunteerCapabilities: [], volunteerAvailability: [],
    fosterNotes: '', volunteerNotes: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const meta = session.user.user_metadata || {};
        const splitName = meta.full_name?.split(' ') || [];
        setFormData(prev => ({ 
          ...prev, 
          email: session.user.email,
          firstName: meta.first_name || splitName[0] || '',
          lastName: meta.last_name || splitName.slice(1).join(' ') || '',
          phone: session.user.phone || meta.phone || ''
        }));
        checkUserRoles(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const checkUserRoles = async (userId) => {
    const { data: dirData } = await supabase.from('directory_profiles').select('*').eq('user_id', userId).maybeSingle();
    
    if (dirData) {
      setFormData(prev => ({ 
        ...prev, 
        phone: dirData.phone || prev.phone, 
        availability: dirData.availability_status || 'Available',
        bio: dirData.bio || '',
        instagram: dirData.social_links?.instagram || '',
        twitter: dirData.social_links?.twitter || '',
        openToFoster: dirData.open_to_foster || false,
        openToVolunteer: dirData.open_to_volunteer || false,
        fosterPreferences: dirData.foster_preferences || [],
        volunteerCapabilities: dirData.volunteer_capabilities || [],
        volunteerAvailability: dirData.volunteer_availability || [],
        fosterNotes: dirData.foster_notes || '',
        volunteerNotes: dirData.volunteer_notes || ''
      }));
      
      const details = dirData.foster_details || {};
      const keys = Object.keys(details);
      setFosterCompletion(keys.length > 20 ? 100 : Math.round((keys.length / 20) * 100));
    }

    const { data: teamData } = await supabase
      .from('rescue_team_members')
      .select('rescue_id, role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (teamData) {
      setTeamRole(teamData.role);
      const { data: rescueData } = await supabase
        .from('rescue_partners')
        .select('*')
        .eq('id', teamData.rescue_id)
        .maybeSingle();

      if (rescueData) {
        setWorkspaceId(rescueData.id);
        setIsVerified(rescueData.is_verified);
        setFormData(prev => ({
          ...prev, 
          orgName: rescueData.name || '', 
          ein: rescueData.ein || '', 
          website: rescueData.website || '',
          maxCapacity: rescueData.max_capacity ?? 40,
          stressLimit: rescueData.stress_limit ?? 35
        }));
        setActiveTab('workspace');
      }
    }
    setLoading(false);
  };

  const handleArrayToggle = (field, value) => {
    setFormData(prev => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value) ? current.filter(i => i !== value) : [...current, value]
      };
    });
  };

  const openRescueSetup = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      alert("Please complete your Personal Account Details (First Name, Last Name, and Phone Number) at the top of the page before registering a rescue.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setRescueSetupData(prev => ({
      ...prev,
      orgEmail: formData.email,
      orgPhone: formData.phone
    }));
    setIsSetupRescueOpen(true);
  };

  const submitRescueSetup = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    await supabase.from('profiles').upsert([{
      id: session.user.id,
      first_name: formData.firstName,
      last_name: formData.lastName,
      avatar_url: session.user.user_metadata?.avatar_url || null
    }]);

    await supabase.from('directory_profiles').upsert([{
      user_id: session.user.id,
      type: 'Rescue',
      name: fullName,
      email: formData.email,
      phone: formData.phone,
      open_to_foster: rescueSetupData.alsoFoster || formData.openToFoster
    }], { onConflict: 'user_id' });

    const { data: rescue, error: rescueError } = await supabase
      .from('rescue_partners')
      .insert([{
        user_id: session.user.id,
        name: rescueSetupData.orgName,
        email: rescueSetupData.orgEmail,
        ein: rescueSetupData.ein,
        website: rescueSetupData.website,
        status: 'pending'
      }])
      .select()
      .single();

    if (!rescueError && rescue) {
      const assignedRole = rescueSetupData.isOwner ? 'owner' : 'admin';
      
      await supabase
        .from('rescue_team_members')
        .insert([{
          rescue_id: rescue.id,
          user_id: session.user.id,
          role: assignedRole
        }]);

      if (!rescueSetupData.isOwner) {
        alert(`Rescue created! An email invitation has been triggered for ${rescueSetupData.ownerEmail} to claim ownership. You have been granted Admin access to configure the rescue settings.`);
      } else {
        alert('Rescue Organization Created! You are set as the Owner.');
      }

      setFormData(prev => ({
        ...prev,
        orgName: rescueSetupData.orgName,
        ein: rescueSetupData.ein,
        website: rescueSetupData.website,
        openToFoster: rescueSetupData.alsoFoster || prev.openToFoster
      }));

      setWorkspaceId(rescue.id);
      setTeamRole(assignedRole);
      setActiveTab('workspace');
      setIsSetupRescueOpen(false);
    } else {
      alert('Error creating rescue: ' + rescueError.message);
    }
    
    setIsSubmitting(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveSuccess(false);

    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    await supabase.auth.updateUser({
      data: { first_name: formData.firstName, last_name: formData.lastName, phone: formData.phone }
    });

    await supabase.from('profiles').upsert([{
      id: session.user.id,
      first_name: formData.firstName,
      last_name: formData.lastName,
      avatar_url: session.user.user_metadata?.avatar_url || null
    }]);

    const dirUpdate = { 
      name: fullName, 
      phone: formData.phone,
      bio: formData.bio,
      social_links: { instagram: formData.instagram, twitter: formData.twitter },
      open_to_foster: formData.openToFoster,
      open_to_volunteer: formData.openToVolunteer,
      foster_preferences: formData.openToFoster ? formData.fosterPreferences : [],
      volunteer_capabilities: formData.openToVolunteer ? formData.volunteerCapabilities : [],
      volunteer_availability: formData.openToVolunteer ? formData.volunteerAvailability : [],
      foster_notes: formData.openToFoster ? formData.fosterNotes : '',
      volunteer_notes: formData.openToVolunteer ? formData.volunteerNotes : ''
    };
    
    if (formData.openToFoster) {
      dirUpdate.availability_status = formData.availability;
    }
    
    await supabase.from('directory_profiles').update(dirUpdate).eq('user_id', session.user.id);

    if (workspaceId && (teamRole === 'owner' || teamRole === 'admin')) {
      await supabase.from('rescue_partners').update({
        name: formData.orgName, 
        ein: formData.ein, 
        website: formData.website,
        max_capacity: parseInt(formData.maxCapacity) || 0,
        stress_limit: parseInt(formData.stressLimit) || 0
      }).eq('id', workspaceId);
    }

    setIsSubmitting(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // NEW: Updated Personal Delete Flow (With Rescue Checks)
  const handleDeleteAccount = async () => {
    if (workspaceId && teamRole === 'owner') {
      const confirmRescueAction = window.confirm(
        `You are the Owner of ${formData.orgName}.\n\nIf you delete your personal account, your rescue organization will ALSO be permanently deleted.\n\nTo preserve the rescue, please cancel this and transfer ownership to another team member first.\n\nClick OK if you want to permanently delete your account AND the rescue.`
      );
      if (!confirmRescueAction) return;
    } else {
      const confirmDelete = window.confirm("WARNING: Are you sure you want to permanently delete your StrayGuard account? This action cannot be undone.");
      if (!confirmDelete) return;
    }
    
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_user');
    if (error) {
      alert("Failed to delete account. Ensure the database function is installed.");
      setIsDeleting(false);
    } else {
      await supabase.auth.signOut();
      window.location.href = '/';
    }
  };

  // NEW: Dedicated Rescue Deletion Flow (Without deleting personal account)
  const handleDeleteRescue = async () => {
    const confirmDelete = window.confirm(
      `WARNING: Are you sure you want to completely delete ${formData.orgName}?\n\nThis will remove all team members and unassign all animals. This cannot be undone.`
    );
    if (!confirmDelete) return;
    
    setIsDeletingRescue(true);
    
    // Clean up Rescue footprints
    await supabase.from('animals').update({ rescue_partner_id: null }).eq('rescue_partner_id', workspaceId);
    await supabase.from('placement_applications').delete().eq('rescue_id', workspaceId);
    await supabase.from('rescue_team_members').delete().eq('rescue_id', workspaceId);
    const { error } = await supabase.from('rescue_partners').delete().eq('id', workspaceId);
    
    if (error) {
      alert("Error deleting rescue: " + error.message);
      setIsDeletingRescue(false);
    } else {
      alert("Rescue Organization has been successfully deleted.");
      setWorkspaceId(null);
      setTeamRole(null);
      setActiveTab('personal');
      setIsDeletingRescue(false);
    }
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading profile...</div>;
  if (!session) return <div className="p-8 text-center mt-10 font-bold text-slate-800">Please log in to manage settings.</div>;

  const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;

  const renderDefaultAvatar = () => {
    let IconComponent = Camera;
    let colorClass = "bg-cyan-100 text-cyan-700";

    if (workspaceId && activeTab === 'workspace') {
      IconComponent = Building;
      colorClass = "bg-indigo-100 text-indigo-700";
    } else if (formData.openToFoster) {
      IconComponent = Heart;
      colorClass = "bg-blue-100 text-blue-700";
    } else if (formData.openToVolunteer) {
      IconComponent = Car;
      colorClass = "bg-amber-100 text-amber-700";
    }

    return (
      <div className={`w-24 h-24 rounded-full border-4 border-white shadow-lg flex items-center justify-center mb-3 ${colorClass}`}>
        <IconComponent size={40} />
      </div>
    );
  };

  const canEditWorkspace = teamRole === 'owner' || teamRole === 'admin';

  return (
    <div className="pb-24 font-sans text-slate-900 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 border-b border-slate-200 sticky top-16 z-10 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Settings</h1>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm ${
          activeTab === 'workspace' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
          'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {activeTab === 'workspace' ? 'Rescue Settings' : 'Personal Settings'}
        </span>
      </div>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        
        {workspaceId && (
          <div className="flex bg-slate-200 p-1.5 rounded-xl shadow-inner">
            <button 
              onClick={() => setActiveTab('personal')}
              className={`flex-1 py-2.5 text-sm font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'personal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Personal
            </button>
            <button 
              onClick={() => setActiveTab('workspace')}
              className={`flex-1 py-2.5 text-sm font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'workspace' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              My Rescue
            </button>
          </div>
        )}

        <div className="flex flex-col items-center py-2">
          {avatarUrl && !avatarError ? (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              onError={() => setAvatarError(true)}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-slate-100 mb-3" 
            />
          ) : renderDefaultAvatar()}
          
          <p className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            Managed via {session.user.app_metadata?.provider === 'google' ? 'Google OAuth' : 'Email Registration'}
          </p>
        </div>

        {activeTab === 'personal' && formData.openToFoster && (
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl p-5 shadow-lg text-white">
            <div className="flex items-start justify-between mb-2">
              <div className="bg-white/20 p-2 rounded-full"><FileText size={20} className="text-white" /></div>
              <span className="text-xs font-black bg-white/20 px-2 py-1 rounded-full">{fosterCompletion}% Complete</span>
            </div>
            <h3 className="font-black text-lg mb-1 mt-3">Master Application</h3>
            <p className="text-xs text-blue-100 leading-relaxed mb-5">
              Keep your home details, references, and yard setup up-to-date so you can apply for urgent dogs instantly.
            </p>
            <button 
              onClick={() => navigate('/foster-profile-setup')}
              className="w-full bg-white text-blue-600 font-bold py-3 rounded-xl shadow-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              {fosterCompletion === 100 ? 'Edit Application' : 'Continue Application'} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* --- MAIN SETTINGS FORM --- */}
        <form onSubmit={handleSave} className="space-y-6">
          
          {activeTab === 'personal' && (
            <>
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User size={18} className="text-cyan-600" /> Account Details
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                    <input type="text" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                    <input type="text" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-600" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                    <div className="relative">
                      <input type="email" disabled value={formData.email} className="w-full bg-slate-100 border border-slate-200 p-3 pl-10 rounded-lg text-sm text-slate-500 cursor-not-allowed" />
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number *</label>
                    <div className="relative">
                      <input type="tel" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-600" />
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} rows="3" placeholder="Tell the community about yourself..." className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-600 resize-none"></textarea>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Heart size={18} className="text-cyan-600" /> How I want to help
                </h2>
                
                <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Open to Fostering</p>
                    <p className="text-xs text-slate-500">Provide temporary housing for urgent animals.</p>
                  </div>
                  <input type="checkbox" checked={formData.openToFoster} onChange={(e) => setFormData({...formData, openToFoster: e.target.checked})} className="w-5 h-5 accent-cyan-600 rounded" />
                </label>

                {formData.openToFoster && (
                  <div className="pl-4 border-l-2 border-rose-200 space-y-4 ml-2 mt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Status</label>
                      <select value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 font-bold text-slate-700">
                        <option value="Available">🟢 Ready to Foster</option>
                        <option value="Fostering">🟡 Currently Fostering</option>
                        <option value="Resting">🔴 Taking a Break</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Foster Preferences</label>
                      <div className="space-y-2">
                        {FOSTER_PREFS.map(pref => (
                          <label key={pref} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={formData.fosterPreferences.includes(pref)}
                              onChange={() => handleArrayToggle('fosterPreferences', pref)}
                              className="w-4 h-4 accent-rose-600 rounded" 
                            />
                            {pref}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <MessageSquare size={12} /> Foster Notes
                      </label>
                      <textarea 
                        value={formData.fosterNotes} 
                        onChange={(e) => setFormData({...formData, fosterNotes: e.target.value})} 
                        rows="2" 
                        placeholder="Any additional context (e.g., must be dog friendly, no stairs...)" 
                        className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                      />
                    </div>
                  </div>
                )}

                <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors mt-4">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Open to Volunteering</p>
                    <p className="text-xs text-slate-500">Help with transport, dog walking, or events.</p>
                  </div>
                  <input type="checkbox" checked={formData.openToVolunteer} onChange={(e) => setFormData({...formData, openToVolunteer: e.target.checked})} className="w-5 h-5 accent-cyan-600 rounded" />
                </label>

                {formData.openToVolunteer && (
                  <div className="pl-4 border-l-2 border-amber-200 space-y-4 ml-2 mt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Volunteer Capabilities</label>
                      <div className="space-y-2">
                        {VOLUNTEER_CAPS.map(cap => (
                          <label key={cap} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={formData.volunteerCapabilities.includes(cap)}
                              onChange={() => handleArrayToggle('volunteerCapabilities', cap)}
                              className="w-4 h-4 accent-amber-500 rounded" 
                            />
                            {cap}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Calendar size={12}/> Typical Availability</label>
                      <div className="space-y-2">
                        {VOLUNTEER_TIMES.map(time => (
                          <label key={time} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={formData.volunteerAvailability.includes(time)}
                              onChange={() => handleArrayToggle('volunteerAvailability', time)}
                              className="w-4 h-4 accent-amber-500 rounded" 
                            />
                            {time}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <MessageSquare size={12} /> Volunteer Notes
                      </label>
                      <textarea 
                        value={formData.volunteerNotes} 
                        onChange={(e) => setFormData({...formData, volunteerNotes: e.target.value})} 
                        rows="2" 
                        placeholder="Any additional context (e.g., can drive up to 20 miles...)" 
                        className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'workspace' && workspaceId && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building size={18} className="text-indigo-600" /> Workspace Profile
                </h2>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Name</label>
                  <input type="text" required disabled={!canEditWorkspace} value={formData.orgName} onChange={(e) => setFormData({...formData, orgName: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">501(c)(3) EIN</label>
                    <input type="text" disabled={!canEditWorkspace} value={formData.ein} onChange={(e) => setFormData({...formData, ein: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Website URL</label>
                    <input type="url" disabled={!canEditWorkspace} value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                <h2 className="font-bold text-indigo-900 flex items-center gap-2 mb-4 border-b border-indigo-200 pb-2">
                  <Activity size={18} className="text-indigo-600"/> Rescue Capacity
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Max Capacity</label>
                    <input type="number" disabled={!canEditWorkspace} name="maxCapacity" value={formData.maxCapacity} onChange={(e) => setFormData({...formData, maxCapacity: e.target.value})} className="w-full bg-white border border-indigo-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Stress Limit</label>
                    <input type="number" disabled={!canEditWorkspace} name="stressLimit" value={formData.stressLimit} onChange={(e) => setFormData({...formData, stressLimit: e.target.value})} className="w-full bg-white border border-indigo-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>
                <p className="text-xs text-indigo-600 font-bold">Your profile will display a warning banner if your current intake reaches your stress limit.</p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : saveSuccess ? <><Check size={18} /> Saved Successfully</> : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* --- PERSONAL TAB SPECIFIC SECTIONS --- */}
        {activeTab === 'personal' && (
          <>
            {!workspaceId && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 mb-6 mt-6">
                <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Expand Your Role</h3>
                
                {isSetupRescueOpen ? (
                  <form onSubmit={submitRescueSetup} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-5 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-start border-b border-indigo-100 pb-3 mb-2">
                      <div>
                        <h4 className="font-black text-indigo-900 flex items-center gap-2"><Building size={18}/> Rescue Setup</h4>
                        <p className="text-xs text-indigo-600 mt-1">Register your organization to manage intakes and fosters.</p>
                      </div>
                      <button type="button" onClick={() => setIsSetupRescueOpen(false)} className="text-indigo-400 hover:text-indigo-600 bg-white p-1 rounded-full shadow-sm"><X size={16}/></button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Org Name *</label>
                        <input type="text" required value={rescueSetupData.orgName} onChange={e => setRescueSetupData({...rescueSetupData, orgName: e.target.value})} className="w-full bg-white border border-indigo-200 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., Downtown Dog Rescue" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Org Email *</label>
                          <input type="email" required value={rescueSetupData.orgEmail} onChange={e => setRescueSetupData({...rescueSetupData, orgEmail: e.target.value})} className="w-full bg-white border border-indigo-200 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Org Phone *</label>
                          <input type="tel" required value={rescueSetupData.orgPhone} onChange={e => setRescueSetupData({...rescueSetupData, orgPhone: e.target.value})} className="w-full bg-white border border-indigo-200 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">501(c)(3) EIN</label>
                          <input type="text" value={rescueSetupData.ein} onChange={e => setRescueSetupData({...rescueSetupData, ein: e.target.value})} className="w-full bg-white border border-indigo-200 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Optional for now" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Website URL *</label>
                          <input type="url" required value={rescueSetupData.website} onChange={e => setRescueSetupData({...rescueSetupData, website: e.target.value})} className="w-full bg-white border border-indigo-200 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-indigo-100 pt-4 mt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={rescueSetupData.isOwner} onChange={e => setRescueSetupData({...rescueSetupData, isOwner: e.target.checked})} className="w-5 h-5 accent-indigo-600 rounded" />
                        <span className="text-sm font-bold text-indigo-900">I am the Owner/Director of this Rescue</span>
                      </label>
                      
                      {!rescueSetupData.isOwner && (
                        <div className="mt-3 p-3 bg-white border border-indigo-100 rounded-lg space-y-3">
                          <p className="text-xs text-indigo-600 font-medium">Please provide the Owner's info. They will be emailed an invitation to claim ownership, and you will be assigned as an Admin.</p>
                          <input type="text" required placeholder="Owner's Full Name" value={rescueSetupData.ownerName} onChange={e => setRescueSetupData({...rescueSetupData, ownerName: e.target.value})} className="w-full bg-slate-50 border border-indigo-100 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input type="email" required placeholder="Owner's Email Address" value={rescueSetupData.ownerEmail} onChange={e => setRescueSetupData({...rescueSetupData, ownerEmail: e.target.value})} className="w-full bg-slate-50 border border-indigo-100 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      )}
                    </div>

                    <div className="border-t border-indigo-100 pt-4 mt-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={rescueSetupData.alsoFoster} onChange={e => setRescueSetupData({...rescueSetupData, alsoFoster: e.target.checked})} className="w-5 h-5 accent-indigo-600 rounded" />
                        <div>
                          <span className="block text-sm font-bold text-indigo-900">I also want to foster animals</span>
                          <span className="block text-xs text-indigo-600">You can complete your Master Foster application later.</span>
                        </div>
                      </label>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
                      {isSubmitting ? 'Processing...' : 'Complete Rescue Registration'}
                    </button>
                  </form>
                ) : (
                  <button 
                    onClick={openRescueSetup}
                    className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors shrink-0">
                        <ShieldCheck size={20} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-bold text-indigo-900 text-sm">Register a Rescue</p>
                        <p className="text-[11px] text-indigo-700 mt-0.5 leading-tight">Create a workspace to manage intakes and funds.</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-indigo-400 group-hover:text-indigo-600 shrink-0" />
                  </button>
                )}

                {!formData.openToFoster && (
                  <button 
                    onClick={() => navigate('/foster-profile-setup')}
                    className="w-full flex items-center justify-between p-3 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-rose-100 p-2 rounded-lg group-hover:bg-rose-200 transition-colors shrink-0">
                        <Heart size={20} className="text-rose-600" />
                      </div>
                      <div>
                        <p className="font-bold text-rose-900 text-sm">Become a Foster Home</p>
                        <p className="text-[11px] text-rose-700 mt-0.5 leading-tight">Complete your profile to start saving lives.</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-rose-400 group-hover:text-rose-600 shrink-0" />
                  </button>
                )}
              </div>
            )}

            {/* --- PERSONAL DANGER ZONE --- */}
            <div className="mt-8 border-t border-rose-200 pt-6 px-2">
              <h3 className="text-rose-600 font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle size={16} /> Danger Zone
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Deleting your personal account is permanent. All associated profile data and reporting history will be anonymized or removed according to community guidelines.
              </p>
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting Account...' : <><Trash2 size={16} /> Delete Account Permanently</>}
              </button>
            </div>
          </>
        )}

        {/* --- WORKSPACE TAB SPECIFIC SECTIONS --- */}
        {activeTab === 'workspace' && workspaceId && (
          <>
            <TeamManager workspaceId={workspaceId} currentUserRole={teamRole} />
            
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 shadow-sm mt-6">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-100 p-3 rounded-full shrink-0">
                  <CreditCard size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-emerald-900 mb-1">Stripe Connect</h3>
                  <p className="text-xs text-emerald-700 leading-relaxed mb-4">
                    Link your organization's bank account via Stripe to accept transparent Care Fund donations directly from the community.
                  </p>
                  <button 
                    onClick={() => alert("Stripe OAuth routing will go here")}
                    disabled={!isVerified || teamRole !== 'owner'}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    {teamRole !== 'owner' ? 'Owner Access Required' : isVerified ? 'Connect Stripe Account' : 'Verification Required First'}
                  </button>
                </div>
              </div>
            </div>

            {/* --- RESCUE DANGER ZONE (OWNERS ONLY) --- */}
            {teamRole === 'owner' && (
              <div className="mt-8 border-t border-rose-200 pt-6 px-2">
                <h3 className="text-rose-600 font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} /> Rescue Danger Zone
                </h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Deleting this Rescue Organization is permanent. All team members will lose access and active placements will be cancelled.
                </p>
                <button 
                  onClick={handleDeleteRescue}
                  disabled={isDeletingRescue}
                  className="w-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isDeletingRescue ? 'Deleting Rescue...' : <><Trash2 size={16} /> Delete Rescue Organization</>}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}