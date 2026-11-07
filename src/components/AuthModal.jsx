import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  X, Mail, Lock, User, ShieldCheck, Heart, Camera, 
  Building, Phone, ArrowLeft, CheckCircle2
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function AuthModal({ isOpen, onClose }) {
  // Views: 'auth', 'personal', 'role', 'rescue_setup'
  const [view, setView] = useState('auth'); 
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Personal Info State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Rescue Setup State
  const [rescueData, setRescueData] = useState({
    orgName: '', ein: '', website: '', orgEmail: '', orgPhone: '',
    isOwner: true, ownerName: '', ownerEmail: '', alsoFoster: false
  });

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !session.user.user_metadata?.onboarding_complete) {
          // Auto-populate from Google OAuth if available
          const meta = session.user.user_metadata;
          const splitName = meta.full_name?.split(' ') || [];
          setFirstName(meta.first_name || splitName[0] || '');
          setLastName(meta.last_name || splitName.slice(1).join(' ') || '');
          setPhone(session.user.phone || meta.phone || '');
          
          setRescueData(prev => ({
            ...prev,
            orgEmail: session.user.email,
            orgPhone: session.user.phone || meta.phone || ''
          }));
          
          setView('personal');
        } else {
          setView('auth');
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      alert(error.message);
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else onClose();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else if (data.user) {
        setRescueData(prev => ({ ...prev, orgEmail: email }));
        setView('personal');
      }
    }
    setLoading(false);
  };

  // --- STEP 1: SAVE PERSONAL INFO ---
  const handlePersonalInfoSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName, phone: phone }
      });

      // Upsert profile immediately so relational DB constraints are satisfied
      await supabase.from('profiles').upsert([{
        id: session.user.id,
        first_name: firstName,
        last_name: lastName,
        avatar_url: session.user.user_metadata?.avatar_url || null
      }]);
      
      setView('role');
    }
    setLoading(false);
  };

  // --- STEP 2 & 3: FINALIZE WORKFLOW ---
  const finalizeOnboarding = async (accountType, customRescueData = null, isSafeClose = false) => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const safeFirstName = firstName || session.user.email.split('@')[0];
    const safeLastName = lastName || '';
    const fullName = `${safeFirstName} ${safeLastName}`.trim();
    const safePhone = phone || '';

    // 1. Create Directory Profile
    const dirPayload = {
      user_id: session.user.id,
      type: accountType === 'Spotter' ? 'Community' : accountType,
      name: fullName,
      email: session.user.email,
      phone: safePhone,
      is_approved: false
    };

    if (accountType === 'Foster' || customRescueData?.alsoFoster) {
      dirPayload.availability_status = 'Available';
      dirPayload.open_to_foster = true;
    }
    
    await supabase.from('directory_profiles').upsert([dirPayload], { onConflict: 'user_id' });

    // 2. Setup Rescue Workspace (If Applicable)
    if (accountType === 'Rescue' && customRescueData) {
      const { data: rescue, error: rescueError } = await supabase
        .from('rescue_partners')
        .insert([{
          user_id: session.user.id,
          name: customRescueData.orgName,
          email: customRescueData.orgEmail,
          ein: customRescueData.ein,
          website: customRescueData.website,
          status: 'pending'
        }])
        .select()
        .single();

      if (rescueError) {
        alert("Error creating Rescue workspace: " + rescueError.message);
        setLoading(false);
        return;
      }

      await supabase.from('rescue_team_members').insert([{
        rescue_id: rescue.id,
        user_id: session.user.id,
        role: customRescueData.isOwner ? 'owner' : 'admin'
      }]);
    }

    // 3. Mark Onboarding Complete
    await supabase.auth.updateUser({ 
      data: { onboarding_complete: true, account_type: accountType } 
    });

    setLoading(false);
    
    if (accountType === 'Rescue' && !isSafeClose) {
      alert("Rescue Workspace Created! Taking you to settings to complete setup.");
      window.location.href = '/profile'; // Redirect to settings to see their new workspace
    } else {
      onClose();
    }
  };

  // Safe Close prevents users from getting trapped in a loop if they click X
  const handleSafeClose = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && !session.user.user_metadata?.onboarding_complete) {
      await supabase.from('profiles').upsert([{ id: session.user.id }]);
      await finalizeOnboarding('Spotter', null, true);
    } else {
      onClose();
    }
  };

  // Dynamic Header Text
  const getHeaderTitle = () => {
    if (view === 'auth') return isLogin ? 'Welcome Back' : 'Create Account';
    if (view === 'personal') return 'Step 1: Basic Info';
    if (view === 'role') return 'Step 2: Choose Role';
    if (view === 'rescue_setup') return 'Step 3: Rescue Details';
  };

  // Progress Bar Width
  const getProgress = () => {
    if (view === 'personal') return 'w-1/3';
    if (view === 'role') return 'w-2/3';
    if (view === 'rescue_setup') return 'w-full';
    return 'w-0';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center max-w-md mx-auto transition-all">
      <div className="bg-white w-full rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 relative">
          {/* Progress Bar (Only visible during onboarding wizard) */}
          {view !== 'auth' && (
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-200">
              <div className={`h-full bg-cyan-500 transition-all duration-500 ${getProgress()}`}></div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            {(view === 'role' || view === 'rescue_setup') && (
              <button onClick={() => setView(view === 'rescue_setup' ? 'role' : 'personal')} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="font-black text-slate-800 text-lg">{getHeaderTitle()}</h2>
          </div>
          
          <button onClick={handleSafeClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors mt-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          
          {/* --- AUTH VIEW --- */}
          {view === 'auth' && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                <div className="relative">
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                  <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                  <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-4 rounded-xl shadow-md transition-all text-lg mt-2 disabled:opacity-50">
                {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Continue')}
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              <button 
                type="button" 
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <GoogleIcon /> Continue with Google
              </button>

              <p className="text-center text-sm font-bold text-slate-500 mt-4">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-cyan-600 hover:underline">
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </form>
          )}

          {/* --- STEP 1: PERSONAL INFO --- */}
          {view === 'personal' && (
            <form onSubmit={handlePersonalInfoSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-100 flex gap-3 mb-2">
                <CheckCircle2 className="text-cyan-600 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-cyan-800">Please provide your contact details. This ensures rescues can reach you safely.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Phone *</label>
                <div className="relative">
                  <input type="tel" required placeholder="(555) 555-5555" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                  <Phone size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-md transition-all text-lg mt-4 disabled:opacity-50">
                {loading ? 'Saving...' : 'Next Step'}
              </button>
            </form>
          )}

          {/* --- STEP 2: ROLE SELECTION --- */}
          {view === 'role' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="font-bold text-slate-800 mb-2">How do you plan to use StrayGuard?</h3>
              
              <button onClick={() => finalizeOnboarding('Spotter')} className="w-full flex items-center gap-4 p-4 border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 rounded-2xl transition-all text-left group">
                <div className="bg-slate-100 group-hover:bg-cyan-100 p-3 rounded-full shrink-0"><Camera size={24} className="text-cyan-600" /></div>
                <div>
                  <p className="font-black text-slate-800">Community Spotter</p>
                  <p className="text-xs text-slate-500">I just want to report stray animals and follow their rescue journey.</p>
                </div>
              </button>

              <button onClick={() => finalizeOnboarding('Foster')} className="w-full flex items-center gap-4 p-4 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all text-left group">
                <div className="bg-slate-100 group-hover:bg-blue-100 p-3 rounded-full shrink-0"><Heart size={24} className="text-blue-600" /></div>
                <div>
                  <p className="font-black text-slate-800">Foster Home</p>
                  <p className="text-xs text-slate-500">Create a profile to easily apply to foster animals from verified rescues.</p>
                </div>
              </button>

              <button onClick={() => setView('rescue_setup')} className="w-full flex items-center gap-4 p-4 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-2xl transition-all text-left group">
                <div className="bg-slate-100 group-hover:bg-indigo-100 p-3 rounded-full shrink-0"><ShieldCheck size={24} className="text-indigo-600" /></div>
                <div>
                  <p className="font-black text-slate-800">Rescue Organization</p>
                  <p className="text-xs text-slate-500">I represent a 501(c)(3) rescue looking to manage intakes and fosters.</p>
                </div>
              </button>
            </div>
          )}

          {/* --- STEP 3: RESCUE SETUP --- */}
          {view === 'rescue_setup' && (
            <form onSubmit={(e) => { e.preventDefault(); finalizeOnboarding('Rescue', rescueData); }} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Name *</label>
                <input type="text" required placeholder="e.g., Downtown Dog Rescue" value={rescueData.orgName} onChange={e => setRescueData({...rescueData, orgName: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Org Email *</label>
                  <input type="email" required value={rescueData.orgEmail} onChange={e => setRescueData({...rescueData, orgEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Org Phone *</label>
                  <input type="tel" required value={rescueData.orgPhone} onChange={e => setRescueData({...rescueData, orgPhone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">501(c)(3) EIN</label>
                  <input type="text" placeholder="Optional for now" value={rescueData.ein} onChange={e => setRescueData({...rescueData, ein: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Website URL *</label>
                  <input type="url" required placeholder="https://" value={rescueData.website} onChange={e => setRescueData({...rescueData, website: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 mt-2 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={rescueData.isOwner} onChange={e => setRescueData({...rescueData, isOwner: e.target.checked})} className="w-5 h-5 accent-indigo-600 rounded" />
                  <span className="text-sm font-bold text-slate-800">I am the Owner/Director of this Rescue</span>
                </label>
                
                {!rescueData.isOwner && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Owner Invitation Info</p>
                    <input type="text" required placeholder="Owner's Full Name" value={rescueData.ownerName} onChange={e => setRescueData({...rescueData, ownerName: e.target.value})} className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <input type="email" required placeholder="Owner's Email Address" value={rescueData.ownerEmail} onChange={e => setRescueData({...rescueData, ownerEmail: e.target.value})} className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={rescueData.alsoFoster} onChange={e => setRescueData({...rescueData, alsoFoster: e.target.checked})} className="w-5 h-5 accent-indigo-600 rounded" />
                  <span className="text-sm font-bold text-slate-800">I also want to foster animals</span>
                </label>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-md transition-all text-lg mt-4 disabled:opacity-50">
                {loading ? 'Processing...' : 'Complete Setup'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}