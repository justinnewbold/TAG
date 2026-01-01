import { useState, useEffect, useRef } from 'react';
import { Shield, AlertTriangle, Ban, CheckCircle } from 'lucide-react';
import { aiService } from '../services/ai';

export default function AntiCheatMonitor({ locationHistory, onViolation }) {
  const [status, setStatus] = useState('clean'); // 'clean', 'warning', 'violation'
  const [warnings, setWarnings] = useState([]);
  const [lastCheck, setLastCheck] = useState(null);
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    // Check every 10 seconds
    checkIntervalRef.current = setInterval(() => {
      if (locationHistory && locationHistory.length >= 2) {
        performCheck();
      }
    }, 10000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [locationHistory]);

  // Also check on new locations
  useEffect(() => {
    if (locationHistory && locationHistory.length >= 2) {
      // Quick check on last two locations
      const recent = locationHistory.slice(-2);
      const timeDiff = recent[1].timestamp - recent[0].timestamp;
      
      const quickResult = aiService.quickMovementCheck(
        recent[1], recent[0], timeDiff
      );

      if (!quickResult.valid) {
        handleWarning({
          type: quickResult.reason,
          severity: 'high',
          message: quickResult.reason === 'teleport' 
            ? `Teleport detected: ${Math.round(quickResult.distance)}m` 
            : `Impossible speed: ${Math.round(quickResult.speed)} km/h`,
          timestamp: Date.now(),
        });
      }
    }
  }, [locationHistory?.length]);

  const performCheck = async () => {
    try {
      const analysis = await aiService.analyzeMovement(locationHistory);
      setLastCheck(analysis);

      if (!analysis.valid) {
        setStatus('violation');
        if (onViolation) {
          onViolation(analysis);
        }
      } else if (analysis.warnings?.length > 0) {
        setStatus('warning');
        setWarnings(analysis.warnings);
      } else {
        setStatus('clean');
        setWarnings([]);
      }
    } catch (error) {
      console.error('Anti-cheat check failed:', error);
    }
  };

  const handleWarning = (warning) => {
    setWarnings(prev => [...prev.slice(-4), warning]);
    setStatus(warning.severity === 'high' ? 'violation' : 'warning');

    if (warning.severity === 'high' && onViolation) {
      onViolation({ warnings: [warning], valid: false });
    }
  };

  // Don't render if clean (invisible monitoring)
  if (status === 'clean') return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-xs">
      <div className={`
        p-3 rounded-xl backdrop-blur-xl border shadow-lg
        ${status === 'violation' 
          ? 'bg-red-500/20 border-red-500/50' 
          : 'bg-amber-500/20 border-amber-500/50'
        }
      `}>
        <div className="flex items-center gap-2 mb-2">
          {status === 'violation' ? (
            <Ban className="w-5 h-5 text-red-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <span className={`font-bold text-sm ${
            status === 'violation' ? 'text-red-400' : 'text-amber-400'
          }`}>
            {status === 'violation' ? 'Movement Violation' : 'Movement Warning'}
          </span>
        </div>

        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.slice(-2).map((w, i) => (
              <p key={i} className="text-xs text-white/70">
                {w.message}
              </p>
            ))}
          </div>
        )}

        <p className="text-xs text-white/50 mt-2">
          {status === 'violation' 
            ? 'Your movement is being reviewed'
            : 'Unusual movement detected'
          }
        </p>
      </div>
    </div>
  );
}
