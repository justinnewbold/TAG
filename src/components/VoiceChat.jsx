import { useState, useEffect, useCallback } from 'react';
import { voiceChatService } from '../services/VoiceChatService';

/**
 * Voice Chat Control Panel Component
 * Provides UI for voice chat controls in-game
 */
export default function VoiceChat({ 
  socket, 
  gameId, 
  players = [],
  myPosition,
  enabled = true 
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [mode, setMode] = useState('proximity');
  const [proximityRange, setProximityRange] = useState(50);
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingPeers, setSpeakingPeers] = useState({});

  // Initialize voice chat
  const initializeVoiceChat = useCallback(async () => {
    const success = await voiceChatService.initialize();
    if (success) {
      setIsInitialized(true);
      
      // Set up socket listeners for signaling
      if (socket) {
        socket.on('voice:offer', ({ userId, offer }) => {
          voiceChatService.handleOffer(userId, offer);
        });
        
        socket.on('voice:answer', ({ userId, answer }) => {
          voiceChatService.handleAnswer(userId, answer);
        });
        
        socket.on('voice:iceCandidate', ({ userId, candidate }) => {
          voiceChatService.handleIceCandidate(userId, candidate);
        });
        
        socket.on('voice:peerJoined', ({ userId }) => {
          voiceChatService.createPeerConnection(userId, true);
        });
        
        socket.on('voice:peerLeft', ({ userId }) => {
          voiceChatService.disconnectPeer(userId);
        });
        
        // Notify server we're ready for voice
        socket.emit('voice:ready', { gameId });
      }
    }
  }, [socket, gameId]);

  // Voice chat event listener
  useEffect(() => {
    const unsubscribe = voiceChatService.on((event) => {
      switch (event.type) {
        case 'offer':
          socket?.emit('voice:offer', { gameId, ...event });
          break;
        case 'answer':
          socket?.emit('voice:answer', { gameId, ...event });
          break;
        case 'iceCandidate':
          socket?.emit('voice:iceCandidate', { gameId, ...event });
          break;
        case 'muteChanged':
          setIsMuted(event.isMuted);
          break;
        case 'peerConnected':
        case 'peerDisconnected':
          setConnectedPeers(Object.keys(voiceChatService.peerConnections).length);
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [socket, gameId]);

  // Update proximity volumes when positions change
  useEffect(() => {
    if (mode === 'proximity' && myPosition && players.length > 0) {
      const playerPositions = {};
      players.forEach(player => {
        if (player.position && player.id) {
          playerPositions[player.id] = player.position;
        }
      });
      voiceChatService.updateAllProximities(myPosition, playerPositions);
    }
  }, [myPosition, players, mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceChatService.disconnect();
    };
  }, []);

  // Handle mute toggle
  const handleToggleMute = () => {
    voiceChatService.toggleMute();
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    voiceChatService.setVolume(newVolume);
  };

  // Handle mode change
  const handleModeChange = (newMode) => {
    setMode(newMode);
    voiceChatService.setMode(newMode);
  };

  // Handle proximity range change
  const handleProximityRangeChange = (e) => {
    const range = parseInt(e.target.value);
    setProximityRange(range);
    voiceChatService.setProximityRange(range);
  };

  if (!enabled) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50">
      {/* Main Voice Control Button */}
      <div className="flex items-center gap-2">
        {!isInitialized ? (
          <button
            onClick={initializeVoiceChat}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all"
          >
            <MicrophoneIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Enable Voice</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* Mute/Unmute Button */}
            <button
              onClick={handleToggleMute}
              className={`p-3 rounded-full shadow-lg transition-all ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : isSpeaking 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isMuted ? (
                <MicrophoneOffIcon className="w-6 h-6 text-white" />
              ) : (
                <MicrophoneIcon className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 bg-gray-700 rounded-full shadow-lg hover:bg-gray-600 transition-all"
            >
              <SettingsIcon className="w-6 h-6 text-white" />
            </button>

            {/* Connected Peers Indicator */}
            <div className="flex items-center gap-1 px-3 py-1 bg-gray-800 rounded-full">
              <div className={`w-2 h-2 rounded-full ${connectedPeers > 0 ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-300">{connectedPeers}</span>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && isInitialized && (
        <div className="absolute bottom-16 left-0 w-72 bg-white rounded-xl shadow-2xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Voice Chat Settings</h3>
          
          {/* Volume Slider */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Volume</label>
            <div className="flex items-center gap-3">
              <VolumeIcon className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-gray-600 w-8">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-2 block">Chat Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {['proximity', 'team', 'all'].map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    mode === m
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Proximity Range (only show in proximity mode) */}
          {mode === 'proximity' && (
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">
                Proximity Range: {proximityRange}m
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={proximityRange}
                onChange={handleProximityRangeChange}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10m</span>
                <span>200m</span>
              </div>
            </div>
          )}

          {/* Connected Peers List */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">
              Connected ({connectedPeers})
            </label>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {players.filter(p => voiceChatService.peerConnections[p.id]).map(player => (
                <div 
                  key={player.id}
                  className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    speakingPeers[player.id] ? 'bg-green-400 animate-pulse' : 'bg-gray-300'
                  }`} />
                  <span className="text-xs text-gray-700">{player.name}</span>
                </div>
              ))}
              {connectedPeers === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  No one connected yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Components
function MicrophoneIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function MicrophoneOffIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function VolumeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}
