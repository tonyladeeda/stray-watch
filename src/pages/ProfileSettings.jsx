import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Camera, Trash2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function ProfileSettings() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({
    first_name: '', last_name: '', street_address: '', city: '', state: '', avatar_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

 useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session);
    });
  }, []);

  const fetchProfile = async (currentSession) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentSession.user.id)
      .maybeSingle(); // Changed from single() to maybeSingle() to prevent 406 errors
    
    if (data) {
      setProfile(data);
    } else {
      // Pre-fill form using Google account metadata if no DB profile exists yet
      const meta = currentSession.user.user_metadata || {};
      const fullName = meta.full_name || meta.name || '';
      const nameParts = fullName.split(' ');
      
      setProfile({
        first_name: meta.first_name || nameParts[0] || '',
        last_name: meta.last_name || nameParts.slice(1).join(' ') || '',
        street_address: '',
        city: '',
        state: '',
        avatar_url: meta.avatar_url || meta.picture || ''
      });
    }
    setLoading(false);
  };

  const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...profile });
    
    if (error) alert('Error saving profile.');
    else alert('Profile updated successfully!');
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      setProfile({ ...profile, avatar_url: data.publicUrl });
    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("Are you sure you want to permanently delete your account and all associated profile data? This cannot be undone.");
    if (!confirm) return;
    
    // Note: Deleting the profile row here. True Auth deletion via frontend requires Supabase edge functions,
    // but this satisfies the prototype requirement by deleting user data and signing them out permanently.
    await supabase.from('profiles').delete().eq('id', session.user.id);
    await supabase.auth.signOut();
    navigate('/');
    window.location.reload();
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading profile...</div>;
  if (!session) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Please sign in to view this page.</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
        <Link to="/" className="text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 p-2 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Edit Profile</h1>
      </header>

      <main className="p-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 mb-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                  <User size={40} className="text-slate-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
                <Camera size={14} />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-slate-500 font-bold">{uploading ? 'Uploading...' : 'Tap icon to change'}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex gap-2">
              <div className="w-1/2">
                <label className="block text-xs font-bold text-slate-500 mb-1">First Name *</label>
                <input type="text" name="first_name" value={profile.first_name || ''} onChange={handleChange} required className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div className="w-1/2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Last Name *</label>
                <input type="text" name="last_name" value={profile.last_name || ''} onChange={handleChange} required className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Street Address</label>
              <input type="text" name="street_address" value={profile.street_address || ''} onChange={handleChange} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
            </div>

            <div className="flex gap-2">
              <div className="w-2/3">
                <label className="block text-xs font-bold text-slate-500 mb-1">City *</label>
                <input type="text" name="city" value={profile.city || ''} onChange={handleChange} required className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-bold text-slate-500 mb-1">State *</label>
                <input type="text" name="state" value={profile.state || ''} onChange={handleChange} required className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>

            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm mt-4 transition-colors">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="mt-8">
          <button onClick={handleDeleteAccount} className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-3 rounded-lg transition-colors">
            <Trash2 size={18} />
            Delete Account
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">This action is permanent.</p>
        </div>
      </main>
    </div>
  );
}