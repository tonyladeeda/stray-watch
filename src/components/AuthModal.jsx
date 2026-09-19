import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  X, Mail, Lock, User, ShieldCheck, Heart, Camera, 
  Home, ShieldAlert, Building, CreditCard
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
  const [view, setView] = useState('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [rescueData, setRescueData] = useState({
    orgName: '', ein: '', website: '', phone: ''
  });

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !session.user.user_metadata?.onboarding_complete) {
          const meta = session.user.user_metadata;
          const splitName = meta.full_name?.split(' ') || [];
          setFirstName(meta.first_name || splitName[0] || '');
          setLastName(meta.last_name || splitName.slice(1).join(' ') || '');
          setView('role');
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

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else onClose();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { first_name: firstName, last_name: lastName } }
      });
      if (error) alert(error.message);
      else if (data.user) setView('role');
    }
    setLoading(false);
  };

  // Stamp the role directly into the Auth user_metadata
  const finalizeOnboarding = async (accountType = 'Spotter') => {
    const { error } = await supabase.auth.updateUser({ 
      data: { 
        onboarding_complete: true,
        account_type: accountType
      } 
    });
    
    if (error) {
      alert("Error finalizing profile: " + error.message);
    } else {
      onClose();
    }
  };

  const handleFosterSetup = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const { error: dirError } = await supabase.from('directory_profiles').upsert([{
        user_id: session.user.id,
        type: 'Foster',
        name: `${firstName} ${lastName}`.trim(),
        email: session.user.email,
        phone: session.user.phone || '',
        availability_status: 'Available',
        foster_details: {},
        is_approved: false
      }], { onConflict: 'user_id' });

      if (dirError) {
        alert("Error creating Foster profile: " + dirError.message);
        setLoading(false);
        return;
      }
      
      await finalizeOnboarding('Foster');
    }
    setLoading(false);
  };

  const handleRescueSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // 1. Create Rescue Partner Record
      const { error: rescueError } = await supabase.from('rescue_partners').upsert([{
        user_id: session.user.id,
        email: session.user.email,
        name: rescueData.orgName,
        ein: rescueData.ein,
        website: rescueData.website,
        status: 'pending',
        is_verified: false
      }], { onConflict: 'user_id' });

      if (rescueError) {
        alert("Database Error (Rescue Partners): " + rescueError.message);
        setLoading(false);
        return;
      }

      // 2. Create Directory Profile
      const { error: dirError } = await supabase.from('directory_profiles').upsert([{
        user_id: session.user.id,
        type: 'Rescue',
        name: rescueData.orgName,
        email: session.user.email,
        phone: rescueData.phone,
        is_approved: false
      }], { onConflict: 'user_id' });
      
      if (dirError) {
        alert("Database Error (Directory): " + dirError.message);
        setLoading(false);
        return;
      }
      
      // 3. Finalize and tag as Rescue
      await finalizeOnboarding('Rescue');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center max-w-md mx-auto transition-all">
      <div className="bg-white w-full rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="font-black text-slate-800 text-lg">
            {view === 'auth' ? (isLogin ? 'Welcome Back' : 'Create Account') : 'Complete Your Profile'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {view === 'auth' && (
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                  </div>
                </div>
              )}
              
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
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="text-center text-sm font-bold text-slate-500 mt-4">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-cyan-600 hover:underline">
                  {isLogin ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </form>
          )}

          {view === 'role' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="font-bold text-slate-800 mb-2">How do you plan to use StrayGuard?</h3>
              
              <button onClick={async () => {
                setLoading(true);
                await finalizeOnboarding('Spotter');
                setLoading(false);
              }} className="w-full flex items-center gap-4 p-4 border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 rounded-2xl transition-all text-left group">
                <div className="bg-slate-100 group-hover:bg-cyan-100 p-3 rounded-full shrink-0"><Camera size={24} className="text-cyan-600" /></div>
                <div>
                  <p className="font-black text-slate-800">Community Spotter</p>
                  <p className="text-xs text-slate-500">I just want to report stray animals and follow their rescue journey.</p>
                </div>
              </button>

              <button onClick={handleFosterSetup} className="w-full flex items-center gap-4 p-4 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all text-left group">
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

          {view === 'rescue_setup' && (
            <form onSubmit={handleRescueSetup} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mb-4 flex gap-3">
                <ShieldAlert className="text-indigo-600 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-indigo-800">Your organization will be placed in a pending state while we verify your 501(c)(3) status and network references.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Name *</label>
                <input type="text" required placeholder="e.g., Downtown Dog Rescue" value={rescueData.orgName} onChange={e => setRescueData({...rescueData, orgName: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">501(c)(3) EIN</label>
                  <input type="text" placeholder="Optional for now" value={rescueData.ein} onChange={e => setRescueData({...rescueData, ein: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Public Phone *</label>
                  <input type="tel" required value={rescueData.phone} onChange={e => setRescueData({...rescueData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Website URL *</label>
                <input type="url" required placeholder="https://" value={rescueData.website} onChange={e => setRescueData({...rescueData, website: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-md transition-all text-lg mt-2 disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit Rescue Application'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}