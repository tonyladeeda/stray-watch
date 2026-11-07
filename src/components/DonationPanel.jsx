import React, { useState } from 'react';
import { Heart, ShieldCheck, DollarSign, Info, ArrowRight } from 'lucide-react';

export default function DonationPanel({ type = 'animal', targetName = 'this animal', isVerified = true }) {
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [coverFees, setCoverFees] = useState(true);
  const [tipAmount, setTipAmount] = useState(5); // Default platform tip option

  const presets = [10, 25, 50, 100];
  const isRescue = type === 'rescue';

  const handlePresetClick = (val) => {
    setSelectedAmount(val);
    setCustomAmount('');
  };

  const handleCustomChange = (e) => {
    setSelectedAmount(null);
    setCustomAmount(e.target.value.replace(/[^0-9]/g, ''));
  };

  const baseAmount = Number(selectedAmount || customAmount || 0);
  
  // Standard processing fee estimation (e.g., 2.9% + $0.30)
  const processingFee = coverFees && baseAmount > 0 ? Number((baseAmount * 0.029 + 0.30).toFixed(2)) : 0;
  const totalCharge = Number((baseAmount + processingFee + tipAmount).toFixed(2));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`p-4 border-b ${isRescue ? 'bg-indigo-50 border-indigo-100' : 'bg-emerald-50 border-emerald-100'}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${isRescue ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {isRescue ? <ShieldCheck size={20} /> : <Heart size={20} />}
          </div>
          <div>
            <h3 className={`font-black tracking-tight ${isRescue ? 'text-indigo-900' : 'text-emerald-900'}`}>
              {isRescue ? 'General Care Fund' : 'Direct Animal Pledge'}
            </h3>
            <p className={`text-xs mt-1 ${isRescue ? 'text-indigo-700' : 'text-emerald-700'}`}>
              {isRescue 
                ? `Support ${targetName}'s everyday operations, facility costs, and transport.` 
                : `100% of your base pledge goes directly to ${targetName}'s medical and boarding costs.`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {isVerified && (
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 py-2 rounded-lg border border-slate-100">
            <ShieldCheck size={14} className="text-emerald-500" />
            Verified 501(c)(3) • Secure Stripe Processing
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {presets.map(amount => (
            <button
              key={amount}
              onClick={() => handlePresetClick(amount)}
              className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${
                selectedAmount === amount 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <DollarSign size={18} className={`${customAmount ? 'text-slate-800' : 'text-slate-400'}`} />
          </div>
          <input
            type="text"
            placeholder="Custom Amount"
            value={customAmount}
            onChange={handleCustomChange}
            className={`w-full p-4 pl-10 rounded-xl font-black text-lg outline-none transition-all border-2 ${
              customAmount 
                ? 'bg-white border-slate-900 text-slate-900 shadow-sm' 
                : 'bg-slate-50 border-slate-200 text-slate-600 focus:border-slate-400'
            }`}
          />
        </div>

        {/* Fee Coverage Checkbox */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={coverFees} 
              onChange={(e) => setCoverFees(e.target.checked)} 
              className="mt-0.5 w-4 h-4 accent-slate-900 rounded"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-800">Cover transaction processing fees (${processingFee.toFixed(2)})</p>
              <p className="text-slate-500">Ensure the full ${baseAmount} goes directly to the rescue.</p>
            </div>
          </label>

          {/* Optional Platform Tip */}
          <div className="border-t border-slate-200 pt-3">
            <p className="text-xs font-bold text-slate-700 mb-2">Support StrayGuard development (Optional Tip):</p>
            <div className="flex gap-2">
              {[0, 3, 5, 10].map(tip => (
                <button
                  key={tip}
                  onClick={() => setTipAmount(tip)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    tipAmount === tip 
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tip === 0 ? 'None' : `$${tip}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-bold text-slate-600">
          <span>Total Charge</span>
          <span className="text-2xl font-black text-slate-900">${totalCharge.toFixed(2)}</span>
        </div>

        <button 
          onClick={() => alert(`Stripe Checkout flow initiated for a total charge of $${totalCharge.toFixed(2)} ($${baseAmount} base + $${processingFee} fees + $${tipAmount} tip).`)}
          disabled={!baseAmount || baseAmount <= 0}
          className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 active:scale-95"
        >
          {isRescue ? 'Donate' : 'Pledge'} ${totalCharge.toFixed(2)} <ArrowRight size={18} />
        </button>

        <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
          <Info size={12} /> Securely processed via Stripe Connect.
        </p>
      </div>
    </div>
  );
}