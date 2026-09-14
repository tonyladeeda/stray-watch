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

  const [fosterData, setFosterData] = useState({
    phone: '', dwellingType: 'House', rentOrOwn: 'Own', 
    landlordPermission: false, fencedYard: false, 
    fenceDetails: '', experienceLevel: 5, currentPets: ''
  });
  
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

  const finalizeOnboarding = async () => {
    await supabase.auth.updateUser({ data: { onboarding_complete: true } });
    onClose();
  };

  const handleFosterSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      await supabase.from('directory_profiles').upsert([{
        user_id: session.user.id,
        type: 'Foster',
        name: `${firstName} ${lastName}`.trim(),
        email: session.user.email,
        phone: fosterData.phone,
        availability_status: 'Available',
        foster_details: {
          dwellingType: fosterData.dwellingType,
          rentOrOwn: fosterData.rentOrOwn,
          landlordPermission: fosterData.landlordPermission,
          fencedYard: fosterData.fencedYard,
          fenceDetails: fosterData.fenceDetails,
          experienceLevel: fosterData.experienceLevel,
          currentPets: fosterData.currentPets
        },
        is_approved: false
      }], { onConflict: 'user_id' });
      await finalizeOnboarding();
    }
    setLoading(false);
  };

  const handleRescueSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      await supabase.from('rescue_partners').upsert([{
        user_id: session.user.id,
        email: session.user.email,
        name: rescueData.orgName,
        ein: rescueData.ein,
        website: rescueData.website,
        status: 'pending',
        is_verified: false
      }], { onConflict: 'user_id' });

      await supabase.from('directory_profiles').upsert([{
        user_id: session.user.id,
        type: 'Rescue',
        name: rescueData.orgName,
        email: session.user.email,
        phone: rescueData.phone,
        is_approved: false
      }], { onConflict: 'user_id' });
      
      await finalizeOnboarding();
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
                await finalizeOnboarding();
                setLoading(false);
              }} className="w-full flex items-center gap-4 p-4 border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 rounded-2xl transition-all text-left group">
                <div className="bg-slate-100 group-hover:bg-cyan-100 p-3 rounded-full shrink-0"><Camera size={24} className="text-cyan-600" /></div>
                <div>
                  <p className="font-black text-slate-800">Community Spotter</p>
                  <p className="text-xs text-slate-500">I just want to report stray animals and follow their rescue journey.</p>
                </div>
              </button>

              <button onClick={() => setView('foster_setup')} className="w-full flex items-center gap-4 p-4 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all text-left group">
                <div className="bg-slate-100 group-hover:bg-blue-100 p-3 rounded-full shrink-0"><Heart size={24} className="text-blue-600" /></div>
                <div>
                  <p className="font-black text-slate-800">Foster Home</p>
                  <p className="text-xs text-slate-500">I have space in my home to temporarily care for rescued animals.</p>
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

          {view === 'foster_setup' && (
            <form onSubmit={handleFosterSetup} className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 flex gap-3">
                <Home className="text-blue-600 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Your profile acts as your master foster application. Complete it once, and you can securely apply to take in animals from any verified rescue network with a single click.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name *</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name *</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Phone Number *</label>
                <input type="tel" required placeholder="(555) 555-5555" value={fosterData.phone} onChange={e => setFosterData({...fosterData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dwelling Type</label>
                  <select value={fosterData.dwellingType} onChange={e => setFosterData({...fosterData, dwellingType: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option>House</option>
                    <option>Townhome</option>
                    <option>Apartment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rent / Own</label>
                  <select value={fosterData.rentOrOwn} onChange={e => setFosterData({...fosterData, rentOrOwn: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Own</option>
                    <option>Rent</option>
                  </select>
                </div>
              </div>

              {fosterData.rentOrOwn === 'Rent' && (
                <label className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer transition-colors hover:border-amber-300">
                  <input type="checkbox" checked={fosterData.landlordPermission} onChange={e => setFosterData({...fosterData, landlordPermission: e.target.checked})} className="w-5 h-5 text-amber-600 rounded" />
                  <span className="text-xs font-bold text-amber-900">I have written permission from my landlord to foster.</span>
                </label>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={fosterData.fencedYard} onChange={e => setFosterData({...fosterData, fencedYard: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                  <span className="text-sm font-bold text-slate-700">The yard is completely fenced.</span>
                </label>
                {fosterData.fencedYard && (
                  <input type="text" placeholder="Fence material and height (e.g. 6ft Wood)" required={fosterData.fencedYard} value={fosterData.fenceDetails} onChange={e => setFosterData({...fosterData, fenceDetails: e.target.value})} className="w-full bg-white border border-slate-300 p-3 rounded-lg text-sm mt-3 outline-none focus:ring-2 focus:ring-blue-500" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dog-Handling Experience</label>
                <input type="range" min="1" max="10" value={fosterData.experienceLevel} onChange={e => setFosterData({...fosterData, experienceLevel: parseInt(e.target.value)})} className="w-full accent-blue-600" />
                <div className="text-center text-xs font-black text-blue-600 mt-1">{fosterData.experienceLevel} / 10</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Pets</label>
                <textarea required placeholder="Species, age, temperament, vaccinated?" value={fosterData.currentPets} onChange={e => setFosterData({...fosterData, currentPets: e.target.value})} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl h-20 resize-none text-sm outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-md transition-all text-lg mt-4 disabled:opacity-50">
                {loading ? 'Saving Master Profile...' : 'Save Master Profile'}
              </button>
            </form>
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