import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Edit2, Check, X, MapPin, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function AnimalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Abuse Report State
  const [abuseReportsCount, setAbuseReportsCount] = useState(0);
  const [isReportingAbuse, setIsReportingAbuse] = useState(false);
  const [abuseForm, setAbuseForm] = useState({ category: 'Abuse/Neglect', details: '', agreed: false });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    fetchAnimalData();
  }, [id]);

  const fetchAnimalData = async () => {
    setLoading(true);
    
    // Fetch Animal
    const { data: animalData } = await supabase
      .from('animals')
      .select('*')
      .eq('id', id)
      .single();
      
    if (animalData) {
      setAnimal(animalData);
      setEditForm({
        ...animalData,
        type: animalData.type || 'Dog',
        gender: animalData.gender || 'Unknown',
        size: animalData.size || 'Unknown'
      });
    }

    // Fetch Sightings
    const { data: sightingsData } = await supabase
      .from('sightings')
      .select('*')
      .eq('animal_id', id)
      .order('created_at', { ascending: false });
      
    if (sightingsData) setSightings(sightingsData);

    // Fetch Abuse Report Count
    const { count } = await supabase
      .from('abuse_reports')
      .select('*', { count: 'exact', head: true })
      .eq('animal_id', id);
      
    if (count !== null) setAbuseReportsCount(count);

    setLoading(false);
  };

  const handleSave = async () => {
    if (!session) {
      alert('You must be logged in to edit animal details.');
      return;
    }
    
    const { error } = await supabase.from('animals').update({
      name: editForm.name,
      type: editForm.type,
      breed: editForm.breed,
      gender: editForm.gender,
      size: editForm.size,
      physical_traits: editForm.physical_traits,
      collar_info: editForm.collar_info,
      behavior: editForm.behavior,
      status: editForm.status
    }).eq('id', id);

    if (!error) {
      setAnimal({ ...animal, ...editForm });
      setIsEditing(false);
    } else {
      alert('Error saving details.');
      console.error(error);
    }
  };

  const claimHandler = async () => {
    if (!session) {
      alert('Please log in to claim an animal.');
      return;
    }
    const { error } = await supabase.from('animals').update({ handler_id: session.user.id }).eq('id', id);
    if (!error) fetchAnimalData();
  };

  const handleAbuseSubmit = async (e) => {
    e.preventDefault();
    if (!session) {
      alert('You must be logged in to file a report.');
      return;
    }
    if (!abuseForm.agreed) {
      alert('You must agree to the terms to submit a report.');
      return;
    }

    setIsSubmittingReport(true);

    const { error } = await supabase.from('abuse_reports').insert([{
      animal_id: id,
      user_id: session.user.id,
      category: abuseForm.category,
      details: abuseForm.details,
      agreed_to_terms: abuseForm.agreed
    }]);

    if (!error) {
      setAbuseReportsCount(prev => prev + 1);
      setIsReportingAbuse(false);
      setAbuseForm({ category: 'Abuse/Neglect', details: '', agreed: false });
      alert('Report submitted successfully. Local authorities will be notified.');
    } else {
      alert('Failed to submit report.');
      console.error(error);
    }
    setIsSubmittingReport(false);
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading profile...</div>;
  if (!animal) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Animal not found.</div>;

  const displayName = animal.name || 'Unidentified Animal';

  const detailsConfig = [
    { key: 'type', label: 'Species', inputType: 'select', options: ['Dog', 'Cat', 'Other'] },
    { key: 'breed', label: 'Breed / Guess', inputType: 'text' },
    { key: 'gender', label: 'Gender', inputType: 'select', options: ['Unknown', 'Male', 'Female'] },
    { key: 'size', label: 'Size', inputType: 'select', options: ['Unknown', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { key: 'collar_info', label: 'Collar & Tags', inputType: 'text' },
    { key: 'behavior', label: 'Behavior / Temperament', inputType: 'text' },
    { key: 'physical_traits', label: 'Physical Traits & Scars', inputType: 'text' }
  ];

  return (
    <div className="pb-6">
      <div className="bg-white p-3 border-b border-slate-200 sticky top-[72px] z-10 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-slate-800 text-lg flex-grow">Animal Profile</h2>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors font-bold text-sm flex items-center gap-1">
            <Edit2 size={16} /> Edit
          </button>
        ) : (
          <div className="flex gap-1">
            <button onClick={() => { setIsEditing(false); setEditForm(animal); }} className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
              <X size={20} />
            </button>
            <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors">
              <Check size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        
        {/* Card 1: Name and Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          {isEditing ? (
            <input 
              type="text" 
              value={editForm.name || ''} 
              onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
              placeholder="Name (e.g. Buddy, or leave blank)" 
              className="w-full text-2xl font-black text-slate-800 border-b border-slate-300 outline-none focus:border-blue-600 mb-3 bg-slate-50 p-2 rounded"
            />
          ) : (
            <h1 className="text-2xl font-black text-slate-800 mb-3">{displayName}</h1>
          )}

          <div className="flex items-center">
            {isEditing ? (
              <select 
                value={editForm.status || 'Spotted'} 
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full outline-none text-sm cursor-pointer"
              >
                <option value="Spotted">Spotted</option>
                <option value="In-care">In-care</option>
                <option value="Rescued">Rescued</option>
                <option value="Adopted">Adopted</option>
              </select>
            ) : (
              <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-sm">
                {animal.status || 'Spotted'}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Current Handler */}
        {!animal.handler_id && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Handler</p>
            <button onClick={claimHandler} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-sm transition-colors w-full sm:w-auto">
              Claim as Handler
            </button>
          </div>
        )}

        {/* Card 3: Abuse/Suspicious Activity Banner */}
        <div className={`rounded-xl shadow-sm border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${abuseReportsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <div>
            <h3 className={`font-bold flex items-center gap-1.5 ${abuseReportsCount > 0 ? 'text-rose-800' : 'text-slate-800'}`}>
              <AlertTriangle size={18} className={abuseReportsCount > 0 ? 'text-rose-600' : 'text-slate-500'} /> 
              Suspicious Activity
            </h3>
            <p className={`text-xs mt-1 ${abuseReportsCount > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
              This animal has been reported <strong>{abuseReportsCount}</strong> time(s) for suspected abuse or illegal breeding.
            </p>
          </div>
          <button 
            onClick={() => setIsReportingAbuse(true)} 
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-sm transition-colors whitespace-nowrap shadow-sm"
          >
            Report Issue
          </button>
        </div>

        {/* Card 4: Identifying Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Identifying Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {detailsConfig.map(({ key, label, inputType, options }) => (
              <div key={key} className={['physical_traits', 'behavior', 'collar_info'].includes(key) ? 'col-span-2' : 'col-span-1'}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {label}
                </label>
                {isEditing ? (
                  inputType === 'select' ? (
                    <select 
                      value={editForm[key] || options[0]} 
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={editForm[key] || ''} 
                      onChange={(e) => setEditForm({...editForm, [key]: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder={`Enter ${label.toLowerCase()}...`}
                    />
                  )
                ) : (
                  <p className="text-sm text-slate-800 font-medium">
                    {animal[key] || <span className="text-slate-400 italic">Not specified</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card 5: Sightings Timeline */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 ml-1">Sightings Timeline</h3>
          <div className="space-y-4">
            {sightings.map(sighting => (
              <div key={sighting.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {sighting.image_url && (
                  <img src={sighting.image_url} alt="Sighting" className="w-full aspect-[4/3] object-cover" />
                )}
                <div className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      {sighting.location}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {new Date(sighting.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{sighting.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Abuse Reporting Modal */}
      {isReportingAbuse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center max-w-md mx-auto transition-all">
          <div className="bg-white w-full rounded-t-2xl sm:rounded-2xl p-5 h-[85vh] sm:h-auto sm:max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                <ShieldAlert className="text-rose-600" /> Report Issue
              </h2>
              <button onClick={() => setIsReportingAbuse(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAbuseSubmit} className="space-y-5 flex-grow flex flex-col">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
                <select 
                  value={abuseForm.category}
                  onChange={(e) => setAbuseForm({...abuseForm, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-rose-600 focus:border-transparent outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="Abuse/Neglect">Abuse / Neglect</option>
                  <option value="Illegal Breeding">Illegal Breeding (Puppy Mill)</option>
                  <option value="Dog Fighting">Dog Fighting</option>
                  <option value="Other Suspicious Activity">Other Suspicious Activity</option>
                </select>
              </div>

              <div className="flex-grow">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Incident Details</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-300 p-3 rounded-lg h-32 focus:ring-2 focus:ring-rose-600 focus:border-transparent outline-none transition-all resize-none text-sm"
                  placeholder="Please provide as much detail as possible (e.g. Witnessed individual striking the animal, location specifics, descriptions of involved parties)..."
                  value={abuseForm.details}
                  onChange={(e) => setAbuseForm({...abuseForm, details: e.target.value})}
                  required
                ></textarea>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-600"
                    checked={abuseForm.agreed}
                    onChange={(e) => setAbuseForm({...abuseForm, agreed: e.target.checked})}
                  />
                  <span className="text-xs text-slate-600 leading-tight">
                    I confirm that this report is legitimate to the best of my knowledge. I understand that submitting false reports may hinder rescue efforts and could carry legal consequences.
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmittingReport || !abuseForm.agreed || !abuseForm.details.trim()} 
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 disabled:cursor-not-allowed transition-colors text-white font-bold py-3.5 rounded-xl shadow-md"
                >
                  {isSubmittingReport ? 'Submitting...' : 'Submit Official Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}