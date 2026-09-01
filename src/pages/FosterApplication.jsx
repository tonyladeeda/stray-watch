import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Heart, Home, ShieldAlert, CheckCircle2, 
  ArrowLeft, FileText, AlertTriangle 
} from 'lucide-react';

export default function FosterApplication() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '', dwellingType: 'House', rentOrOwn: 'Own', 
    landlordPermission: false, hoursAlone: '',
    fencedYard: false, fenceDetails: '', poolAccess: false,
    experienceLevel: 5, currentPets: '', petSocialization: 5,
    agreedProperty: false, agreedVet: false, agreedTransfers: false, agreedCrate: false
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkExistingApplication(session.user.id);
      else setLoading(false);
    });
  }, []);

  const checkExistingApplication = async (userId) => {
    const { data } = await supabase
      .from('foster_applications')
      .select('status')
      .eq('user_id', userId)
      .single();

    if (data) setHasApplied(true);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 1. Submit the detailed application
    const appPayload = {
      user_id: session.user.id,
      full_name: formData.fullName,
      dwelling_type: formData.dwellingType,
      rent_or_own: formData.rentOrOwn,
      landlord_permission: formData.landlordPermission,
      hours_alone: formData.hoursAlone,
      fenced_yard: formData.fencedYard,
      fence_details: formData.fenceDetails,
      pool_access: formData.poolAccess,
      experience_level: formData.experienceLevel,
      current_pets: formData.currentPets,
      pet_socialization: formData.petSocialization,
      agreed_property_rights: formData.agreedProperty,
      agreed_vet_care: formData.agreedVet,
      agreed_no_transfers: formData.agreedTransfers,
      agreed_crate_training: formData.agreedCrate
    };

    const { error: appError } = await supabase.from('foster_applications').insert([appPayload]);

    // 2. Create a hidden directory profile (is_approved = false)
    if (!appError) {
      await supabase.from('directory_profiles').insert([{
        user_id: session.user.id,
        type: 'Foster',
        name: formData.fullName,
        email: session.user.email,
        phone: 'Pending',
        is_approved: false
      }]);
      setHasApplied(true);
    } else {
      alert("Error submitting application.");
    }
    setIsSubmitting(false);
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  if (loading) return <div className="p-8 text-center font-bold text-slate-500">Loading...</div>;
  if (!session) return <div className="p-8 text-center font-bold text-slate-500">Please log in to apply.</div>;

  if (hasApplied) {
    return (
      <div className="p-6 max-w-md mx-auto text-center mt-10 space-y-4">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText size={40} className="text-amber-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Application Pending</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your foster application is currently under review by our team. Your profile will feature a pending badge in your settings until approved, at which point it will be published to the public directory.
        </p>
        <button onClick={() => navigate('/profile')} className="mt-4 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl w-full">
          Return to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <div className="bg-white p-3 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full text-slate-600"><ArrowLeft size={20}/></button>
        <h1 className="text-lg font-black text-slate-800">Foster Application</h1>
      </div>

      <main className="p-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 flex gap-3">
          <Heart className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            Thank you for opening your home! Please complete this form in full. Fostering is a serious commitment, and your foster animal remains the sole legal property of the rescue network until a permanent placement is finalized.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Home Environment */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Home size={18} className="text-slate-400" /> Home Environment
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
              <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dwelling Type</label>
                <select name="dwellingType" value={formData.dwellingType} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none">
                  <option value="House">House</option>
                  <option value="Townhome">Townhome</option>
                  <option value="Apartment">Apartment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rent / Own</label>
                <select name="rentOrOwn" value={formData.rentOrOwn} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm outline-none">
                  <option value="Own">Own</option>
                  <option value="Rent">Rent</option>
                </select>
              </div>
            </div>

            {formData.rentOrOwn === 'Rent' && (
              <label className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
                <input type="checkbox" name="landlordPermission" checked={formData.landlordPermission} onChange={handleChange} className="w-5 h-5 text-amber-600 rounded" />
                <span className="text-xs font-bold text-amber-900">I have written permission from my landlord to foster.</span>
              </label>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fenced Yard?</label>
              <label className="flex items-center gap-3 cursor-pointer mb-2">
                <input type="checkbox" name="fencedYard" checked={formData.fencedYard} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded" />
                <span className="text-sm font-medium">Yes, the yard is completely fenced.</span>
              </label>
              {formData.fencedYard && (
                <input type="text" name="fenceDetails" placeholder="Fence material and height (e.g. 6ft Wood)" value={formData.fenceDetails} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm mt-1" />
              )}
            </div>
          </div>

          {/* Section 2: Experience */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <ShieldAlert size={18} className="text-slate-400" /> Handling & Experience
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dog-Handling Experience (1 = Beginner, 10 = Expert)</label>
              <input type="range" name="experienceLevel" min="1" max="10" value={formData.experienceLevel} onChange={handleChange} className="w-full accent-blue-600" />
              <div className="text-center text-sm font-black text-blue-600">{formData.experienceLevel} / 10</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Pets</label>
              <textarea name="currentPets" placeholder="Species, age, temperament, vaccinated?" value={formData.currentPets} onChange={handleChange} className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg text-sm h-20 resize-none"></textarea>
            </div>
          </div>

          {/* Section 3: Binding Terms (SWOT Document) */}
          <div className="bg-slate-800 p-5 rounded-2xl text-white space-y-4 shadow-md">
            <h2 className="font-bold flex items-center gap-2 border-b border-slate-600 pb-2">
              <AlertTriangle size={18} className="text-rose-400" /> Binding Foster Terms
            </h2>
            <p className="text-xs text-slate-300 mb-4">By checking these boxes, you agree to the organizational foster conditions.</p>

            {[
              { key: 'agreedProperty', label: "Ownership", desc: "The foster remains the sole legal property of the rescue. Fostering is not adoption." },
              { key: 'agreedVet', label: "Veterinary Care", desc: "I will NOT take the foster to any veterinarian without prior written approval. Unapproved expenses will not be reimbursed." },
              { key: 'agreedTransfers', label: "No Third-Party Transfers", desc: "I will not give, loan, board, or transfer the animal to friends, family, or pet sitters without approval." },
              { key: 'agreedCrate', label: "Daily Care & Training", desc: "I will utilize secure harnesses and crates as directed, and will never use prong collars or shock collars." }
            ].map(term => (
              <label key={term.key} className="flex items-start gap-3 cursor-pointer bg-slate-700/50 p-3 rounded-lg">
                <input type="checkbox" name={term.key} required checked={formData[term.key]} onChange={handleChange} className="w-5 h-5 text-rose-500 rounded mt-0.5" />
                <div>
                  <span className="block text-sm font-bold text-rose-300">{term.label}</span>
                  <span className="block text-xs text-slate-300 leading-tight mt-1">{term.desc}</span>
                </div>
              </label>
            ))}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-md transition-all disabled:opacity-50">
            {isSubmitting ? 'Submitting Application...' : 'Submit Foster Application'}
          </button>
        </form>
      </main>
    </div>
  );
}