import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export default function ShareButton({ title, text, url, className = "", variant = "solid" }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    
    const shareData = { title, text, url };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Styling variants for different UI placements
  const baseStyle = "flex items-center justify-center gap-2 font-bold transition-all outline-none";
  const styles = {
    solid: `${baseStyle} bg-cyan-100 text-cyan-700 hover:bg-cyan-200 rounded-xl px-4 py-3`,
    outline: `${baseStyle} border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl px-4 py-3`,
    ghost: `${baseStyle} text-slate-500 hover:text-cyan-600 p-2 rounded-full hover:bg-slate-100`
  };

  return (
    <button 
      onClick={handleShare}
      className={`${styles[variant]} ${className}`}
      aria-label="Share Profile"
    >
      {copied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
      {variant !== 'ghost' && (copied ? 'Link Copied!' : 'Share Profile')}
    </button>
  );
}