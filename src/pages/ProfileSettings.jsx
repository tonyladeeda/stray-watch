import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  User, Mail, Phone, Building, FileText, 
  Globe, Users, ShieldCheck, AlertCircle, Check
} from 'lucide-react';

export default function ProfileSettings() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Profile State
  const [isOrg, setIsOrg] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    // Org specific fields
    orgName: '',
    ein: '',
    website: '',
    role: 'Founder / Director',
    references: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setFormData(prev => ({ 
          ...prev, 
          email: session.user.email,
          firstName: session.user.user_metadata?.first_name || '',
          lastName: session.user.user_metadata?.last_name || '',
        }));
        checkRescueStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const checkRescueStatus = async (userId) => {
    const { data } = await supabase
      .from('rescue_partners')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setIsOrg(true);
      setFormData(prev => ({
        ...prev,
        orgName: data.name || '',
        ein: data.ein || '',
        website: data.website || '',
        role: data.applicant_role || 'Founder / Director',
        references: data.reference_info || ''
      }));
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveSuccess(false);

    // 1. Update standard auth profile metadata
    await supabase.auth.updateUser({
      data: { first_name: formData.firstName, last_name: formData.lastName }
    });

    // 2. Handle Org Application if checkbox is active
    if (isOrg) {
      const payload = {
        user_id: session.user.id,
        email: session.user.email,
        name: formData.orgName,
        ein: formData.ein,
        website: formData.website,
        applicant_role: formData.role,
        reference_info: formData.references,
        status: 'pending',
        is_verified: false
      };

      // Upsert to handle both new applications and edits
      await supabase.from('rescue_partners').upsert([payload], { onConflict: 'user_id' });
    }

    setIsSubmitting(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading profile...</div>;

  if (!session) {
    return (
      <div className="p-8 text-center mt-10">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-600 text-sm">Please log in to manage your settings.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 font-sans text-slate-900">
      <div className="bg-white p-4 border-b border-slate-200 sticky top-[72px] z-10 shadow-sm">
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Account Settings</h1>
      </div>

      <main className="p-4 space-y-6">
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
          
          {/* --- STANDARD USER FIELDS --- */}
          <div>
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User size={18} className="text-blue-600" /> Personal Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                <input 
                  type="text" required
                  value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                <input 
                  type="text" required
                  value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address *</label>
              <div className="relative">
                <input 
                  type="email" disabled value={formData.email}
                  className="w-full bg-slate-100 border border-slate-200 p-3 pl-10 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
              <div className="relative">
                <input 
                  type="tel" placeholder="(Optional)"
                  value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                />
                <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* --- ORG TOGGLE --- */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
              <input 
                type="checkbox" 
                checked={isOrg}
                onChange={(e) => setIsOrg(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-600 cursor-pointer"
              />
              <div>
                <span className="block text-sm font-bold text-slate-800">I represent a Rescue, Shelter, or Foster</span>
                <span className="block text-xs text-slate-500">Apply for a verified organization badge and fundraising tools.</span>
              </div>
            </label>
          </div>

          {/* --- ORG SPECIFIC FIELDS --- */}
          {isOrg && (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Name *</label>
                <div className="relative">
                  <input 
                    type="text" required={isOrg} placeholder="e.g., Downtown Dog Rescue"
                    value={formData.orgName} onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                    className="w-full bg-white border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <Building size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">501(c)(3) EIN</label>
                <div className="relative">
                  <input 
                    type="text" placeholder="Leave blank if independent foster"
                    value={formData.ein} onChange={(e) => setFormData({...formData, ein: e.target.value})}
                    className="w-full bg-white border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <FileText size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Website or Social Media *</label>
                <div className="relative">
                  <input 
                    type="url" required={isOrg} placeholder="https://instagram.com/..."
                    value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="w-full bg-white border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <Globe size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Network References *</label>
                <div className="relative">
                  <textarea 
                    required={isOrg} placeholder="List partner shelters or clinics that can vouch for you..."
                    value={formData.references} onChange={(e) => setFormData({...formData, references: e.target.value})}
                    className="w-full bg-white border border-slate-300 p-3 pl-10 rounded-lg h-20 resize-none text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  ></textarea>
                  <Users size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-3">
                <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Submitting this information places your account in a pending status. We verify all organizations before unlocking custody transfer and donation features.
                </p>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : saveSuccess ? <><Check size={18} /> Saved Successfully</> : 'Save Profile Settings'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}