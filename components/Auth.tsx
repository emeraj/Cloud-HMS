import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { auth } from '../store';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(userCredential.user, {
          displayName: formData.name
        });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl"></div>

        <div className="text-center mb-10 relative z-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg shadow-indigo-600/20 mx-auto mb-6 transform hover:rotate-6 transition-transform">
            <i className="fa-solid fa-cloud"></i>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
            Cloud-<span className="text-indigo-600">HMS</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
            {isLogin ? 'Professional Restaurant System' : 'System Onboarding'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <i className="fa-solid fa-circle-exclamation text-lg"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Full Identity</label>
              <div className="relative group">
                <input
                  required
                  type="text"
                  placeholder="Your Name"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 ring-indigo-500/5 outline-none transition-all placeholder:text-slate-400"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <i className="fa-solid fa-id-card absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Access Email</label>
            <div className="relative group">
              <input
                required
                type="email"
                placeholder="admin@cloudhms.com"
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 ring-indigo-500/5 outline-none transition-all placeholder:text-slate-400"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Security Key</label>
            <div className="relative group">
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-4 ring-indigo-500/5 outline-none transition-all placeholder:text-slate-400"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black flex items-center justify-center gap-4 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] uppercase tracking-[0.2em] text-[11px] mt-6"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>{isLogin ? 'Sign In Securely' : 'Activate Account'}</>
            )}
            {!loading && <i className="fa-solid fa-arrow-right text-[10px]"></i>}
          </button>
        </form>

        <div className="text-center mt-10 relative z-10">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors py-2"
          >
            {isLogin ? "Need an account? Register" : "Already registered? Access Login"}
          </button>
        </div>
      </div>

      <div className="fixed bottom-6 text-center w-full">
         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
            &copy; 2025 Cloud-HMS Cloud Systems
         </p>
      </div>
    </div>
  );
};

export default Auth;
