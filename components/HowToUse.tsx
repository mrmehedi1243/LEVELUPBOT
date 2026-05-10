import React, { useEffect, useState } from 'react';
import { BookOpen, Gamepad2, UserCheck, MessageSquare, AlertOctagon, AlertTriangle, Youtube } from 'lucide-react';
import { fetchAppConfig } from '../services/auth';

const HowToUse: React.FC = () => {
  const [customInstructions, setCustomInstructions] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('#');

  useEffect(() => {
    const loadConfig = async () => {
      const config = await fetchAppConfig();
      setCustomInstructions(config.dashboardInstructions || '');
      setYoutubeLink(config.youtubeLink || '#');
    };
    loadConfig();
  }, []);

  const renderYouTubeButton = () => (
    <a 
      href={youtubeLink} 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-6 w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 font-semibold py-3 rounded-lg transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-red-900/20 group"
    >
      <Youtube size={20} className="text-red-500 group-hover:animate-bounce" />
      <span>Watch Tutorial</span>
    </a>
  );

  if (customInstructions) {
    return (
        <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-lg mt-6 animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-purple-400" />
                Instructions
            </h2>
            <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-mono">
                {customInstructions}
            </div>
            {renderYouTubeButton()}
        </div>
    );
  }

  return (
    <div className="bg-gaming-panel border border-slate-700 rounded-xl p-6 shadow-lg mt-6 animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <BookOpen size={20} className="text-purple-400" />
        How to Work
      </h2>
      
      <div className="space-y-5">
        {/* Step 1 */}
        <div className="flex gap-3 group hover:bg-slate-800/50 p-2 rounded-lg transition-colors duration-300">
          <div className="bg-blue-500/10 p-2 h-fit rounded-lg border border-blue-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <UserCheck size={20} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm group-hover:text-blue-300 transition-colors">1. Launch & Accept</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              First, launch an instance for your UID. Open Free Fire and accept the friend request from the bot.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-3 group hover:bg-slate-800/50 p-2 rounded-lg transition-colors duration-300">
          <div className="bg-green-500/10 p-2 h-fit rounded-lg border border-green-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Gamepad2 size={20} className="text-green-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm group-hover:text-green-300 transition-colors">2. Select Mode</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Select <span className="font-mono text-green-300">Lone Wolf 1v1</span> mode and copy your <strong>Team Code</strong>.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-3 group hover:bg-slate-800/50 p-2 rounded-lg transition-colors duration-300">
          <div className="bg-yellow-500/10 p-2 h-fit rounded-lg border border-yellow-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <MessageSquare size={20} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm group-hover:text-yellow-300 transition-colors">3. Send Command</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Go to the bot's Whisper (private chat) and send the team code with the prefix <code>/lw</code>.
            </p>
            <div className="mt-2 bg-black/40 p-2 rounded border border-slate-700 font-mono text-xs text-yellow-300 inline-block">
             ?/lw&lt;TeamCode&gt; <span className="text-slate-600 mx-2">//</span> Example: /lw2839738
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-3 group hover:bg-slate-800/50 p-2 rounded-lg transition-colors duration-300">
          <div className="bg-red-500/10 p-2 h-fit rounded-lg border border-red-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300">
            <AlertOctagon size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm group-hover:text-red-300 transition-colors">4. Stop Bot</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              To stop the operation, simply send the stop command in whisper.
            </p>
             <div className="mt-2 bg-black/40 p-2 rounded border border-slate-700 font-mono text-xs text-red-300 inline-block">
              /stop
            </div>
          </div>
        </div>

        {/* Step 5 (New Note) */}
        <div className="flex gap-3 group bg-orange-500/5 p-3 rounded-lg border border-orange-500/20 hover:bg-orange-500/10 transition-colors duration-300">
          <div className="bg-orange-500/10 p-2 h-fit rounded-lg border border-orange-500/20 shrink-0 group-hover:scale-110 transition-transform duration-300 animate-pulse">
            <AlertTriangle size={20} className="text-orange-400" />
          </div>
          <div>
            <h3 className="font-bold text-orange-200 text-sm group-hover:text-orange-300 transition-colors">5. Important Note</h3>
            <p className="text-xs text-orange-200/80 mt-1 leading-relaxed font-semibold">
              If you use it for more than 1 hour then stop for a while and then play 1 or 2 matches of BR or CS again or do not do it like this otherwise your ID will be banned.
            </p>
          </div>
        </div>
      </div>

      {renderYouTubeButton()}
    </div>
  );
};

export default HowToUse;