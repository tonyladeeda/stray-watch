import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  User, Mail, Phone, Building, FileText, 
  Globe, ShieldCheck, Check, Heart, CreditCard, Trash2, AlertTriangle, Home
} from 'lucide-react';

export default function ProfileSettings() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [userRole, setUserRole] = useState('Spotter');
  const [isVerified, setIsVerified] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    availability: 'Available',
    // Foster JSONB mapped fields
    dwellingType: 'House', rentOrOwn: 'Own', landlordPermission: false,
    fencedYard: false, fenceDetails: '', experienceLevel: 5, currentPets: '',
    // Rescue mapped fields
    orgName: '', ein: '', website: ''
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
    const { data: rescueData } = await supabase.from('rescue_partners').select('*').eq('user_id', userId).single();
    if (rescueData) {
      setUserRole('Rescue');
      setIsVerified(rescueData.is_verified);
      setFormData(prev => ({
        ...prev, orgName: rescueData.name || '', ein: rescueData.ein || '', website: rescueData.website || ''
      }));
    } else {
      const { data: fosterData } = await supabase.from('directory_profiles').select('*').eq('user_id', userId).eq('type', 'Foster').single();
      if (fosterData) {
        setUserRole('Foster');
        setIsVerified(fosterData.is_approved);
        
        const details = fosterData.foster_details || {};
        setFormData(prev => ({ 
          ...prev, 
          phone: fosterData.phone || prev.phone, 
          availability: fosterData.availability_status || 'Available',
          dwellingType: details.dwellingType || 'House',
          rentOrOwn: details.rentOrOwn || 'Own',
          landlordPermission: details.landlordPermission || false,
          fencedYard: details.fencedYard || false,
          fenceDetails: details.fenceDetails || '',
          experienceLevel: details.experienceLevel || 5,
          currentPets: details.currentPets || ''
        }));
      }
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

    if (userRole === 'Foster' || userRole === 'Rescue') {
      const dirUpdate = { name: userRole === 'Rescue' ? formData.orgName : fullName, phone: formData.phone };
      
      if (userRole === 'Foster') {
        dirUpdate.availability_status = formData.availability;
        dirUpdate.foster_details = {
          dwellingType: formData.dwellingType,
          rentOrOwn: formData.rentOrOwn,
          landlordPermission: formData.landlordPermission,
          fencedYard: formData.fencedYard,
          fenceDetails: formData.fenceDetails,
          experienceLevel: formData.experienceLevel,
          currentPets: formData.currentPets
        };
      }
      
      await supabase.from('directory_profiles').update(dirUpdate).eq('user_id', session.user.id);
    }

    if (userRole === 'Rescue') {
      await supabase.from('rescue_partners').update({
        name: formData.orgName, ein: formData.ein, website: formData.website
      }).eq('user_id', session.user.id);
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
  const userInitial = formData.firstName?.[0] || session.user.email?.[0] || 'U';

  return (
    <div className="pb-24 font-sans text-slate-900">
      <div className="bg-white p-4 border-b border-slate-200 sticky top-16 z-10 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Settings</h1>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm ${
          userRole === 'Rescue' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
          userRole === 'Foster' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
          'bg-slate-100 text-slate-600 border border-slate-200'
        }`}>
          {userRole} Profile
        </span>
      </div>

      <main className="p-4 space-y-6">
        
        {/* Profile Avatar Header */}
        <div className="flex flex-col items-center py-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-slate-100 mb-3" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-cyan-100 border-4 border-white shadow-lg flex items-center justify-center text-cyan-800 text-3xl font-black mb-3">
              {userInitial.toUpperCase()}
            </div>
          )}
          <p className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Managed via {session.user.app_metadata?.provider === 'google' ? 'Google OAuth' : 'Email Registration'}
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-6">
          <div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          {userRole === 'Foster' && (
            <div className="pt-2 space-y-5">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Heart size={18} className="text-blue-600" /> Foster Master Profile
              </h2>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Status</label>
                <select value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-700">
                  <option value="Available">🟢 Ready to Foster</option>
                  <option value="Fostering">🟡 Currently Fostering</option>
                  <option value="Resting">🔴 Taking a Break</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dwelling Type</label>
                  <select value={formData.dwellingType} onChange={e => setFormData({...formData, dwellingType: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option>House</option>
                    <option>Townhome</option>
                    <option>Apartment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rent / Own</label>
                  <select value={formData.rentOrOwn} onChange={e => setFormData({...formData, rentOrOwn: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Own</option>
                    <option>Rent</option>
                  </select>
                </div>
              </div>

              {formData.rentOrOwn === 'Rent' && (
                <label className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer transition-colors hover:border-amber-300">
                  <input type="checkbox" checked={formData.landlordPermission} onChange={e => setFormData({...formData, landlordPermission: e.target.checked})} className="w-5 h-5 text-amber-600 rounded" />
                  <span className="text-xs font-bold text-amber-900">I have written permission from my landlord.</span>
                </label>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.fencedYard} onChange={e => setFormData({...formData, fencedYard: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                  <span className="text-sm font-bold text-slate-700">The yard is completely fenced.</span>
                </label>
                {formData.fencedYard && (
                  <input type="text" placeholder="Fence material and height (e.g. 6ft Wood)" required={formData.fencedYard} value={formData.fenceDetails} onChange={e => setFormData({...formData, fenceDetails: e.target.value})} className="w-full bg-white border border-slate-300 p-3 rounded-lg text-sm mt-3 outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dog-Handling Experience</label>
                <input type="range" min="1" max="10" value={formData.experienceLevel} onChange={e => setFormData({...formData, experienceLevel: parseInt(e.target.value)})} className="w-full accent-blue-600" />
                <div className="text-center text-xs font-black text-blue-600 mt-1">{formData.experienceLevel} / 10</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Pets</label>
                <textarea required placeholder="Species, age, temperament, vaccinated?" value={formData.currentPets} onChange={e => setFormData({...formData, currentPets: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl h-20 resize-none text-sm outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>

            </div>
          )}

          {userRole === 'Rescue' && (
            <div className="pt-2 space-y-4">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Building size={18} className="text-indigo-600" /> Organization Profile
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Name</label>
                <input type="text" required value={formData.orgName} onChange={(e) => setFormData({...formData, orgName: e.target.value})} className="w-full bg-white border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">501(c)(3) EIN</label>
                  <input type="text" value={formData.ein} onChange={(e) => setFormData({...formData, ein: e.target.value})} className="w-full bg-white border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Website URL</label>
                  <input type="url" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className="w-full bg-white border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-600" />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {isSubmitting ? 'Saving...' : saveSuccess ? <><Check size={18} /> Saved Successfully</> : 'Save Profile Settings'}
            </button>
          </div>
        </form>

        {userRole === 'Rescue' && (
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 shadow-sm">
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
                  disabled={!isVerified}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  {isVerified ? 'Connect Stripe Account' : 'Verification Required First'}
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
            disabled={isDeleting}
            className="w-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {isDeleting ? 'Deleting Account...' : <><Trash2 size={16} /> Delete Account Permanently</>}
          </button>
        </div>
      </main>
    </div>
  );
}