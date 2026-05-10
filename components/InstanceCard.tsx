import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Instance, LevelInfo } from '../types';
import { fetchLevelInfo, fetchProfileData } from '../services/api';
import { Trash2, StopCircle, RotateCw, Shield, ShieldAlert, User as UserIcon, RefreshCw, Zap, Loader2, Timer, TrendingUp, ArrowRight, Play, Image as ImageIcon } from 'lucide-react';

interface InstanceCardProps {
  instance: Instance;
  levelApiUrl?: string;
  bannerApiUrl?: string;
  onDelete: (id: string, uid: string) => void;
  onStop: (id: string, uid: string) => void;
  onStart: (id: string, uid: string) => void;
  onRestart: (id: string, uid: string) => void;
  onToggleSafeMode: (id: string, enabled: boolean) => void;
  onUpdate: (id: string, data: Partial<Instance>) => void;
}

const InstanceCard: React.FC<InstanceCardProps> = ({ 
  instance, 
  levelApiUrl, 
  bannerApiUrl,
  onDelete, 
  onStop, 
  onStart, 
  onRestart,
  onToggleSafeMode,
  onUpdate
}) => {
  const [levelData, setLevelData] = useState<LevelInfo | null>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Display States
  const [xpRate, setXpRate] = useState<string>(instance.lastKnownRate && instance.lastKnownRate !== "--" ? instance.lastKnownRate : "Calculating...");
  const [uptime, setUptime] = useState<string>("--");
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imgError, setImgError] = useState(false);

  // --- ROLLING HISTORY REF ---
  // Stores {time, exp} points to calculate speed over the last 60 seconds
  const xpHistoryRef = useRef<{time: number, exp: number}[]>([]);
  
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const parseExp = (val: any) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    return parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0;
  };
  
  const getProp = (obj: any, keys: string[]) => {
      if (!obj) return undefined;
      for (const key of keys) {
          if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
      }
      return undefined;
  };

  const loadData = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setIsRefreshing(true);
    
    try {
      const lvl = await fetchLevelInfo(instance.targetUid, levelApiUrl);
      
      if (lvl) {
        const currentExp = parseExp(getProp(lvl, ['current_exp', 'curr_exp', 'CurrentExp']));
        const now = Date.now();
        
        if (currentExp > 0) {
            // 1. Add current point to history
            xpHistoryRef.current.push({ time: now, exp: currentExp });

            // 2. Keep only last 70 seconds of history (Rolling Window)
            // We need slightly more than 60s to find a good comparison point
            const cutoff = now - 70000;
            xpHistoryRef.current = xpHistoryRef.current.filter(p => p.time > cutoff);

            // 3. Calculate Rate (XP Per Minute)
            if (xpHistoryRef.current.length >= 2) {
                const newest = xpHistoryRef.current[xpHistoryRef.current.length - 1];
                const oldest = xpHistoryRef.current[0];
                
                const timeDiffMs = newest.time - oldest.time;
                const expDiff = newest.exp - oldest.exp;

                // Only update rate if we have a valid time difference (> 5 seconds to avoid divide by zero spikes)
                if (timeDiffMs > 5000) {
                     // Normalize to 60 seconds (1 minute)
                     // Formula: (XP Gained / Time Elapsed in Minutes)
                     const mins = timeDiffMs / 60000;
                     const calculatedRate = Math.floor(expDiff / mins);

                     // Only show positive rates (ignore level up resets or glitches)
                     if (calculatedRate >= 0) {
                         const rateStr = String(calculatedRate);
                         setXpRate(rateStr);
                         
                         // Save to parent occasionally
                         if (Math.random() > 0.8) {
                             onUpdateRef.current(instance.id, { lastKnownRate: rateStr });
                         }
                     }
                }
            }
        }
        
        setLevelData(lvl);
      }
    } catch (e) {
      console.error(e);
    } finally {
        if (!isAutoRefresh) setIsRefreshing(false);
    }
  }, [instance.targetUid, instance.id, levelApiUrl]);

  // Load Profile Image
  useEffect(() => {
      let isMounted = true;
      const loadProfile = async () => {
          setImgError(false);
          try {
              const data = await fetchProfileData(instance.targetUid, bannerApiUrl);
              if (isMounted && data) {
                  setProfile(data);
              }
          } catch(e) { console.error("Profile error", e); }
      };
      loadProfile();
      return () => { isMounted = false; };
  }, [instance.targetUid, bannerApiUrl]);

  // Load Data on Mount and Interval (12 Seconds)
  useEffect(() => {
    loadData(); 
    const interval = setInterval(() => loadData(true), 12000); // 12 Seconds Auto-Refresh
    return () => clearInterval(interval);
  }, [loadData]);

  // Uptime Timer
  useEffect(() => {
    if (instance.status !== 'active' && instance.status !== 'restarting') {
        setUptime('--');
        return;
    }
    
    if (!instance.startedTimestamp) {
        setUptime('Starting...');
        return;
    }

    const updateTimer = () => {
        const now = Date.now();
        const diff = now - (instance.startedTimestamp || now);
        
        if (diff < 0) { setUptime("0s"); return; }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setUptime(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [instance.status, instance.startedTimestamp]);

  const currentExp = parseExp(getProp(levelData, ['current_exp', 'curr_exp']));
  const startExp = parseExp(getProp(levelData, ['exp_for_current_level', 'start_exp']));
  const nextExp = parseExp(getProp(levelData, ['exp_for_next_level', 'next_exp']));
  const expNeeded = parseExp(getProp(levelData, ['exp_needed', 'needed_exp']));
  
  const rawLevel = getProp(levelData, ['level', 'Level', 'lvl', 'current_level', 'Lvl']);
  const levelNum = parseExp(rawLevel); 
  const levelDisplay = levelNum > 0 ? levelNum : '--';
  const nextLevelDisplay = levelNum > 0 ? levelNum + 1 : '--';

  const displayName = getProp(levelData, ['nickname', 'name', 'user_name']) || getProp(profile, ['Nickname', 'nickname', 'name', 'user_name']) || 'Loading Name...';
  const avatarUrl = getProp(profile, ['Avatar', 'avatar', 'icon', 'image', 'pic']);
  const bannerUrl = getProp(profile, ['Banner', 'banner', 'cover', 'background', 'wall']);

  let percent = 0;
  const apiPercent = getProp(levelData, ['progress_percentage', 'percent', 'percentage']);
  if (apiPercent !== undefined) {
      percent = parseFloat(String(apiPercent).replace('%', ''));
  } else if (nextExp - startExp > 0) {
      percent = ((currentExp - startExp) / (nextExp - startExp)) * 100;
  }
  if (isNaN(percent)) percent = 0;
  
  // ETA Calculation based on Rolling Rate
  let etaDisplay = "--";
  const rateNum = parseInt(xpRate);
  
  if (!isNaN(rateNum) && rateNum > 0 && nextExp > currentExp) {
      const minsLeft = (nextExp - currentExp) / rateNum;
      if (minsLeft < 60) etaDisplay = `${Math.ceil(minsLeft)}m`;
      else {
          const h = Math.floor(minsLeft / 60);
          const m = Math.ceil(minsLeft % 60);
          etaDisplay = `${h}h ${m}m`;
      }
  } else if (getProp(levelData, ['eta'])) {
      etaDisplay = getProp(levelData, ['eta']);
  }

  const formatNum = (num: number) => new Intl.NumberFormat('en-US').format(num);
  const neededDisplay = expNeeded > 0 ? expNeeded : (nextExp > currentExp ? nextExp - currentExp : 0);
  const displayStatus = (instance.status || 'UNKNOWN').toUpperCase();
  const isActive = instance.status === 'active' || instance.status === 'restarting';
  const isStopped = instance.status === 'stopped' || instance.status === 'error';
  const isRemoving = instance.status === 'removing';

  const speedDisplay = xpRate === "Calculating..." ? "Calc..." : xpRate;
  const showSpeedUnit = xpRate !== "Calculating..." && xpRate !== "Calc..." && xpRate !== "--";

  return (
    <div className="bg-[#111827] rounded-xl overflow-hidden border border-slate-800 shadow-xl font-sans flex flex-col h-full relative group hover:border-slate-700 transition-colors">
      
      {/* Top Controls Row */}
      <div className="flex justify-between items-center p-3 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${isActive ? 'text-green-500 bg-green-500' : 'text-red-500 bg-red-500'}`}></div>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">GS LEVEL UP BOT</span>
          </div>
          <div className="flex items-center gap-2">
              <button 
                onClick={() => onToggleSafeMode(instance.id, !instance.safeMode)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold uppercase transition-all ${
                    instance.safeMode 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                  {instance.safeMode ? <Shield size={12}/> : <ShieldAlert size={12}/>}
                  Safe Mode: {instance.safeMode ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={() => loadData(false)}
                className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all cursor-pointer"
                disabled={isRefreshing}
                title="Refresh Data Now"
              >
                  <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
              </button>
          </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
          
          {/* Banner Row */}
          <div className="w-full h-24 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shadow-inner relative group/banner flex items-center justify-center">
             {bannerUrl && !imgError ? (
                  <img 
                      src={bannerUrl} 
                      alt="Profile Banner" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                  />
             ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800/50 absolute inset-0">
                      <ImageIcon size={24} className="text-slate-700" />
                  </div>
             )}
          </div>

          {/* User Info Row */}
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0 overflow-hidden shadow-sm">
                 {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 ) : (
                    <UserIcon size={16} />
                 )}
             </div>
             <div className="flex-1 min-w-0">
                 <div className="text-sm font-bold text-white truncate">{displayName}</div>
                 <div className="flex items-center gap-2 mt-0.5">
                     <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                        UID: {instance.targetUid}
                     </span>
                 </div>
             </div>
             <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border tracking-wide ${
                 isActive 
                 ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                 : 'bg-red-500/10 border-red-500/20 text-red-400'
             }`}>
                 {displayStatus}
             </div>
          </div>

          {/* Progress Section */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              
              {/* Level Indicators */}
              <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Current Level</span>
                    <span className="text-xl font-black text-white leading-none">LVL {levelDisplay}</span>
                </div>
                
                <div className="flex items-center text-slate-600">
                    <ArrowRight size={16} />
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Next Level</span>
                    <span className="text-xl font-black text-gaming-neon leading-none">LVL {nextLevelDisplay}</span>
                </div>
              </div>

              {/* Percent Header */}
              <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] text-slate-400 font-medium">Progress</span>
                  <h3 className="text-sm font-bold text-white">{percent.toFixed(2)}%</h3>
              </div>
              
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50 mb-3 relative">
                  <div 
                    className="h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  ></div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-medium font-mono mb-4">
                  <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase">Current XP</span>
                      <span className="text-white">{formatNum(currentExp)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                       <span className="text-[9px] text-slate-500 uppercase">To Go</span>
                       <span className="text-gaming-neon">{formatNum(neededDisplay)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-500 uppercase">Target XP</span>
                      <span className="text-white">{formatNum(nextExp)}</span>
                  </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center justify-center bg-black/20 p-2 rounded-lg border border-slate-800 overflow-hidden">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                          <Zap size={12} className="text-yellow-400 shrink-0" /> 
                          <span className="text-[10px] font-bold uppercase">Speed</span>
                      </div>
                      <div className="text-xs font-mono text-white font-bold truncate w-full text-center">
                        {speedDisplay} {showSpeedUnit && <span className="text-[9px] text-slate-500 font-normal">xp/m</span>}
                      </div>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-black/20 p-2 rounded-lg border border-slate-800 overflow-hidden">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                          <Timer size={12} className="text-green-400 shrink-0" /> 
                          <span className="text-[10px] font-bold uppercase">Uptime</span>
                      </div>
                      <div className="text-xs font-mono text-white font-bold truncate w-full text-center">{uptime}</div>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-black/20 p-2 rounded-lg border border-slate-800 overflow-hidden">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                          <TrendingUp size={12} className="text-blue-400 shrink-0" /> 
                          <span className="text-[10px] font-bold uppercase">ETA</span>
                      </div>
                      <div className="text-xs font-mono text-white font-bold truncate w-full text-center">{etaDisplay}</div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button 
                  onClick={() => onStart(instance.id, instance.targetUid)}
                  disabled={isActive}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all group/btn ${
                      isActive 
                      ? 'border-slate-800 text-slate-600 bg-slate-900/50 cursor-not-allowed' 
                      : 'border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 hover:border-green-500/50'
                  }`}
                  title="Start Bot"
              >
                  <Play size={14} className="fill-current mb-1" />
                  <span className="text-[9px] font-bold uppercase">Start</span>
              </button>

              <button 
                  onClick={() => onStop(instance.id, instance.targetUid)}
                  disabled={isStopped}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all group/btn ${
                      isStopped 
                      ? 'border-slate-800 text-slate-600 bg-slate-900/50 cursor-not-allowed' 
                      : 'border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50'
                  }`}
                  title="Stop Bot"
              >
                  <StopCircle size={14} className="mb-1" />
                  <span className="text-[9px] font-bold uppercase">Stop</span>
              </button>

              <button 
                  onClick={() => onRestart(instance.id, instance.targetUid)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-blue-500/50 transition-all group/btn"
                  title="Restart Bot"
              >
                  <RotateCw size={14} className={`mb-1 group-hover/btn:text-blue-400 transition-colors ${instance.status === 'restarting' ? 'animate-spin' : ''}`} />
                  <span className="text-[9px] font-bold uppercase">Restart</span>
              </button>

              <button 
                  onClick={() => onDelete(instance.id, instance.targetUid)}
                  className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50 transition-all group/btn"
                  title="Delete Bot"
              >
                  {isRemoving ? <Loader2 size={14} className="animate-spin mb-1" /> : <Trash2 size={14} className="mb-1" />}
                  <span className="text-[9px] font-bold uppercase">Delete</span>
              </button>
          </div>

      </div>
    </div>
  );
};

export default InstanceCard;