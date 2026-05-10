import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal } from 'lucide-react';

interface ConsoleLogProps {
  logs: LogEntry[];
}

const ConsoleLog: React.FC<ConsoleLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Safety check to ensure logs is always an array to prevent "map is not a function" crash
  const safeLogs = Array.isArray(logs) ? logs : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeLogs]);

  return (
    <div className="bg-black/40 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-64 md:h-80 shadow-inner">
      <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
        <Terminal size={16} className="text-gaming-neon" />
        <span className="text-xs font-mono font-bold text-slate-300">SYSTEM CONSOLE</span>
      </div>
      <div className="p-4 overflow-y-auto flex-1 font-mono text-xs md:text-sm space-y-1 console-scroll">
        {safeLogs.length === 0 && (
          <div className="text-slate-500 italic">Waiting for commands...</div>
        )}
        {safeLogs.map((log) => (
          <div key={log.id} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-slate-500 min-w-[80px]">[{log.timestamp}]</span>
            <span className={
              log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-green-400' :
              log.type === 'warning' ? 'text-yellow-400' :
              'text-blue-300'
            }>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ConsoleLog;