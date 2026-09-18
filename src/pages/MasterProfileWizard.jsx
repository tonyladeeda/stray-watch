import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  User, Home, PawPrint, Clock, FileText, 
  ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Save
} from 'lucide-react';

export default function MasterProfileWizard() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    // Step 1: Basics
    age: '', spouseName: '', address: '', socialMedia: '', householdMembers: '', emergencyContact: '',
    // Step 2: Environment
    dwellingType: 'House', rentOrOwn: 'Own', landlordInfo: '', hoursAlone: '', fenceDetails: '', pool: false, escapePlan: '',
    // Step 3: Pack & Experience
    experienceLevel: 5, childrenExperience: '', currentPets: '', socializationRating: 5, petHistory: '',
    // Step 4: Daily Life
    primaryReason: '', sleepingArrangement: '', exerciseLevel: 'Average Energy', disciplineMethod: '', allergies: false,
    // Step 5: Agreements
    agreedNoAversive: false, agreedAdjustment: false, agreedNoTransfer: false, agreedProperty: false
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        navigate('/');
        return;
      }
      setSession(currentSession);

      const { data: profile } = await supabase
        .from('directory_profiles')
        .select('foster_details')
        .eq('user_id', currentSession.user.id)
        .single();
      
      if (profile?.foster_details && Object.keys(profile.foster_details).length > 0) {
        setFormData(prev => ({ ...prev, ...profile.foster_details }));
      }
      setIsLoading(false);
    };
    
    fetchData();
  }, [navigate]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleNext = (e) => {
    e.preventDefault();
    setStep(prev => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSaveProgress = async () => {
    setIsSubmitting(true);
    await supabase.from('directory_profiles').update({ foster_details: formData }).eq('user_id', session.user.id);
    setIsSubmitting(false);
    navigate('/profile');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from('directory_profiles').update({
      foster_details: formData,
    }).eq('user_id', session.user.id);

    setIsSubmitting(false);
    
    if (!error) {
      navigate('/profile');
    } else {
      alert("Error saving profile: " + error.message);
    }
  };

  const steps = [
    { id: 1, title: 'The Basics', icon: <User size={20} /> },
    { id: 2, title: 'Environment', icon: <Home size={20} /> },
    { id: 3, title: 'Experience', icon: <PawPrint size={20} /> },
    { id: 4, title: 'Daily Life', icon: <Clock size={20} /> },
    { id: 5, title: 'Agreements', icon: <FileText size={20} /> }
  ];

  if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold">Loading your application...</div>;

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] flex flex-col font-sans text-slate-900 pb-10">
      
      {/* Header & Progress Bar */}
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 shadow-sm px-4 py-4 flex flex-col gap-4">
        <div className="flex justify-between items-center w-full">
          <button onClick={() => navigate('/profile')} className="text-sm font-bold text-slate-400 hover:text-slate-600">Cancel</button>
          <h2 className="font-black text-lg text-slate-800">Master Profile Setup</h2>
          <button onClick={handleSaveProgress} disabled={isSubmitting} className="text-sm font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1">
            <Save size={16}/> Save & Exit
          </button>
        </div>
        
        {/* Progress Track */}
        <div className="w-full flex justify-between relative mt-2">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-0 h-1 bg-cyan-500 -z-10 -translate-y-1/2 transition-all duration-300" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
          {steps.map(s => (
            <div key={s.id} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${step >= s.id ? 'bg-cyan-500 border-cyan-500 text-white shadow-md' : 'bg-white border-slate-200 text-slate-300'}`}>
              {step > s.id ? <CheckCircle2 size={16} /> : s.id}
            </div>
          ))}
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-grow p-4">
        <form onSubmit={step === 5 ? handleSubmit : handleNext} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-full">
              {steps[step - 1].icon}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">{steps[step - 1].title}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complete once. Apply anywhere.</p>
            </div>
          </div>

          {/* STEP 1: The Basics */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Age</label>
                  <input type="number" name="age" required value={formData.age} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Emergency Contact</label>
                  <input type="text" name="emergencyContact" required placeholder="Name & Phone" value={formData.emergencyContact} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Street Address</label>
                <input type="text" name="address" required value={formData.address} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Household Members (Name / Age / Relation)</label>
                <textarea name="householdMembers" required value={formData.householdMembers} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Social Media Handles (Optional)</label>
                <input type="text" name="socialMedia" placeholder="@username (IG, TikTok)" value={formData.socialMedia} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>
          )}

          {/* STEP 2: Environment */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dwelling Type</label>
                  <select name="dwellingType" value={formData.dwellingType} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500">
                    <option>House</option>
                    <option>Townhome</option>
                    <option>Apartment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rent / Own</label>
                  <select name="rentOrOwn" value={formData.rentOrOwn} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500">
                    <option>Own</option>
                    <option>Rent</option>
                  </select>
                </div>
              </div>
              {formData.rentOrOwn === 'Rent' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Landlord Info & Permissions</label>
                  <input type="text" name="landlordInfo" required placeholder="Landlord Name & Phone" value={formData.landlordInfo} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fence & Yard Details</label>
                <textarea name="fenceDetails" required placeholder="Material, height, locks on gates? Any pools?" value={formData.fenceDetails} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Escape Prevention Plan</label>
                <textarea name="escapePlan" required placeholder="If your foster escaped, what is your plan to recover them?" value={formData.escapePlan} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>
          )}

          {/* STEP 3: Experience */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Self-Rated Handling Experience</label>
                <input type="range" name="experienceLevel" min="1" max="10" value={formData.experienceLevel} onChange={handleChange} className="w-full accent-cyan-600" />
                <div className="text-center text-xs font-black text-cyan-600 mt-1">{formData.experienceLevel} / 10</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Pets (Species, Age, Altered?)</label>
                <textarea name="currentPets" placeholder="Leave blank if no current pets." value={formData.currentPets} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              {formData.currentPets && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Pets Socialization Rating</label>
                  <input type="range" name="socializationRating" min="1" max="10" value={formData.socializationRating} onChange={handleChange} className="w-full accent-cyan-600" />
                  <div className="text-center text-xs font-black text-cyan-600 mt-1">{formData.socializationRating} / 10</div>
                  <p className="text-[10px] text-slate-400 text-center mt-1">1 = Reactive/Antisocial, 10 = Perfectly friendly with all dogs.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pet History</label>
                <textarea name="petHistory" required placeholder="Have you ever surrendered an animal? Have you dealt with behavioral issues?" value={formData.petHistory} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>
          )}

          {/* STEP 4: Daily Life */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">How many hours will the dog be alone daily?</label>
                <input type="text" name="hoursAlone" required value={formData.hoursAlone} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Where will the dog sleep at night?</label>
                <input type="text" name="sleepingArrangement" required value={formData.sleepingArrangement} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preferred Exercise Level</label>
                <select name="exerciseLevel" value={formData.exerciseLevel} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500">
                  <option>Couch Potato</option>
                  <option>Average Energy</option>
                  <option>Active / High Energy</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">How would you discipline misbehavior?</label>
                <textarea name="disciplineMethod" required value={formData.disciplineMethod} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input type="checkbox" name="allergies" checked={formData.allergies} onChange={handleChange} className="w-5 h-5 text-cyan-600 rounded" />
                <span className="text-sm font-bold text-slate-700">Someone in the home has animal-related allergies.</span>
              </label>
            </div>
          )}

          {/* STEP 5: Agreements */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 mb-6 flex gap-3">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-rose-800 leading-relaxed font-bold">
                  By checking these boxes, you agree to the binding terms of fostering and adopting through verified rescue partners on the StrayGuard network.
                </p>
              </div>

              {[
                { key: 'agreedNoAversive', label: "No Aversive Tools", desc: "I will NOT use prong collars, shock collars, choke chains, or retractable leashes." },
                { key: 'agreedProperty', label: "Veterinary Care & Property", desc: "I understand a foster dog remains the legal property of the rescue. I will not authorize vet care without approval." },
                { key: 'agreedNoTransfer', label: "No Third-Party Transfers", desc: "I will never sell, give away, or independently rehome a foster or adopted rescue dog." },
                { key: 'agreedAdjustment', label: "The Adjustment Period", desc: "I understand scuffles with resident animals may happen during decompression and this alone is not grounds for an immediate return." }
              ].map(term => (
                <label key={term.key} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${formData[term.key] ? 'bg-cyan-50 border-cyan-300' : 'bg-white border-slate-200 hover:border-cyan-300'}`}>
                  <input type="checkbox" name={term.key} required checked={formData[term.key]} onChange={handleChange} className="w-5 h-5 text-cyan-600 rounded mt-0.5" />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">{term.label}</span>
                    <span className="block text-xs text-slate-500 leading-tight mt-1">{term.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex gap-3 pt-6 border-t border-slate-100">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="px-6 py-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2">
                <ChevronLeft size={18} /> Back
              </button>
            )}
            
            <button type="submit" disabled={isSubmitting} className="flex-grow bg-cyan-600 hover:bg-cyan-700 text-white font-black py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {step === 5 ? (
                isSubmitting ? 'Saving Profile...' : 'Sign Agreements & Finish'
              ) : (
                <>Next Step <ChevronRight size={18} /></>
              )}
            </button>
          </div>
          
        </form>
      </div>
    </div>
  );
}