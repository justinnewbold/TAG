import React, { useState, useEffect } from 'react';
import { Shield, Clock, MapPin, X } from 'lucide-react';
import { getPlayerStatus, getTimeUntilNoTagEnds } from '../utils/gameUtils';

export default function SafeZoneStatus({ 
  player, 
  gameSettings, 
  onClose,
  minimized = false 
}) {
  const [status, setStatus] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!player || !gameSettings) return;
    
    const updateStatus = () => {
      const newStatus = getPlayerStatus(player, gameSettings);
      setStatus(newStatus);
      
      if (newStatus.inSchedule) {
        setTimeRemaining(getTimeUntilNoTagEnds(newStatus.inSchedule));
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    
    return () => clearInterval(interval);
  }, [player, gameSettings]);

  if (!status || !status.isSafe) return null;

  if (minimized) {
    return (
      <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg ${
        status.inZone 
          ? 'bg-green-500/90 text-white'
          : 'bg-amber-500/90 text-white'
      }`}>
        {status.inZone ? (
          <Shield className="w-4 h-4" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {status.inZone ? 'Safe Zone' : timeRemaining}
        </span>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-24 left-4 right-4 z-50 p-4 rounded-xl shadow-xl border ${
      status.inZone 
        ? 'bg-green-500/95 border-green-400/50'
        : 'bg-amber-500/95 border-amber-400/50'
    }`}>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4 text-white" />
      </button>

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${
          status.inZone ? 'bg-green-400/30' : 'bg-amber-400/30'
        }`}>
          {status.inZone ? (
            <Shield className="w-8 h-8 text-white" />
          ) : (
            <Clock className="w-8 h-8 text-white" />
          )}
        </div>
        
        <div className="flex-1 text-white">
          <h3 className="font-bold text-lg mb-1">
            {status.inZone ? 'You\'re in a Safe Zone!' : 'No-Tag Time Active'}
          </h3>
          
          <p className="text-sm opacity-90 mb-2">
            {status.inZone 
              ? `You're protected in "${status.inZone.name}". Players cannot tag you here.`
              : `"${status.inSchedule.name}" is active. Tagging is paused during this schedule.`
            }
          </p>
          
          {status.inZone && (
            <div className="flex items-center gap-2 text-sm opacity-80">
              <MapPin className="w-4 h-4" />
              <span>{status.inZone.radius}m safe radius</span>
            </div>
          )}
          
          {status.inSchedule && (
            <div className="flex items-center gap-2 text-sm">
              <span className="opacity-80">Ends in</span>
              <span className="font-bold">{timeRemaining}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
