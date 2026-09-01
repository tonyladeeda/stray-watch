import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Phone, Mail, Globe, AtSign, ShieldCheck, Heart, Home, Stethoscope } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function DirectoryProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('directory_profiles')
      .select('*')
      .eq('id', id)
      .single();
      
    if (!error && data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTheme = (type) => {
    switch(type) {
      case 'Rescue': return { color: 'blue', icon: <ShieldCheck size={20} className="text-blue-600"/>, bg: 'bg-blue-50', border: 'border-blue-200' };
      case 'Foster': return { color: 'rose', icon: <Heart size={20} className="text-rose-600"/>, bg: 'bg-rose-50', border: 'border-rose-200' };
      case 'Shelter': return { color: 'amber', icon: <Home size={20} className="text-amber-600"/>, bg: 'bg-amber-50', border: 'border-amber-200' };
      case 'Support': return { color: 'emerald', icon: <Stethoscope size={20} className="text-emerald-600"/>, bg: 'bg-emerald-50', border: 'border-emerald-200' };
      default: return { color: 'slate', icon: null, bg: 'bg-slate-50', border: 'border-slate-200' };
    }
  };

  if (loading) return <div className="p-8 text-center font-bold text-slate-500">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center font-bold text-slate-500">Profile not found.</div>;

  const theme = getTheme(profile.type);

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <div className="bg-white p-3 border-b border-slate-200 sticky top-[72px] z-10 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <button onClick={handleShare} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2">
          <span className="text-xs font-bold">{copied ? 'Copied URL!' : 'Share'}</span>
          <Share2 size={18} />
        </button>
      </div>

      <main className="p-4 space-y-4">
        <div className={`bg-white rounded-2xl p-6 border ${theme.border} shadow-sm text-center`}>
          <div className={`w-16 h-16 mx-auto ${theme.bg} rounded-full flex items-center justify-center mb-3`}>
            {theme.icon}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest text-${theme.color}-600 bg-${theme.color}-50 px-3 py-1 rounded-full mb-2 inline-block`}>
            {profile.type}
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-2">{profile.name}</h1>
          {profile.description && (
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{profile.description}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Contact Information</h3>
          
          <a href={`tel:${profile.phone}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
            <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Phone size={18}/></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Phone</p>
              <p className="text-sm font-bold text-slate-800">{profile.phone}</p>
            </div>
          </a>

          <a href={`mailto:${profile.email}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
            <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Mail size={18}/></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
              <p className="text-sm font-bold text-slate-800">{profile.email}</p>
            </div>
          </a>

          {profile.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
              <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"><Globe size={18}/></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Website</p>
                <p className="text-sm font-bold text-blue-600 truncate">{profile.website.replace('https://', '')}</p>
              </div>
            </a>
          )}

          {profile.social && (
            <a href={`https://instagram.com/${profile.social.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
              <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors"><AtSign size={18}/></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Social Media</p>
                <p className="text-sm font-bold text-rose-600">{profile.social}</p>
              </div>
            </a>
          )}
        </div>
      </main>
    </div>
  );
}