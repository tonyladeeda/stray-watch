import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  ArrowLeft, Edit2, Check, X, MapPin, AlertTriangle, 
  ShieldAlert, Phone, Navigation, Globe, Clock, Mail, 
  ArrowRightLeft, Hand, Archive, Image as ImageIcon, Heart, 
  FileText, Upload, PlusCircle, Settings, Home, CreditCard
} from 'lucide-react';
import CommentSection from '../components/CommentSection';
import FollowButton from '../components/FollowButton';
import { SHELTER_DIRECTORY } from '../shelterData';

const STATUS_OPTIONS = ['Spotted', 'Rescued', 'In-care', 'Fostered', 'Adopted', 'Deceased', 'Euthanized'];

export default function AnimalProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isVerifiedRescue, setIsVerifiedRescue] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Handler / Transfer State
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');

  // Abuse Report State
  const [abuseReportsCount, setAbuseReportsCount] = useState(0);
  const [isReportingAbuse, setIsReportingAbuse] = useState(false);
  const [abuseForm, setAbuseForm] = useState({ category: 'Abuse/Neglect', details: '', agreed: false });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Checkout State (Public)
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState(50);
  const [tipPercentage, setTipPercentage] = useState(5);

  // Care Fund Management State (Rescue Only)
  const [isManagingFund, setIsManagingFund] = useState(false);
  const [fundForm, setFundForm] = useState({ amount: '', description: '' });
  const [receiptFiles, setReceiptFiles] = useState([]);
  const [isSubmittingFund, setIsSubmittingFund] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchAnimalData(session);
    });
  }, [id]);

  const fetchAnimalData = async (currentSession) => {
    setLoading(true);
    
    const { data: animalData } = await supabase.from('animals').select('*').eq('id', id).single();
    if (animalData) {
      setAnimal(animalData);
      setEditForm({
        ...animalData,
        type: animalData.type || 'Dog',
        gender: animalData.gender || 'Unknown',
        size: animalData.size || 'Unknown'
      });
      setFundForm({
        amount: animalData.funding_goal || '',
        description: animalData.funding_description || ''
      });
    }

    if (currentSession?.user?.id) {
      const { data: rescueData } = await supabase
        .from('rescue_partners')
        .select('is_verified')
        .eq('user_id', currentSession.user.id)
        .single();
        
      if (rescueData?.is_verified) setIsVerifiedRescue(true);
    }

    const { data: sightingsData } = await supabase.from('sightings').select('*').eq('animal_id', id).order('created_at', { ascending: false });
    if (sightingsData) setSightings(sightingsData);

    const { count } = await supabase.from('abuse_reports').select('*', { count: 'exact', head: true }).eq('animal_id', id);
    if (count !== null) setAbuseReportsCount(count);

    setLoading(false);
  };

  const handleToggle = async (field, currentValue) => {
    const newValue = !currentValue;
    setAnimal({ ...animal, [field]: newValue }); 
    const { error } = await supabase.from('animals').update({ [field]: newValue }).eq('id', animal.id);
    if (error) {
      alert("Failed to update status.");
      setAnimal({ ...animal, [field]: currentValue }); 
    }
  };

  const handleSaveFund = async (e) => {
    e.preventDefault();
    if (!fundForm.amount || !fundForm.description) return alert("Amount and description are required.");
    
    setIsSubmittingFund(true);
    const uploadedUrls = [];
    
    for (const file of receiptFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `receipt-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('sighting-images').upload(fileName, file);
      if (!uploadError) {
        const { data } = supabase.storage.from('sighting-images').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }
    }

    const existingReceipts = animal.funding_receipt_urls || [];
    const allReceipts = [...existingReceipts, ...uploadedUrls];

    const updatePayload = {
      funding_goal: parseFloat(fundForm.amount),
      funding_description: fundForm.description,
      funding_receipt_urls: allReceipts
    };

    const { error } = await supabase.from('animals').update(updatePayload).eq('id', id);

    if (!error) {
      setAnimal({ ...animal, ...updatePayload });
      setIsManagingFund(false);
      setReceiptFiles([]);
    } else alert("Failed to save fund details.");
    setIsSubmittingFund(false);
  };

  const handleSave = async () => {
    if (!session) return alert('You must be logged in to edit animal details.');
    const { error } = await supabase.from('animals').update({
      name: editForm.name, type: editForm.type, breed: editForm.breed, gender: editForm.gender,
      size: editForm.size, physical_traits: editForm.physical_traits, collar_info: editForm.collar_info, behavior: editForm.behavior
    }).eq('id', id);
    if (!error) { setAnimal({ ...animal, ...editForm }); setIsEditing(false); } else alert('Error saving details.');
  };

  const handleArchive = async () => {
    const confirm = window.confirm(animal.is_archived ? "Unarchive this post?" : "Archive this post? It will no longer appear on the main feed.");
    if (!confirm) return;
    setIsUpdating(true);
    const { error } = await supabase.from('animals').update({ is_archived: !animal.is_archived }).eq('id', id);
    if (!error) setAnimal({ ...animal, is_archived: !animal.is_archived });
    setIsUpdating(false);
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (!session) return;
    setIsUpdating(true);
    const updatePayload = { status: newStatus, handler_id: session.user.id, handler_email: session.user.email };
    const { error } = await supabase.from('animals').update(updatePayload).eq('id', id);
    if (!error) setAnimal({ ...animal, ...updatePayload });
    setIsUpdating(false);
  };

  const handleClaim = async () => {
    if (!session) return alert('Please log in to claim an animal.');
    setIsUpdating(true);
    const updatePayload = { handler_id: session.user.id, handler_email: session.user.email };
    const { error } = await supabase.from('animals').update(updatePayload).eq('id', id);
    if (!error) setAnimal({ ...animal, ...updatePayload });
    setIsUpdating(false);
  };

  const handleTransfer = async () => {
    if (!transferEmail.trim()) return;
    setIsUpdating(true);
    const { error } = await supabase.from('animals').update({ handler_email: transferEmail, handler_id: null }).eq('id', id);
    if (!error) { setAnimal({ ...animal, handler_email: transferEmail, handler_id: null }); setIsTransferring(false); setTransferEmail(''); }
    setIsUpdating(false);
  };

  const handleAbuseSubmit = async (e) => {
    e.preventDefault();
    if (!session) return alert('You must be logged in to file a report.');
    if (!abuseForm.agreed) return alert('You must agree to the terms to submit a report.');
    setIsSubmittingReport(true);
    const { error } = await supabase.from('abuse_reports').insert([{ animal_id: id, user_id: session.user.id, category: abuseForm.category, details: abuseForm.details, agreed_to_terms: abuseForm.agreed }]);
    if (!error) { setAbuseReportsCount(prev => prev + 1); setIsReportingAbuse(false); setAbuseForm({ category: 'Abuse/Neglect', details: '', agreed: false }); alert('Report submitted successfully.'); }
    setIsSubmittingReport(false);
  };

  const handleSimulateDonation = () => {
    alert(`In the next phase, this will open Stripe Checkout to process $${totalCharge.toFixed(2)} securely!`);
    setIsDonateModalOpen(false);
  };

  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading profile...</div>;
  if (!animal) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Animal not found.</div>;

  const displayName = animal.name || 'Unidentified Animal';
  const isCurrentHandler = session?.user?.id === animal.handler_id;
  const isUrgent = animal.record_type === 'Shelter Urgent';
  
  const originalSighting = sightings.length > 0 ? sightings[sightings.length - 1] : null;
  const shelterDetails = isUrgent && originalSighting ? SHELTER_DIRECTORY.find(s => s.name === originalSighting.location) : null;

  const allImages = sightings.reduce((acc, sighting) => {
    if (sighting.image_urls && sighting.image_urls.length > 0) return [...acc, ...sighting.image_urls];
    else if (sighting.image_url) return [...acc, sighting.image_url];
    return acc;
  }, []);

  const percentFunded = animal.funding_goal > 0 ? Math.min(100, Math.round((animal.funds_raised / animal.funding_goal) * 100)) : 0;
  const calculatedTip = parseFloat((donationAmount * (tipPercentage / 100)).toFixed(2));
  const totalCharge = parseFloat((donationAmount + calculatedTip).toFixed(2));

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
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"><ArrowLeft size={20} /></button>
        <h2 className="font-bold text-slate-800 text-lg flex-grow">Animal Profile</h2>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors font-bold text-sm flex items-center gap-1"><Edit2 size={16} /> Edit</button>
        ) : (
          <div className="flex gap-1">
            <button onClick={handleArchive} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><Archive size={20} /></button>
            <button onClick={() => { setIsEditing(false); setEditForm(animal); }} className="p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors"><X size={20} /></button>
            <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"><Check size={20} /></button>
          </div>
        )}
      </div>

      {allImages.length > 0 ? (
        <div className="bg-slate-900 relative">
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-[350px]">
            {allImages.map((url, i) => <img key={i} src={url} alt={`${displayName} - Photo ${i + 1}`} className="w-full h-full object-contain shrink-0 snap-center bg-slate-100" />)}
          </div>
        </div>
      ) : (
        <div className="bg-slate-100 h-48 flex flex-col items-center justify-center text-slate-400">
          <ImageIcon size={32} className="mb-2 opacity-50" />
          <p className="font-bold text-sm">No photos available</p>
        </div>
      )}

      <div className="p-4 space-y-4">
        {isCurrentHandler && isVerifiedRescue && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-emerald-800 text-sm">
            <ShieldAlert size={18} className="text-emerald-600" />
            <span>You are managing this post as a <strong>Verified Rescue Partner</strong>.</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-grow">
              {isEditing ? (
                <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} placeholder="Name (e.g. Buddy)" className="w-full text-2xl font-black text-slate-800 border-b border-slate-300 outline-none focus:border-blue-600 mb-3 bg-slate-50 p-1 rounded" />
              ) : <h1 className="text-2xl font-black text-slate-800 mb-3">{displayName}</h1>}
            </div>
            <FollowButton animalId={animal.id} session={session} />
          </div>
          <div className="flex items-center">
            {session ? (
              <div className="relative inline-block">
                <select value={animal.status} onChange={handleStatusChange} disabled={isUpdating} className="appearance-none bg-amber-100 text-amber-700 font-bold rounded-full pl-3 pr-8 py-1 text-sm outline-none border border-amber-200 cursor-pointer">
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-700"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
              </div>
            ) : <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 font-bold rounded-full text-sm">{animal.status}</span>}
          </div>
        </div>

        {/* --- HANDLER CONTROLS --- */}
        {isCurrentHandler && (
          <div className="bg-slate-800 rounded-2xl p-5 shadow-sm text-white">
            <h3 className="font-bold flex items-center gap-2 border-b border-slate-700 pb-3 mb-4 text-sm">
              <Settings size={16} className="text-slate-400" /> Placement Controls
            </h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="block text-sm font-bold">Available for Foster</span>
                  <span className="block text-xs text-slate-400">Enable foster application button</span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${animal.available_for_foster ? 'bg-blue-500' : 'bg-slate-600'}`}>
                  <input type="checkbox" className="hidden" checked={animal.available_for_foster} onChange={() => handleToggle('available_for_foster', animal.available_for_foster)} />
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${animal.available_for_foster ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="block text-sm font-bold">Available for Adoption</span>
                  <span className="block text-xs text-slate-400">Enable adoption application button</span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${animal.available_for_adoption ? 'bg-purple-500' : 'bg-slate-600'}`}>
                  <input type="checkbox" className="hidden" checked={animal.available_for_adoption} onChange={() => handleToggle('available_for_adoption', animal.available_for_adoption)} />
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${animal.available_for_adoption ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* --- CARE FUND PUBLIC DISPLAY --- */}
        {(animal.funding_goal > 0 || (isCurrentHandler && isVerifiedRescue)) && (
          <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-4">
            {animal.funding_goal > 0 ? (
              <>
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                      <Heart size={16} className="text-emerald-500 fill-emerald-500" /> Care Fund
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      <span className="text-emerald-700 font-bold">${animal.funds_raised}</span> raised of ${animal.funding_goal}
                    </p>
                  </div>
                  <span className="text-sm font-black text-emerald-600">{percentFunded}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden border border-slate-200">
                  <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${percentFunded}%` }}></div>
                </div>
                {animal.funding_description && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{animal.funding_description}</p>
                  </div>
                )}
                {animal.funding_receipt_urls?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={14} /> Documents</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {animal.funding_receipt_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0 border border-slate-200 rounded-lg hover:border-emerald-500">
                          <img src={url} className="h-20 w-20 object-cover" alt="Receipt" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setIsDonateModalOpen(true)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-sm text-sm mb-2">
                  Support {displayName}
                </button>
              </>
            ) : (
               <div className="text-center py-2">
                 <Heart size={24} className="text-slate-300 mx-auto mb-2" />
                 <p className="text-sm text-slate-500 font-bold">No Care Fund setup yet.</p>
               </div>
            )}
            {isCurrentHandler && isVerifiedRescue && (
              <button onClick={() => setIsManagingFund(true)} className="w-full mt-2 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-sm">
                <Edit2 size={16} /> Manage Care Fund Ask
              </button>
            )}
          </div>
        )}

        {/* --- PLACEMENT CTAs (Public) --- */}
        {!isCurrentHandler && (animal.available_for_foster || animal.available_for_adoption) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-2">Placement Opportunities</h3>
            {animal.available_for_foster && (
              <Link to={`/foster-application?animal=${encodeURIComponent(animal.name || id)}`} className="w-full bg-blue-50 border border-blue-200 text-blue-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                <Heart size={18} /> Apply to Foster
              </Link>
            )}
            {animal.available_for_adoption && (
              <button onClick={() => alert("Adoption flow goes here")} className="w-full bg-purple-50 border border-purple-200 text-purple-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm">
                <Home size={18} /> Apply to Adopt
              </button>
            )}
          </div>
        )}

        {/* --- URGENT SHELTER INFO --- */}
        {isUrgent && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-rose-800 font-black text-sm uppercase tracking-wider flex items-center gap-1.5 mb-3"><AlertTriangle size={16} /> Urgent Shelter Case</h3>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-rose-600/70 text-xs font-bold block">Shelter ID</span><span className="font-mono font-bold text-rose-900 bg-white px-2 py-1 rounded inline-block">{animal.shelter_id}</span></div>
              <div><span className="text-rose-600/70 text-xs font-bold block">Deadline</span><span className="font-bold text-rose-900 flex items-center gap-1"><Clock size={14} />{animal.urgent_deadline ? new Date(animal.urgent_deadline).toLocaleDateString() : 'Unknown'}</span></div>
            </div>
          </div>
        )}

        {/* --- HANDLER CARD --- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Handler</p>
          {animal.handler_email ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Mail size={16} className="text-blue-600" />
                  <a href={`mailto:${animal.handler_email}`} className="font-semibold text-blue-600 hover:underline">{animal.handler_email}</a>
                </div>
                {isCurrentHandler && !isTransferring && <button onClick={() => setIsTransferring(true)} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md"><ArrowRightLeft size={12} /> Transfer</button>}
              </div>
              {isTransferring && (
                <div className="flex gap-2">
                  <input type="email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} placeholder="New handler's email..." className="flex-1 border border-slate-300 p-2 rounded-lg text-sm" />
                  <button onClick={handleTransfer} disabled={isUpdating} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold">Save</button>
                  <button onClick={() => setIsTransferring(false)} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-sm font-bold">Cancel</button>
                </div>
              )}
            </div>
          ) : session ? <button onClick={handleClaim} disabled={isUpdating} className="flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg w-full"><Hand size={16} /> Claim as Handler</button> : <p className="text-sm text-slate-500 italic">No handler assigned yet.</p>}
        </div>

        {/* --- ABUSE TRIGGER --- */}
        <div className={`rounded-xl shadow-sm border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${abuseReportsCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
          <div>
            <h3 className={`font-bold flex items-center gap-1.5 ${abuseReportsCount > 0 ? 'text-rose-800' : 'text-slate-800'}`}><ShieldAlert size={18} className={abuseReportsCount > 0 ? 'text-rose-600' : 'text-slate-400'} /> Suspicious Activity</h3>
            <p className={`text-xs mt-1 ${abuseReportsCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Reported <strong>{abuseReportsCount}</strong> time(s) for suspected abuse.</p>
          </div>
          <button onClick={() => setIsReportingAbuse(true)} className="bg-white border border-slate-200 text-slate-700 font-bold py-1.5 px-4 rounded-lg text-sm shrink-0">Report Issue</button>
        </div>

        {/* --- IDENTITY DETAILS --- */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Identifying Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {detailsConfig.map(({ key, label, inputType, options }) => (
              <div key={key} className={['physical_traits', 'behavior', 'collar_info'].includes(key) ? 'col-span-2' : 'col-span-1'}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
                {isEditing ? (
                  inputType === 'select' ? (
                    <select value={editForm[key] || options[0]} onChange={(e) => setEditForm({...editForm, [key]: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm outline-none">{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                  ) : <input type="text" value={editForm[key] || ''} onChange={(e) => setEditForm({...editForm, [key]: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-sm outline-none" />
                ) : <p className="text-sm text-slate-800 font-medium">{animal[key] || <span className="text-slate-400 italic">Not specified</span>}</p>}
              </div>
            ))}
          </div>
        </div>

        <CommentSection animalId={animal.id} />
      </div>

      {/* MODALS */}
      {isManagingFund && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end max-w-md mx-auto">
          <div className="bg-white w-full rounded-t-2xl p-5 shadow-2xl h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Edit2 className="text-emerald-600" /> Manage Care Fund</h2>
              <button onClick={() => {setIsManagingFund(false); setReceiptFiles([]);}} className="bg-slate-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveFund} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Funding Goal ($)</label>
                <div className="relative"><span className="absolute left-3 top-3 text-slate-400 font-bold">$</span><input type="number" required value={fundForm.amount} onChange={(e) => setFundForm({...fundForm, amount: e.target.value})} className="w-full border p-3 pl-8 rounded-lg outline-none" /></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <textarea required value={fundForm.description} onChange={(e) => setFundForm({...fundForm, description: e.target.value})} className="w-full border p-3 rounded-lg h-32 outline-none resize-none"></textarea>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Attach Receipts</label>
                <label className="border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-xl p-6 flex flex-col items-center cursor-pointer text-emerald-700">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setReceiptFiles(Array.from(e.target.files))} />
                  <Upload size={24} />
                  <span className="text-sm font-bold">{receiptFiles.length > 0 ? `${receiptFiles.length} file(s) selected` : "Upload photos"}</span>
                </label>
              </div>
              <button type="submit" disabled={isSubmittingFund} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl">{isSubmittingFund ? 'Saving...' : 'Update'}</button>
            </form>
          </div>
        </div>
      )}

      {isDonateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end max-w-md mx-auto">
          <div className="bg-white w-full rounded-t-2xl p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Heart className="text-emerald-500 fill-emerald-500" /> Support {displayName}</h2>
              <button onClick={() => setIsDonateModalOpen(false)} className="bg-slate-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Amount</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[10, 25, 50, 100].map(amt => <button key={amt} onClick={() => setDonationAmount(amt)} className={`py-2 rounded-lg font-bold ${donationAmount === amt ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>${amt}</button>)}
                </div>
                <div className="relative"><span className="absolute left-4 top-3 font-bold">$</span><input type="number" value={donationAmount || ''} onChange={(e) => setDonationAmount(parseFloat(e.target.value) || 0)} className="w-full border p-3 pl-8 rounded-lg outline-none" /></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2"><label className="text-sm font-bold">Tip Stray Watch</label><span className="text-sm font-bold">{tipPercentage}% (${calculatedTip.toFixed(2)})</span></div>
                <input type="range" min="0" max="25" step="5" value={tipPercentage} onChange={(e) => setTipPercentage(parseFloat(e.target.value))} className="w-full accent-emerald-600" />
              </div>
              <div className="pt-2 border-t flex justify-between items-center"><span className="font-bold">Total Charge</span><span className="text-2xl font-black">${totalCharge.toFixed(2)}</span></div>
              <button onClick={handleSimulateDonation} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl">Proceed to Checkout</button>
            </div>
          </div>
        </div>
      )}

      {isReportingAbuse && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end max-w-md mx-auto">
          <div className="bg-white w-full rounded-t-2xl p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-rose-600 flex items-center gap-2"><ShieldAlert /> Report Issue</h2>
              <button onClick={() => setIsReportingAbuse(false)} className="bg-slate-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={handleAbuseSubmit} className="space-y-4">
              <select value={abuseForm.category} onChange={e => setAbuseForm({...abuseForm, category: e.target.value})} className="w-full border p-3 rounded-lg outline-none">
                <option>Abuse/Neglect</option>
                <option>Illegal Breeding</option>
                <option>Dog Fighting</option>
              </select>
              <textarea value={abuseForm.details} onChange={e => setAbuseForm({...abuseForm, details: e.target.value})} required placeholder="Provide specific details..." className="w-full border p-3 rounded-lg h-24 outline-none resize-none"></textarea>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={abuseForm.agreed} onChange={e => setAbuseForm({...abuseForm, agreed: e.target.checked})} required /> I confirm this is accurate.
              </label>
              <button type="submit" disabled={isSubmittingReport} className="w-full bg-rose-600 text-white font-bold py-3.5 rounded-xl">{isSubmittingReport ? 'Submitting...' : 'Submit Report'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}