import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ExpiryTimerProps {
  expiryDate: number;
  showIcon?: boolean;
}

const ExpiryTimer: React.FC<ExpiryTimerProps> = ({ expiryDate, showIcon = false }) => {
  const [timeLeft, setTimeLeft] = useState(expiryDate - Date.now());

  useEffect(() => {
    // Immediate calculation
    setTimeLeft(expiryDate - Date.now());

    const interval = setInterval(() => {
      const remaining = expiryDate - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryDate]);

  if (timeLeft <= 0) {
    return <span className="text-red-400 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">EXPIRED</span>;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <div className="flex items-center gap-1.5">
      {showIcon && <Clock size={14} className="text-blue-400" />}
      <span className="text-green-400 font-mono text-xs tabular-nums">
        {days}d {hours}h {minutes}m {seconds}s
      </span>
    </div>
  );
};

export default ExpiryTimer;