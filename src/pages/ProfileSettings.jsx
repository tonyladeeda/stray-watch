import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  User, Mail, Phone, Building, FileText, 
  Globe, ShieldCheck, Check, Heart, CreditCard, Trash2, AlertTriangle, ChevronRight,
  Link as LinkIcon, Activity, Camera, Car
} from 'lucide-react';
import TeamManager from '../components/TeamManager';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [userRole, setUserRole] = useState('Spotter');
  const [isVerified, setIsVerified] = useState(false);
  const [fosterCompletion, setFosterCompletion] = useState(0);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [teamRole, setTeamRole] = useState(null); // NEW: Tracks their specific permission level

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    availability: 'Available', orgName: '', ein: '', website: '',
    bio: '', instagram: '', twitter: '', maxCapacity: 40, stressLimit: 35
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
        setUserRole('Rescue');
        setWorkspaceId(rescueData.id);
        setIsVerified(rescueData.is_verified);
        
        const { data: rescueDirData } = await supabase
          .from('directory_profiles')
          .select('bio, social_links')
          .eq('user_id', rescueData.user_id)
          .maybeSingle();

        setFormData(prev => ({
          ...prev, 
          orgName: rescueData.name || '', 
          ein: rescueData.ein || '', 
          website: rescueData.website || '',
          maxCapacity: rescueData.max_capacity ?? 40,
          stressLimit: rescueData.stress_limit ?? 35,
          bio: rescueDirData?.bio || dirData?.bio || '',
          instagram: rescueDirData?.social_links?.instagram || dirData?.social_links?.instagram || '',
          twitter: rescueDirData?.social_links?.twitter || dirData?.social_links?.twitter || ''
        }));
      }
    } else if (dirData && dirData.type === 'Foster') {
      setUserRole('Foster');
      setIsVerified(dirData.is_approved);
      setFormData(prev => ({ 
        ...prev, 
        phone: dirData.phone || prev.phone, 
        availability: dirData.availability_status || 'Available',
        bio: dirData.bio || '',
        instagram: dirData.social_links?.instagram || '',
        twitter: dirData.social_links?.twitter || ''
      }));
      
      const details = dirData.foster_details || {};
      const keys = Object.keys(details);
      setFosterCompletion(keys.length > 20 ? 100 : Math.round((keys.length / 20) * 100));
    } else if (dirData) {
      setUserRole(dirData.type || 'Spotter');
      setFormData(prev => ({
        ...prev,
        bio: dirData.bio || '',
        instagram: dirData.social_links?.instagram || '',
        twitter: dirData.social_links?.twitter || ''
      }));
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveSuccess(false);

    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    await supabase.auth.updateUser({
      data: { first_name: formData.firstName, last_name: formData.lastName, phone: formData.phone }
    });

    const dirUpdate = { 
      name: userRole === 'Rescue' ? formData.orgName : fullName, 
      phone: formData.phone,
      bio: formData.bio,
      social_links: { instagram: formData.instagram, twitter: formData.twitter }
    };
    
    if (userRole === 'Foster') {
      dirUpdate.availability_status = formData.availability;
    }
    
    await supabase.from('directory_profiles').update(dirUpdate).eq('user_id', session.user.id);

    if (userRole === 'Rescue' && workspaceId && (teamRole === 'owner' || teamRole === 'admin')) {
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

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("WARNING: Are you sure you want to permanently delete your StrayGuard account? This action cannot be undone.");
    if (!confirmDelete) return;
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

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading profile...</div>;
  if (!session) return <div className="p-8 text-center mt-10 font-bold text-slate-800">Please log in to manage settings.</div>;

  const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;

  const renderDefaultAvatar = () => {
    let IconComponent = Camera;
    let colorClass = "bg-cyan-100 text-cyan-700";

    if (userRole === 'Rescue') {
      IconComponent = Building;
      colorClass = "bg-indigo-100 text-indigo-700";
    } else if (userRole === 'Foster') {
      IconComponent = Heart;
      colorClass = "bg-blue-100 text-blue-700";
    } else if (userRole === 'Volunteer') {
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
          userRole === 'Rescue' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
          userRole === 'Foster' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
          userRole === 'Volunteer' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
          'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {userRole === 'Rescue' ? 'Workspace' : `${userRole} Profile`}
        </span>
      </div>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        
        <div className="flex flex-col items-center py-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-slate-100 mb-3" />
          ) : renderDefaultAvatar()}
          
          <p className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            Managed via {session.user.app_metadata?.provider === 'google' ? 'Google OAuth' : 'Email Registration'}
          </p>
        </div>

        {userRole === 'Foster' && (
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

        <form onSubmit={handleSave} className="space-y-6">
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="relative">
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-600" />
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
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
              <LinkIcon size={18} className="text-cyan-600" /> Social Links
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Instagram Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 font-bold">@</span>
                <input type="text" name="instagram" value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value})} placeholder="username" className="w-full bg-slate-50 border border-slate-300 p-3 pl-8 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-600" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Twitter / X Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 font-bold">@</span>
                <input type="text" name="twitter" value={formData.twitter} onChange={(e) => setFormData({...formData, twitter: e.target.value})} placeholder="username" className="w-full bg-slate-50 border border-slate-300 p-3 pl-8 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-600" />
              </div>
            </div>
          </div>

          {userRole === 'Foster' && (
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
              <h2 className="font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-200 pb-2">
                <Heart size={18} className="text-blue-600" /> Current Status
              </h2>
              <select value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} className="w-full bg-white border border-blue-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-700">
                <option value="Available">🟢 Ready to Foster</option>
                <option value="Fostering">🟡 Currently Fostering</option>
                <option value="Resting">🔴 Taking a Break</option>
              </select>
            </div>
          )}

          {userRole === 'Rescue' && (
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

        {/* TEAM MANAGEMENT COMPONENT */}
        {userRole === 'Rescue' && workspaceId && (
          <TeamManager workspaceId={workspaceId} currentUserRole={teamRole} />
        )}

        {userRole === 'Rescue' && (
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
        )}

        <div className="mt-8 border-t border-rose-200 pt-6 px-2">
          <h3 className="text-rose-600 font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
            <AlertTriangle size={16} /> Danger Zone
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Deleting your account is permanent. All associated profile data and reporting history will be anonymized or removed according to community guidelines.
          </p>
          <button 
            onClick={handleDeleteAccount}
            disabled={isDeleting || (userRole === 'Rescue' && teamRole !== 'owner')}
            className="w-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {isDeleting ? 'Deleting Account...' : <><Trash2 size={16} /> Delete Account Permanently</>}
          </button>
        </div>
      </main>
    </div>
  );
}