import React, { useState } from 'react';
import { 
  X, Camera, MapPin, Link as LinkIcon, Clock, 
  Building, CheckCircle2, Crosshair, Loader2 
} from 'lucide-react';

export default function ReportModal({ isOpen, onClose, reportType }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  
  const [photoFiles, setPhotoFiles] = useState([]);
  const [formData, setFormData] = useState({
    url: '',
    type: 'Dog',
    age: '',
    sex: '',
    color: '',
    size: '',
    location: '',
    notes: '',
    name: '',
    shelter_id: '',
    urgent_deadline: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- MOCK URL SCRAPER (Shelter Alert) ---
  const handleAutoFillURL = async () => {
    if (!formData.url) return alert("Please enter a shelter URL first.");
    setIsScraping(true);
    
    // Simulate network delay for web scraping API
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        shelter_id: 'A2069894',
        name: 'Buddy',
        type: 'Dog',
        age: 'Adult',
        sex: 'Male',
        color: 'Brown/White',
        size: 'Large',
        location: 'LA Animal Services - Chesterfield Square',
        notes: 'Needs immediate exit. Very sweet but deteriorating in the kennel environment.'
      }));
      setIsScraping(false);
    }, 1500);
  };

  // --- LOCATION CAPTURE (Stray Sighting) ---
  const captureLiveLocation = () => {
    setIsFetchingGPS(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({ ...prev, location: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}` }));
          setIsFetchingGPS(false);
        },
        (error) => {
          alert('GPS Error. Please enter location manually.');
          setIsFetchingGPS(false);
        }
      );
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    setPhotoFiles(files);
    
    // Mock EXIF Data Extraction Trigger
    if (reportType === 'Stray' && files.length > 0) {
      console.log("Extracting EXIF GPS data from image...");
      // In production, use a library like exifr to parse coordinates here
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Submit logic routes to Supabase here
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  const isShelter = reportType === 'Shelter Urgent';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center max-w-md mx-auto transition-all">
      <div className="bg-white w-full rounded-t-2xl sm:rounded-2xl p-5 h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-2 border-b border-slate-100 z-10">
          <h2 className="text-xl font-black tracking-tight text-slate-800 flex items-center gap-2">
            {isShelter ? <span className="text-rose-600">Shelter Alert</span> : <span className="text-blue-600">Report Sighting</span>}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* --- SHELTER URL SCRAPER --- */}
          {isShelter && (
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 mb-4">
              <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">
                Auto-Fill via Shelter URL
              </label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input 
                    type="url" name="url" placeholder="Paste shelter listing link..."
                    value={formData.url} onChange={handleChange}
                    className="w-full bg-white border border-rose-200 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <LinkIcon size={16} className="absolute left-3.5 top-3.5 text-rose-400" />
                </div>
                <button 
                  type="button" onClick={handleAutoFillURL} disabled={isScraping}
                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold px-4 rounded-lg text-sm transition-colors flex items-center gap-1 shrink-0"
                >
                  {isScraping ? <Loader2 size={16} className="animate-spin" /> : 'Auto-Fill'}
                </button>
              </div>
            </div>
          )}

          {/* --- PHOTO UPLOAD --- */}
          <label className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer group block ${photoFiles.length > 0 ? 'border-green-500 bg-green-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
            <input type="file" accept="image/*" multiple capture={!isShelter ? "environment" : undefined} className="hidden" onChange={handlePhotoUpload} />
            <div className={`flex flex-col items-center gap-2 font-bold ${photoFiles.length > 0 ? 'text-green-600' : 'text-slate-600'}`}>
              {photoFiles.length > 0 ? <CheckCircle2 size={32} /> : <Camera size={32} className="text-slate-400 group-hover:text-blue-600 transition-colors" />}
              {photoFiles.length > 0 ? `${photoFiles.length} Photo(s) Attached` : 'Add / Take Photo'}
            </div>
            {!isShelter && <p className="text-xs text-slate-500 mt-2">Location will be auto-extracted from photo data if available.</p>}
          </label>

          {/* --- IDENTIFYING DETAILS (Common) --- */}
          <div className="grid grid-cols-2 gap-4">
            {isShelter && (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Animal Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-slate-400" />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Species</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-slate-400">
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sex</label>
              <select name="sex" value={formData.sex} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-slate-400">
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Age Group</label>
              <select name="age" value={formData.age} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-slate-400">
                <option value="">Select...</option>
                <option value="Puppy/Kitten">Puppy / Kitten</option>
                <option value="Adult">Adult</option>
                <option value="Senior">Senior</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Size</label>
              <select name="size" value={formData.size} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-slate-400">
                <option value="">Select...</option>
                <option value="Small">Small (0-20 lbs)</option>
                <option value="Medium">Medium (21-50 lbs)</option>
                <option value="Large">Large (51+ lbs)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Color / Markings</label>
              <input type="text" name="color" value={formData.color} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-slate-400" />
            </div>
          </div>

          {/* --- SHELTER SPECIFIC LOGIC --- */}
          {isShelter ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shelter ID</label>
                  <input type="text" name="shelter_id" value={formData.shelter_id} onChange={handleChange} required className="w-full bg-white border border-slate-300 p-2.5 rounded-lg text-sm font-mono outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Deadline</label>
                  <input type="datetime-local" name="urgent_deadline" value={formData.urgent_deadline} onChange={handleChange} required className="w-full bg-white border border-rose-300 p-2.5 rounded-lg text-sm outline-none text-rose-700 font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shelter Location</label>
                <div className="relative">
                  <input type="text" name="location" value={formData.location} onChange={handleChange} required className="w-full bg-white border border-slate-300 p-2.5 pl-9 rounded-lg text-sm outline-none" />
                  <Building size={16} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>
            </div>
          ) : (
            // --- STRAY SPECIFIC LOGIC ---
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <input type="text" name="location" value={formData.location} onChange={handleChange} required placeholder="Cross streets or address..." className="w-full bg-slate-50 border border-slate-300 p-3 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                  <MapPin size={18} className="absolute left-3 top-3.5 text-slate-400" />
                </div>
                <button type="button" onClick={captureLiveLocation} disabled={isFetchingGPS} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-lg transition-colors border border-slate-300 shrink-0" title="Get Current GPS">
                  {isFetchingGPS ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
                </button>
              </div>
            </div>
          )}

          {/* --- NOTES (Common) --- */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes</label>
            <textarea 
              name="notes" value={formData.notes} onChange={handleChange} required
              className={`w-full bg-slate-50 border border-slate-300 p-3 rounded-lg h-24 outline-none transition-all resize-none text-sm ${isShelter ? 'focus:ring-2 focus:ring-rose-600' : 'focus:ring-2 focus:ring-blue-600'}`}
              placeholder={isShelter ? "Behavioral notes, medical issues..." : "Collar details, behavior, direction headed..."}
            ></textarea>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={isSubmitting} className={`w-full text-white font-black py-4 rounded-xl shadow-md transition-all ${isShelter ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {isSubmitting ? 'Uploading...' : (isShelter ? 'Publish Shelter Alert' : 'Post Stray Sighting')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}