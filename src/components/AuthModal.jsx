import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: '', streetAddress: '', city: '', state: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) alert(error.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            street_address: formData.streetAddress,
            city: formData.city,
            state: formData.state,
          }
        }
      });

      if (error) {
        alert(error.message);
      } else {
        // Create the public profile record
        if (data.user) {
          await supabase.from('profiles').insert([{
            id: data.user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            street_address: formData.streetAddress,
            city: formData.city,
            state: formData.state
          }]);
        }
        alert('Account created! You are now logged in.');
        onClose();
        window.location.reload();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) alert(error.message);
      else {
        onClose();
        window.location.reload();
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-6 tracking-tight">
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h2>

        <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-bold py-2.5 rounded-lg shadow-sm hover:bg-slate-50 mb-4 transition-colors">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <>
              <div className="flex gap-2">
                <input type="text" name="firstName" placeholder="First Name *" required onChange={handleChange} className="w-1/2 border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                <input type="text" name="lastName" placeholder="Last Name *" required onChange={handleChange} className="w-1/2 border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <input type="text" name="streetAddress" placeholder="Street Address (Optional)" onChange={handleChange} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
              <div className="flex gap-2">
                <input type="text" name="city" placeholder="City *" required onChange={handleChange} className="w-2/3 border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
                <input type="text" name="state" placeholder="State *" required onChange={handleChange} className="w-1/3 border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </>
          )}
          <input type="email" name="email" placeholder="Email *" required onChange={handleChange} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
          <input type="password" name="password" placeholder="Password *" required onChange={handleChange} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600" />
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-sm mt-2 transition-colors">
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-600 font-bold hover:underline">
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}