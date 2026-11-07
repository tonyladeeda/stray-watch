import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Share2, Phone, Mail, Globe, AtSign, 
  ShieldCheck, Heart, Home, Stethoscope, Car, User, 
  Calendar, MessageSquare, ClipboardList 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function DirectoryProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isViewerVerifiedRescue, setIsViewerVerifiedRescue] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    const { data: profileData, error } = await supabase
      .from('directory_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (!error && profileData) {
      setProfile(profileData);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: teamData } = await supabase
        .from('rescue_team_members')
        .select('rescue_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (teamData) {
        const { data: rescueData } = await supabase
          .from('rescue_partners')
          .select('is_verified')
          .eq('id', teamData.rescue_id)
          .maybeSingle();

        if (rescueData?.is_verified) {
          setIsViewerVerifiedRescue(true);
        }
      }
    }
    setLoading(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBaseTheme = (p) => {
    if (p.type === 'Rescue') return { icon: <ShieldCheck size={28} className="text-blue-600"/>, bg: 'bg-blue-50', border: 'border-blue-200' };
    if (p.open_to_foster) return { icon: <Heart size={28} className="text-rose-600"/>, bg: 'bg-rose-50', border: 'border-rose-200' };
    if (p.open_to_volunteer) return { icon: <Car size={28} className="text-amber-600"/>, bg: 'bg-amber-50', border: 'border-amber-200' };
    return { icon: <User size={28} className="text-slate-600"/>, bg: 'bg-slate-50', border: 'border-slate-200' };
  };

  if (loading) return <div className="p-8 text-center font-bold text-slate-500">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center font-bold text-slate-500">Profile not found.</div>;

  const theme = getBaseTheme(profile);

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <div className="bg-white p-3 border-b border-slate-200 sticky top-[64px] z-10 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <button onClick={handleShare} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2">
          <span className="text-xs font-bold">{copied ? 'Copied URL!' : 'Share'}</span>
          <Share2 size={18} />
        </button>
      </div>

      <main className="p-4 space-y-4">
        {/* HERO SECTION */}
        <div className={`bg-white rounded-2xl p-6 border ${theme.border} shadow-sm text-center`}>
          <div className={`w-20 h-20 mx-auto ${theme.bg} rounded-full flex items-center justify-center mb-4 shadow-inner border border-white`}>
            {theme.icon}
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {profile.type === 'Rescue' && (
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-100 px-3 py-1 rounded-full flex items-center gap-1 border border-blue-200">
                <ShieldCheck size={12}/> Rescue
              </span>
            )}
            {profile.open_to_foster && (
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 bg-rose-100 px-3 py-1 rounded-full flex items-center gap-1 border border-rose-200">
                <Heart size={12}/> Foster
              </span>
            )}
            {profile.open_to_volunteer && (
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1 border border-amber-200">
                <Car size={12}/> Volunteer
              </span>
            )}
            {profile.type === 'Community' && !profile.open_to_foster && !profile.open_to_volunteer && (
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1 border border-slate-200">
                <User size={12}/> Community Member
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black text-slate-800 tracking-tight">{profile.name}</h1>
          {profile.bio && (
            <p className="text-sm text-slate-600 mt-3 leading-relaxed max-w-sm mx-auto">{profile.bio}</p>
          )}
        </div>

        {/* FOSTER CAPABILITIES */}
        {profile.open_to_foster && (
          <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 shadow-sm space-y-4">
            <h3 className="font-bold text-rose-900 flex items-center gap-2 border-b border-rose-200 pb-2">
              <Heart size={18} className="text-rose-600" /> Foster Profile
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">Current Status</p>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${profile.availability_status === 'Available' ? 'bg-emerald-500' : profile.availability_status === 'Fostering' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                  <p className="text-sm font-bold text-rose-900">{profile.availability_status || 'Unknown'}</p>
                </div>
              </div>
            </div>

            {profile.foster_preferences?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2">Preferences & Experience</p>
                <div className="flex flex-wrap gap-2">
                  {profile.foster_preferences.map(pref => (
                    <span key={pref} className="bg-white border border-rose-200 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                      {pref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.foster_notes && (
              <div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MessageSquare size={12}/> Additional Notes
                </p>
                <p className="text-sm text-rose-800 bg-white p-3 rounded-lg border border-rose-100 shadow-sm">
                  {profile.foster_notes}
                </p>
              </div>
            )}

            {isViewerVerifiedRescue && (
              <button 
                onClick={() => alert('Will route to this user\'s Master Application PDF view')}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <ClipboardList size={18} /> View Master Foster Application
              </button>
            )}
          </div>
        )}

        {/* VOLUNTEER CAPABILITIES */}
        {profile.open_to_volunteer && (
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 shadow-sm space-y-4">
            <h3 className="font-bold text-amber-900 flex items-center gap-2 border-b border-amber-200 pb-2">
              <Car size={18} className="text-amber-600" /> Volunteer Profile
            </h3>

            {profile.volunteer_capabilities?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Ways I can help</p>
                <div className="flex flex-wrap gap-2">
                  {profile.volunteer_capabilities.map(cap => (
                    <span key={cap} className="bg-white border border-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.volunteer_availability?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar size={12}/> Typical Availability
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.volunteer_availability.map(time => (
                    <span key={time} className="bg-white border border-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.volunteer_notes && (
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MessageSquare size={12}/> Additional Notes
                </p>
                <p className="text-sm text-amber-900 bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                  {profile.volunteer_notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* CONTACT INFO */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Contact Information</h3>
          
          {profile.phone && (
            <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <Phone size={18}/>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Phone</p>
                  <p className="text-sm font-bold text-slate-800">{profile.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <a 
                  href={`sms:${profile.phone}`} 
                  className="p-2.5 bg-slate-100 hover:bg-blue-500 hover:text-white text-slate-600 rounded-full transition-colors shadow-sm"
                  title="Send Text"
                >
                  <MessageSquare size={16} />
                </a>
                <a 
                  href={`tel:${profile.phone}`} 
                  className="p-2.5 bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-600 rounded-full transition-colors shadow-sm"
                  title="Call"
                >
                  <Phone size={16} />
                </a>
              </div>
            </div>
          )}

          <a href={`mailto:${profile.email}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
            <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Mail size={18}/></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
              <p className="text-sm font-bold text-slate-800">{profile.email}</p>
            </div>
          </a>

          {profile.social_links?.website && (
            <a href={profile.social_links.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
              <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Globe size={18}/></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Website</p>
                <p className="text-sm font-bold text-blue-600 truncate">{profile.social_links.website.replace('https://', '')}</p>
              </div>
            </a>
          )}

          {profile.social_links?.instagram && (
            <a href={`https://instagram.com/${profile.social_links.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
              <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors"><AtSign size={18}/></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Instagram</p>
                <p className="text-sm font-bold text-rose-600">{profile.social_links.instagram}</p>
              </div>
            </a>
          )}

          {profile.social_links?.twitter && (
            <a href={`https://twitter.com/${profile.social_links.twitter.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
              <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-cyan-100 group-hover:text-cyan-600 transition-colors"><AtSign size={18}/></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Twitter / X</p>
                <p className="text-sm font-bold text-cyan-600">{profile.social_links.twitter}</p>
              </div>
            </a>
          )}

          {/* NEW: Link to Public Rescue Profile - Moved to the bottom of the contact card */}
          {profile.type === 'Rescue' && (
            <div className="pt-3 mt-3 border-t border-slate-100">
              <Link 
                to={`/rescue/${profile.user_id}`}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} /> View Public Rescue Page
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}