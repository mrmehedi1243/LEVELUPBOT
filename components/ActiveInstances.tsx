import React from 'react';
import { Instance } from '../types';
import { Activity } from 'lucide-react';
import InstanceCard from './InstanceCard';

interface ActiveInstancesProps {
  instances: Instance[];
  levelApiUrl?: string;
  bannerApiUrl?: string;
  onDelete: (id: string, uid: string) => void;
  onStop: (id: string, uid: string) => void;
  onStart: (id: string, uid: string) => void;
  onRestart: (id: string, uid: string) => void;
  onToggleSafeMode: (id: string, enabled: boolean) => void;
  onUpdate: (id: string, data: Partial<Instance>) => void;
}

const ActiveInstances: React.FC<ActiveInstancesProps> = ({ 
  instances, 
  levelApiUrl,
  bannerApiUrl,
  onDelete, 
  onStop, 
  onStart,
  onRestart,
  onToggleSafeMode,
  onUpdate
}) => {
  // Count only genuinely active instances
  const activeCount = instances.filter(i => i.status === 'active' || i.status === 'restarting').length;

  if (instances.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/20 h-[300px] flex flex-col items-center justify-center text-slate-500">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600">No Instances Created</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Activity size={24} className="text-cyan-400" />
            <span>Process Manager</span>
          </h2>
          <span className="bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold px-3 py-1 rounded border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              {activeCount} RUNNING
          </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {instances.map((instance) => (
          <InstanceCard 
            key={instance.id} 
            instance={instance} 
            levelApiUrl={levelApiUrl}
            bannerApiUrl={bannerApiUrl}
            onDelete={onDelete}
            onStop={onStop}
            onStart={onStart}
            onRestart={onRestart}
            onToggleSafeMode={onToggleSafeMode}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
};

export default ActiveInstances;