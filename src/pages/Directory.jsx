import React from 'react';

export default function Directory() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-slate-700 tracking-tight">Verified Rescues & Support</h2>
      
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900">Downtown Dog Rescue</h3>
        <p className="text-sm text-slate-600 mb-4 mt-1">Focus: DTLA, low-income support, kennel intervention.</p>
        <div className="flex space-x-3">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 rounded-lg text-sm font-bold shadow-sm">Donate</button>
          <button className="flex-1 border border-slate-300 hover:bg-slate-50 transition-colors py-2 rounded-lg text-sm font-bold text-slate-700">Contact</button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900">LA Animal Rescue</h3>
        <p className="text-sm text-slate-600 mb-4 mt-1">Focus: Street rescues, severe medical cases.</p>
        <div className="flex space-x-3">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 transition-colors text-white py-2 rounded-lg text-sm font-bold shadow-sm">Donate</button>
          <button className="flex-1 border border-slate-300 hover:bg-slate-50 transition-colors py-2 rounded-lg text-sm font-bold text-slate-700">Contact</button>
        </div>
      </div>
    </div>
  );
}