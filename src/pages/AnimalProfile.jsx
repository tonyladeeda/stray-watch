import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Mail, ArrowRightLeft, Hand } from 'lucide-react';
import { supabase } from '../supabaseClient';
import CommentSection from '../components/CommentSection';
import FollowButton from '../components/FollowButton';

const STATUS_OPTIONS = ['Spotted', 'Rescued', 'In-care', 'Fostered', 'Adopted', 'Deceased'];

export default function AnimalProfile() {
  const { id } = useParams();
  const [animal, setAnimal] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    fetchAnimalData();
  }, [id]);

  const fetchAnimalData = async () => {
    setLoading(true);
    
    const { data: animalData, error: animalError } = await supabase
      .from('animals')
      .select('*')
      .eq('id', id)
      .single();

    if (animalError) console.error('Error fetching animal:', animalError);
    else setAnimal(animalData);

    const { data: sightingsData, error: sightingsError } = await supabase
      .from('sightings')
      .select('*')
      .eq('animal_id', id)
      .order('created_at', { ascending: false });

    if (sightingsError) console.error('Error fetching sightings:', sightingsError);
    else setSightings(sightingsData);

    setLoading(false);
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (!session) return;
    
    setIsUpdating(true);
    
    const updatePayload = { 
      status: newStatus,
      handler_id: session.user.id,
      handler_email: session.user.email
    };

    const { error } = await supabase
      .from('animals')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status.');
    } else {
      setAnimal({ ...animal, ...updatePayload });
    }
    setIsUpdating(false);
  };

  const handleTransfer = async () => {
    if (!transferEmail.trim()) return;
    setIsUpdating(true);

    const { error } = await supabase
      .from('animals')
      .update({ 
        handler_email: transferEmail,
        handler_id: null
      })
      .eq('id', id);

    if (error) {
      console.error('Error transferring handler:', error);
      alert('Failed to transfer handler.');
    } else {
      setAnimal({ ...animal, handler_email: transferEmail, handler_id: null });
      setIsTransferring(false);
      setTransferEmail('');
    }
    setIsUpdating(false);
  };

  const handleClaim = async () => {
    if (!session) return;
    setIsUpdating(true);

    const updatePayload = {
      handler_id: session.user.id,
      handler_email: session.user.email
    };

    const { error } = await supabase
      .from('animals')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error claiming animal:', error);
      alert('Failed to claim animal.');
    } else {
      setAnimal({ ...animal, ...updatePayload });
    }
    setIsUpdating(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading profile...</div>;
  if (!animal) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Animal not found.</div>;

  const isCurrentHandler = session?.user?.id === animal.handler_id;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center gap-3">
        <Link to="/" className="text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 p-2 rounded-full">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Animal Profile</h1>
      </header>

      <main className="p-4 space-y-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {animal.type || 'Unknown Animal'} {animal.breed && `· ${animal.breed}`}
              </h2>
              
              {session ? (
                <div className="relative inline-block mt-2">
                  <select
                    value={animal.status}
                    onChange={handleStatusChange}
                    disabled={isUpdating}
                    className="appearance-none bg-amber-100 text-amber-700 font-bold rounded-full pl-3 pr-8 py-1 text-sm outline-none border border-amber-200 focus:ring-2 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
              ) : (
                <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 font-bold rounded-full text-sm">
                  {animal.status}
                </span>
              )}
            </div>
            <FollowButton animalId={animal.id} session={session} />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Current Handler</p>
            
            {animal.handler_email ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Mail size={16} className="text-blue-600" />
                    <a href={`mailto:${animal.handler_email}`} className="font-semibold text-blue-600 hover:underline">
                      {animal.handler_email}
                    </a>
                  </div>
                  
                  {isCurrentHandler && !isTransferring && (
                    <button onClick={() => setIsTransferring(true)} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md transition-colors">
                      <ArrowRightLeft size={12} />
                      Transfer
                    </button>
                  )}
                </div>

                {isTransferring && (
                  <div className="flex gap-2">
                    <input 
                      type="email" 
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      placeholder="New handler's email..." 
                      className="flex-1 border border-slate-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    />
                    <button onClick={handleTransfer} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
                      Save
                    </button>
                    <button onClick={() => setIsTransferring(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : session ? (
              <button 
                onClick={handleClaim}
                disabled={isUpdating}
                className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-2 rounded-lg transition-colors"
              >
                <Hand size={16} />
                Claim as Handler
              </button>
            ) : (
              <p className="text-sm text-slate-500 italic">No handler assigned yet. Sign in to claim.</p>
            )}
          </div>

          {animal.needs && animal.needs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {animal.needs.map(need => (
                <span key={need} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-200">
                  {need}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold text-slate-700 mb-3 tracking-tight">Sightings Timeline</h3>
          <div className="space-y-4">
            {sightings.map(sighting => (
              <div key={sighting.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {sighting.image_url && <img src={sighting.image_url} alt="Sighting" className="w-full h-48 object-cover" />}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1">
                      <MapPin size={16} className="text-slate-400" />
                      {sighting.location}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">{formatTime(sighting.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{sighting.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <CommentSection animalId={animal.id} />

      </main>
    </div>
  );
}