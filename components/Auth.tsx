
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
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1e293b] rounded-[2.5rem] shadow-2xl border border-slate-700 p-8 md:p-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg shadow-indigo-900/50 mx-auto mb-6">
            <i className="fa-solid fa-cloud"></i>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
            Zesta-<span className="text-indigo-400">POS</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            {isLogin ? 'Welcome Back Admin' : 'Create New Account'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-[10px] font-black uppercase tracking-widest p-4 rounded-xl mb-6 flex items-center gap-3">
            <i className="fa-solid fa-circle-exclamation text-base"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
              <input
                required
                type="text"
                placeholder="John Doe"
                className="w-full p-4 bg-[#0f172a] border-2 border-slate-800 rounded-2xl text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
            <input
              required
              type="email"
              placeholder="admin@zestapos.com"
              className="w-full p-4 bg-[#0f172a] border-2 border-slate-800 rounded-2xl text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Password</label>
            <input
              required
              type="password"
              placeholder="••••••••"
              className="w-full p-4 bg-[#0f172a] border-2 border-slate-800 rounded-2xl text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-700"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black flex items-center justify-center gap-4 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-[0_10px_30px_rgba(79,70,229,0.3)] active:scale-[0.98] uppercase tracking-[3px] text-xs mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>{isLogin ? 'Login Securely' : 'Complete Setup'}</>
            )}
          </button>
        </form>

        <div className="text-center mt-8">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Create one" : "Already have an account? Login here"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
