import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ShieldCheck, Clock, Building, FileText, 
  Globe, User, Users, AlertCircle, 
  CreditCard, X
} from 'lucide-react';

export default function ProfileSettings() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Rescue Application State
  const [applicationStatus, setApplicationStatus] = useState(null); // null, 'pending', 'approved', 'rejected'
  const [isApplying, setIsApplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    orgName: '',
    ein: '',
    website: '',
    socials: '',
    role: 'Founder / Director',
    references: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkRescueStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const checkRescueStatus = async (userId) => {
    const { data } = await supabase
      .from('rescue_partners')
      .select('status, is_verified, name')
      .eq('user_id', userId)
      .single();

    if (data) {
      setApplicationStatus(data.status);
    }
    setLoading(false);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      user_id: session.user.id,
      email: session.user.email,
      name: formData.orgName,
      ein: formData.ein,
      website: formData.website,
      social_links: formData.socials,
      applicant_role: formData.role,
      reference_info: formData.references,
      status: 'pending',
      is_verified: false
    };

    const { error } = await supabase.from('rescue_partners').insert([payload]);

    if (!error) {
      setApplicationStatus('pending');
      setIsApplying(false);
    } else {
      alert("Failed to submit application. You may have already applied.");
      console.error(error);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading profile...</div>;

  if (!session) {
    return (
      <div className="p-8 text-center mt-10">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-600 text-sm">Please log in to view your profile settings.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 font-sans text-slate-900">
      <div className="bg-white p-4 border-b border-slate-200 sticky top-[72px] z-10 shadow-sm">
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">{session.user.email}</p>
      </div>

      <main className="p-4 space-y-6">

        {/* --- STANDARD PROFILE SECTION --- */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Personal Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
              <p className="text-sm font-medium text-slate-800">{session.user.email}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* --- STATUS: APPROVED --- */}
        {applicationStatus === 'approved' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <ShieldCheck size={24} />
              <h2 className="text-lg font-black tracking-tight">Verified Rescue Partner</h2>
            </div>
            <p className="text-sm text-emerald-800/80 mb-5 leading-relaxed">
              Your organization has been fully vetted. You can now claim animals, set funding goals, and manage your connected payout accounts.
            </p>
            
            <div className="bg-white p-4 rounded-xl border border-emerald-100 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5"><CreditCard size={16} className="text-slate-400" /> Payout Settings</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">Action Required</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">Connect your official rescue bank account to receive donations directly from StrayGuard.</p>
              <button onClick={() => alert("Stripe onboarding flow will trigger here in the next phase!")} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-colors">
                Connect with Stripe
              </button>
            </div>
          </div>
        )}

        {/* --- STATUS: PENDING --- */}
        {applicationStatus === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center shadow-sm">
            <Clock size={32} className="mx-auto text-amber-500 mb-3" />
            <h2 className="text-lg font-black text-amber-800 tracking-tight mb-2">Application Under Review</h2>
            <p className="text-sm text-amber-700/80 leading-relaxed">
              Our team is verifying your EIN and references to ensure platform safety. This typically takes 24-48 hours. We will email you once approved.
            </p>
          </div>
        )}

        {/* --- STATUS: NONE (Prompt Card) --- */}
        {!applicationStatus && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={24} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight mb-2">Are you a Rescue or Foster?</h2>
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Verified organizations can claim animals, post official medical updates, and accept direct, transparent donations to cover emergency care.
            </p>
            <button 
              onClick={() => setIsApplying(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors text-sm"
            >
              Apply for Verification
            </button>
          </div>
        )}
      </main>

      {/* --- APPLICATION MODAL --- */}
      {isApplying && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center max-w-md mx-auto transition-all">
          <div className="bg-white w-full rounded-t-2xl sm:rounded-2xl p-5 h-[85vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Verification Application</h2>
              <button onClick={() => setIsApplying(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleApply} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Official Organization Name</label>
                <div className="relative">
                  <input 
                    type="text" required
                    value={formData.orgName} onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., Downtown Dog Rescue"
                  />
                  <Building size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">501(c)(3) EIN (If applicable)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.ein} onChange={(e) => setFormData({...formData, ein: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="XX-XXXXXXX"
                  />
                  <FileText size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-tight">If you are an independent foster network without an EIN, leave blank and provide references below.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Website or Main Social Media</label>
                <div className="relative">
                  <input 
                    type="url" required
                    value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="https://instagram.com/..."
                  />
                  <Globe size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Your Role</label>
                <div className="relative">
                  <select 
                    value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
                  >
                    <option value="Founder / Director">Founder / Director</option>
                    <option value="Board Member">Board Member</option>
                    <option value="Volunteer / Foster Coordinator">Volunteer / Foster Coordinator</option>
                    <option value="Independent Vetted Foster">Independent Vetted Foster</option>
                  </select>
                  <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Network References</label>
                <div className="relative">
                  <textarea 
                    required
                    value={formData.references} onChange={(e) => setFormData({...formData, references: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg h-24 resize-none text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Please list a partner shelter, clinic, or verified rescue that can vouch for your intake track record..."
                  ></textarea>
                  <Users size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600 leading-relaxed">
                    By submitting this application, you agree to our terms of transparency. Submitting fraudulent medical bills or failing to update outcomes on funded animals will result in an immediate platform ban.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Application...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}