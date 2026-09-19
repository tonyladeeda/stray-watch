import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  MapPin, Globe, Mail, Phone, ShieldCheck, 
  PlusCircle, Edit2, Heart, MessageSquare, Image as ImageIcon,
  Building 
} from 'lucide-react';
import FollowButton from '../components/FollowButton';
import ShareButton from '../components/ShareButton';
import ReportModal from '../components/ReportModal'; // NEW: Import the modal

export default function RescueProfile() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [rescue, setRescue] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // NEW: State to control the "Add Animal" modal
  const [isAddingAnimal, setIsAddingAnimal] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      const targetUserId = id || currentSession?.user?.id;
      if (!targetUserId) {
        navigate('/');
        return;
      }

      const { data: rescueData } = await supabase
        .from('rescue_partners')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (rescueData) {
        const { data: dirData } = await supabase
          .from('directory_profiles')
          .select('phone')
          .eq('user_id', targetUserId)
          .maybeSingle();

        setRescue({ ...rescueData, phone: dirData?.phone || '' });
        
        const { data: animalData } = await supabase
          .from('animals')
          .select('*, sightings(image_url, image_urls)')
          .eq('handler_id', targetUserId)
          .order('created_at', { ascending: false });
          
        if (animalData) setAnimals(animalData);
      }
      
      setLoading(false);
    };

    initProfile();
  }, [id, navigate, isAddingAnimal]); // Added isAddingAnimal to dependency array to refresh grid when modal closes

  if (loading) return <div className="p-8 text-center font-bold text-slate-500 mt-10">Loading Rescue Profile...</div>;
  if (!rescue) return <div className="p-8 text-center font-bold text-slate-800 mt-10">Rescue not found.</div>;

  const isOwner = session?.user?.id === rescue.user_id;
  const rescuePhone = rescue.phone;
  
  const shareUrl = `${window.location.origin}/rescue/${rescue.user_id}`;
  const shareTitle = `${rescue.name} on StrayGuard`;
  const shareText = `Check out ${rescue.name}'s adoptable and foster-ready animals on StrayGuard.`;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      
      <div className="bg-white px-4 pt-6 pb-4 border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto">
          
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-md bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden relative group">
              {rescue.avatar_url ? (
                <img src={rescue.avatar_url} alt={rescue.name} className="w-full h-full object-cover" />
              ) : (
                <Building size={32} className="text-slate-300" />
              )}
              {isOwner && (
                <button onClick={() => navigate('/profile')} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  <Edit2 size={18} />
                </button>
              )}
            </div>
            
            <div className="flex-grow pt-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                {rescue.name} 
                {rescue.is_verified && <ShieldCheck size={20} className="text-emerald-500" />}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm font-bold text-slate-600">
                <div className="flex flex-col">
                  <span className="text-slate-900 text-lg">{animals.length}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Rescues</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-900 text-lg">0</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Followers</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
              {rescue.bio || (isOwner ? <span className="italic text-slate-400">Add a bio to tell the community about your mission...</span> : "No bio provided.")}
            </p>
            
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-cyan-700">
              {rescue.website && (
                <a href={rescue.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                  <Globe size={14} /> Website
                </a>
              )}
              {rescue.email && (
                <a href={`mailto:${rescue.email}`} className="flex items-center gap-1 hover:underline">
                  <Mail size={14} /> Email
                </a>
              )}
              {rescuePhone && (
                <a href={`tel:${rescuePhone}`} className="flex items-center gap-1 hover:underline">
                  <Phone size={14} /> Call
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isOwner ? (
              <>
                <button onClick={() => navigate('/profile')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200">
                  <Edit2 size={16} /> Edit Profile
                </button>
                {/* --- HOOKED UP ADD RESCUE BUTTON --- */}
                <button onClick={() => setIsAddingAnimal(true)} className="flex-[2] bg-slate-900 hover:bg-black text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md">
                  <PlusCircle size={18} /> Add Rescue
                </button>
              </>
            ) : (
              <>
                <FollowButton rescueId={rescue.id} session={session} className="flex-1" />
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200">
                  <MessageSquare size={16} /> Message
                </button>
              </>
            )}
            <ShareButton url={shareUrl} title={shareTitle} text={shareText} variant="outline" className="px-3" />
          </div>

        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-2">
        
        <div className="flex items-center justify-center border-b border-slate-200 mb-1">
          <div className="border-b-2 border-slate-900 px-6 py-3 text-sm font-black text-slate-900 tracking-wider uppercase">
            Our Animals
          </div>
        </div>

        {animals.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[40vh]">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ImageIcon size={32} className="text-slate-300" />
            </div>
            {isOwner ? (
              <>
                <h3 className="text-lg font-black text-slate-800 mb-2">Let's build your network</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                  Add the animals currently in your care to start accepting foster applications and Care Fund donations.
                </p>
                <button onClick={() => setIsAddingAnimal(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-6 py-3 rounded-xl shadow-sm transition-colors flex items-center gap-2">
                  <PlusCircle size={18} /> Add Your First Rescue
                </button>
              </>
            ) : (
              <p className="text-sm font-bold text-slate-400">No animals posted yet.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 px-1">
            {animals.map((animal) => {
              const latestSighting = animal.sightings?.[0] || {};
              const displayImage = latestSighting.image_urls?.[0] || latestSighting.image_url;

              return (
                <Link key={animal.id} to={`/animal/${animal.id}`} className="aspect-square bg-slate-200 relative group overflow-hidden">
                  {displayImage ? (
                    <img src={displayImage} alt={animal.name || 'Rescue'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 p-2 text-center">
                      <ImageIcon size={24} className="mb-1 opacity-50" />
                      <span className="text-[10px] font-bold truncate w-full">{animal.name || 'No Photo'}</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2 text-center">
                    <span className="font-black text-sm truncate w-full">{animal.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest mt-1 bg-white/20 px-2 py-0.5 rounded-full">
                      {animal.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* --- INJECTED MODAL --- */}
      <ReportModal isOpen={isAddingAnimal} onClose={() => setIsAddingAnimal(false)} reportType="Rescue Intake" />
    </div>
  );
}