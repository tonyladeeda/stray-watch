import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  MapPin, Globe, Mail, Phone, ShieldCheck, 
  PlusCircle, Edit2, MessageSquare, Image as ImageIcon,
  Building, Share2, Grid, List, Activity, DollarSign, 
  Star, Pin, HeartHandshake, Link as LinkIcon
} from 'lucide-react';
import FollowButton from '../components/FollowButton';
import ReportModal from '../components/ReportModal';

export default function RescueProfile() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [rescue, setRescue] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New UI & Workspace States
  const [activeTab, setActiveTab] = useState('feed'); 
  const [viewMode, setViewMode] = useState('grid'); 
  const [isAddingAnimal, setIsAddingAnimal] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);

  useEffect(() => {
    const initProfile = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      let targetRescueId = id;

      // 1. If no ID in URL, fetch their assigned workspace from the new team table
      if (!targetRescueId && currentSession) {
        const { data: teamData } = await supabase
          .from('rescue_team_members')
          .select('rescue_id')
          .eq('user_id', currentSession.user.id)
          .maybeSingle();
          
        if (teamData) targetRescueId = teamData.rescue_id;
      }

      if (!targetRescueId) {
        navigate('/');
        return;
      }

      // 2. Fetch the Rescue Organization by its primary ID
      let { data: rescueData } = await supabase
        .from('rescue_partners')
        .select('*')
        .eq('id', targetRescueId)
        .maybeSingle();

      // Fallback: If a guest clicked an old link that uses the legacy user_id
      if (!rescueData) {
        const { data: legacyData } = await supabase
          .from('rescue_partners')
          .select('*')
          .eq('user_id', targetRescueId)
          .maybeSingle();
          
        rescueData = legacyData;
      }

      if (rescueData) {
        // Check if current user is an admin/editor for this rescue
        if (currentSession) {
          const { data: roleData } = await supabase
            .from('rescue_team_members')
            .select('role')
            .eq('rescue_id', targetRescueId)
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
          
          if (roleData) setIsTeamMember(true);
        }

        // Fetch fallback directory info (using the creator's user_id for now)
        const { data: dirData } = await supabase
          .from('directory_profiles')
          .select('phone, location, bio, social_links')
          .eq('user_id', rescueData.user_id)
          .maybeSingle();

        setRescue({ 
          ...rescueData, 
          phone: dirData?.phone || '', 
          location: dirData?.location || '',
          bio: dirData?.bio || '',
          social_links: dirData?.social_links || {}
        });
        
        // Fetch Animals (Using creator's ID to keep backward compatibility)
        const { data: animalData } = await supabase
          .from('animals')
          .select('*, sightings(image_url, image_urls)')
          .eq('handler_id', rescueData.user_id)
          .order('created_at', { ascending: false });
          
        if (animalData) setAnimals(animalData);
      }
      setLoading(false);
    };

    initProfile();
  }, [id, navigate, isAddingAnimal]);

  if (loading) return <div className="p-8 text-center font-bold text-slate-500 mt-10">Loading Workspace...</div>;
  if (!rescue) return <div className="p-8 text-center font-bold text-slate-800 mt-10">Rescue not found.</div>;
  
  const capacity = { 
    current: animals.length, 
    max: rescue.max_capacity || 40, 
    stress: rescue.stress_limit || 35 
  };
  const capacityPercentage = Math.min((capacity.current / capacity.max) * 100, 100);
  const isStressed = capacity.current >= capacity.stress;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${rescue.name} on StrayGuard`,
        url: `${window.location.origin}/rescue/${rescue.id}`
      });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      
      {/* --- TOP PROFILE HEADER --- */}
      <div className="bg-white pt-6 pb-2 border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4">
          
          {/* Avatar & High-Level Stats */}
          <div className="flex items-center gap-6 mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-slate-100 shadow-sm bg-indigo-50 text-indigo-300 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
              {rescue.avatar_url ? (
                <img src={rescue.avatar_url} alt={rescue.name} className="w-full h-full object-cover" />
              ) : (
                <Building size={32} />
              )}
            </div>
            
            <div className="flex-grow flex justify-around text-center">
              <div className="flex flex-col">
                <span className="text-slate-900 font-black text-lg">{animals.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Animals</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-900 font-black text-lg">1.2k</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Followers</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-900 font-black text-lg">4.9</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1 justify-center"><Star size={10} className="fill-amber-400 text-amber-400"/> Rating</span>
              </div>
            </div>
          </div>

          {/* Org Name & Bio */}
          <div className="mb-4">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-1.5">
              {rescue.name} {rescue.is_verified && <ShieldCheck size={18} className="text-emerald-500" />}
            </h1>
            <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
              <MapPin size={12} /> {rescue.location || "Location pending"}
            </p>
            <p className="text-sm text-slate-700 leading-snug whitespace-pre-wrap">
              {rescue.bio || (isTeamMember ? <span className="italic text-slate-400">Add a bio to tell the community about your mission...</span> : "")}
            </p>
            
            {/* Social/Contact Links */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] font-bold text-cyan-700">
              {rescue.website && <a href={rescue.website} className="flex items-center gap-1 hover:underline"><LinkIcon size={12} /> Website</a>}
              {rescue.phone && <a href={`tel:${rescue.phone}`} className="flex items-center gap-1 hover:underline"><Phone size={12} /> Contact</a>}
              {rescue.social_links?.instagram && <a href={`https://instagram.com/${rescue.social_links.instagram.replace('@', '')}`} className="flex items-center gap-1 hover:underline">Instagram</a>}
              {rescue.social_links?.twitter && <a href={`https://twitter.com/${rescue.social_links.twitter.replace('@', '')}`} className="flex items-center gap-1 hover:underline">Twitter / X</a>}
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-600 flex items-center gap-1"><Activity size={14} /> Org Capacity</span>
              <span className={isStressed ? 'text-rose-600' : 'text-slate-600'}>
                {capacity.current} / {capacity.max} {isStressed && '(Critical)'}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${isStressed ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                style={{ width: `${capacityPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* ACTION BAR (Uses isTeamMember flag to determine layout) */}
          <div className="flex items-center gap-2 mb-2">
            {isTeamMember ? (
              <>
                <button onClick={() => navigate('/settings')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-lg text-sm transition-colors border border-slate-200">
                  Manage Workspace
                </button>
                <button onClick={() => setIsAddingAnimal(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition-colors shadow-sm">
                  Add Animal
                </button>
              </>
            ) : (
              <>
                <div className="flex-[2]"><FollowButton rescueId={rescue.id} session={session} className="w-full py-2 rounded-lg text-sm" /></div>
                <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-lg text-sm transition-colors border border-slate-200 flex items-center justify-center gap-1">
                  Message
                </button>
                <button className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 rounded-lg text-sm transition-colors border border-emerald-200 flex items-center justify-center gap-1">
                  <HeartHandshake size={16} /> Donate
                </button>
              </>
            )}
            <button onClick={handleShare} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="sticky top-16 z-30 bg-white border-b border-slate-200 flex justify-around px-4 shadow-sm">
        <button 
          onClick={() => setActiveTab('feed')} 
          className={`py-3 flex-1 text-center text-sm font-black uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'feed' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Feed
        </button>
        <button 
          onClick={() => setActiveTab('accountability')} 
          className={`py-3 flex-1 text-center text-sm font-black uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'accountability' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Stats
        </button>
        <button 
          onClick={() => setActiveTab('reviews')} 
          className={`py-3 flex-1 text-center text-sm font-black uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'reviews' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Reviews
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="max-w-2xl mx-auto">
        
        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <div>
            <div className="flex justify-end p-2 gap-2 border-b border-slate-100 bg-white">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><Grid size={20}/></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><List size={20}/></button>
            </div>

            {animals.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold">No posts or animals yet.</div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-0.5' : 'flex flex-col gap-4 p-4'}>
                {animals.map((animal, idx) => {
                  const latestSighting = animal.sightings?.[0] || {};
                  const displayImage = latestSighting.image_urls?.[0] || latestSighting.image_url;
                  const isPinned = idx === 0;

                  if (viewMode === 'grid') {
                    return (
                      <Link key={animal.id} to={`/animal/${animal.id}`} className="aspect-square bg-slate-200 relative group overflow-hidden">
                        {displayImage && <img src={displayImage} className="w-full h-full object-cover" />}
                        {isPinned && <Pin size={16} className="absolute top-2 right-2 text-white drop-shadow-md" fill="white" />}
                      </Link>
                    );
                  }

                  return (
                    <div key={animal.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-3 flex items-center justify-between border-b border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-300 flex items-center justify-center overflow-hidden">
                             {rescue.avatar_url ? <img src={rescue.avatar_url} className="w-full h-full object-cover" /> : <Building size={16} />}
                          </div>
                          <span className="font-bold text-sm text-slate-900">{rescue.name}</span>
                        </div>
                        {isPinned && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Pin size={12}/> Pinned</span>}
                      </div>
                      
                      {displayImage && (
                        <Link to={`/animal/${animal.id}`}>
                          <img src={displayImage} className="w-full h-auto max-h-96 object-cover" />
                        </Link>
                      )}
                      
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-black text-lg text-slate-800">{animal.name || "Available for Foster"}</h3>
                          <button className="bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold border border-cyan-100">
                            Donate to Care Fund
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-3">{animal.notes}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ACCOUNTABILITY / STATS TAB (Placeholder Layout) */}
        {activeTab === 'accountability' && (
          <div className="p-6">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><DollarSign size={20} className="text-emerald-500"/> Financial Accountability</h3>
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
              <p className="text-slate-500 text-sm mb-4">Transparent tracking of Care Funds and direct donations.</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-black text-slate-900">$4,250</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Raised YTD</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-2xl font-black text-slate-900">42</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Animals Assisted</p>
                </div>
              </div>
              <button className="text-cyan-600 font-bold text-sm hover:underline">View Public Ledger & Receipts</button>
            </div>
          </div>
        )}

        {/* REVIEWS TAB (Placeholder Layout) */}
        {activeTab === 'reviews' && (
          <div className="p-6">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><Star size={20} className="text-amber-500"/> Community Reviews</h3>
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex text-amber-400 mb-2"><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/><Star size={14} fill="currentColor"/></div>
                <p className="text-sm text-slate-700 italic mb-2">"Amazing experience fostering with them. They provided all medical care and food upfront."</p>
                <p className="text-xs font-bold text-slate-400">— Verified Foster, Oct 2026</p>
              </div>
            </div>
          </div>
        )}

      </div>

      <ReportModal isOpen={isAddingAnimal} onClose={() => setIsAddingAnimal(false)} reportType="Rescue Intake" />
    </div>
  );
}