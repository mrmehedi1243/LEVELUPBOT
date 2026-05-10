import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, ExternalLink, Youtube, Loader2, LogIn, RefreshCw } from 'lucide-react';
import { login, fetchAppConfig } from '../services/auth';
import { CurrentUser } from '../types';

interface LoginProps {
  onLogin: (user: CurrentUser) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [contactLink, setContactLink] = useState('#');
  const [youtubeLink, setYoutubeLink] = useState('#');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
      setIsConfigLoading(true);
      try {
          const config = await fetchAppConfig();
          setContactLink(config.contactLink || '#');
          setYoutubeLink(config.youtubeLink || '#');
      } catch (e) {
          console.error("Config load error", e);
      } finally {
          setIsConfigLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const result = await login(username, password);
        
        if (result.success && result.user) {
          onLogin(result.user);
        } else {
          setError(result.message || "Login failed");
        }
    } catch (err) {
        setError("Network error. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  // Helper to safely handle link clicks
  const handleLinkClick = (e: React.MouseEvent, url: string, name: string) => {
      if (!url || url === '#' || url.trim() === '') {
          e.preventDefault();
          alert(`The '${name}' link has not been configured by the Admin yet.\n\nPlease contact support.`);
          return;
      }
      // Protocol check handled by AdminPanel saving, but purely defensive here:
      if (!/^https?:\/\//i.test(url)) {
           // We can't auto-fix on click easily because target=_blank needs a valid href beforehand.
           // AdminPanel fixes this on save.
      }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Pattern - subtle grid instead of blur */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="w-full max-w-md bg-[#1e293b] border border-slate-700 rounded-2xl p-8 shadow-2xl relative z-10 flex flex-col">
        
        <div className="absolute top-4 right-4">
             <button 
                onClick={loadConfig} 
                className={`p-2 text-slate-500 hover:text-white rounded-full hover:bg-slate-700 transition-colors ${isConfigLoading ? 'animate-spin' : ''}`}
                title="Refresh System Config"
             >
                 <RefreshCw size={14} />
             </button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-lg">
            <ShieldCheck size={32} className="text-[#00f0ff]" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">GS LEVEL UP BOT</h1>
          <p className="text-slate-500 text-sm mt-2">Access the Control Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center font-mono">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-600 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter username"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-600 text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter password"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold py-3.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${
                isLoading 
                ? 'bg-slate-700 text-slate-400 cursor-wait' 
                : 'bg-blue-600 hover:bg-blue-500 text-white transform active:scale-95 cursor-pointer'
            }`}
          >
            {isLoading ? (
                <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying...</span>
                </>
            ) : (
                <>
                    <span>LOGIN SYSTEM</span>
                    <LogIn size={18} />
                </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700 space-y-3">
           <a 
             href={contactLink} 
             target="_blank" 
             rel="noopener noreferrer"
             onClick={(e) => handleLinkClick(e, contactLink, "Get Login Details")}
             className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold py-3 rounded-lg transition-colors group cursor-pointer active:scale-95"
           >
             <span>Get Login Details</span>
             <ExternalLink size={16} className="text-slate-400 group-hover:text-white transition-colors" />
           </a>
           
           <a 
             href={youtubeLink} 
             target="_blank" 
             rel="noopener noreferrer"
             onClick={(e) => handleLinkClick(e, youtubeLink, "How To Use")}
             className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 font-semibold py-3 rounded-lg transition-colors group cursor-pointer active:scale-95"
           >
             <Youtube size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
             <span>How To Use</span>
           </a>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-slate-600 text-[10px] uppercase tracking-widest font-mono z-10">
        © 2026 MEHEDI level up bot. All rights reserved
      </footer>
    </div>
  );
};

export default Login;