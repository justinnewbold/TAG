import { useState, useEffect, useCallback } from 'react';
import { voiceChatService } from '../services/VoiceChatService';

/**
 * Custom hook for voice chat functionality
 * Provides easy integration with game components
 */
export function useVoiceChat(socket, gameId) {
  const [status, setStatus] = useState({
    isEnabled: false,
    isMuted: false,
    volume: 1.0,
    mode: 'proximity',
    proximityRange: 50,
    connectedPeers: 0
  });
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to voice chat events
  useEffect(() => {
    const unsubscribe = voiceChatService.on((event) => {
      switch (event.type) {
        case 'initialized':
          setStatus(prev => ({ ...prev, isEnabled: true }));
          setIsInitializing(false);
          break;
        case 'error':
          setError(event.message);
          setIsInitializing(false);
          break;
        case 'muteChanged':
          setStatus(prev => ({ ...prev, isMuted: event.isMuted }));
          break;
        case 'volumeChanged':
          setStatus(prev => ({ ...prev, volume: event.volume }));
          break;
        case 'modeChanged':
          setStatus(prev => ({ ...prev, mode: event.mode }));
          break;
        case 'proximityRangeChanged':
          setStatus(prev => ({ ...prev, proximityRange: event.range }));
          break;
        case 'peerConnected':
        case 'peerDisconnected':
          setStatus(prev => ({
            ...prev,
            connectedPeers: Object.keys(voiceChatService.peerConnections).length
          }));
          break;
        case 'disconnected':
          setStatus({
            isEnabled: false,
            isMuted: false,
            volume: 1.0,
            mode: 'proximity',
            proximityRange: 50,
            connectedPeers: 0
          });
          break;
        case 'offer':
          socket?.emit('voice:offer', { gameId, ...event });
          break;
        case 'answer':
          socket?.emit('voice:answer', { gameId, ...event });
          break;
        case 'iceCandidate':
          socket?.emit('voice:iceCandidate', { gameId, ...event });
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [socket, gameId]);

  // Set up socket listeners for signaling
  useEffect(() => {
    if (!socket) return;

    const handleOffer = ({ userId, offer }) => {
      voiceChatService.handleOffer(userId, offer);
    };

    const handleAnswer = ({ userId, answer }) => {
      voiceChatService.handleAnswer(userId, answer);
    };

    const handleIceCandidate = ({ userId, candidate }) => {
      voiceChatService.handleIceCandidate(userId, candidate);
    };

    const handlePeerJoined = ({ userId }) => {
      voiceChatService.createPeerConnection(userId, true);
    };

    const handlePeerLeft = ({ userId }) => {
      voiceChatService.disconnectPeer(userId);
    };

    socket.on('voice:offer', handleOffer);
    socket.on('voice:answer', handleAnswer);
    socket.on('voice:iceCandidate', handleIceCandidate);
    socket.on('voice:peerJoined', handlePeerJoined);
    socket.on('voice:peerLeft', handlePeerLeft);

    return () => {
      socket.off('voice:offer', handleOffer);
      socket.off('voice:answer', handleAnswer);
      socket.off('voice:iceCandidate', handleIceCandidate);
      socket.off('voice:peerJoined', handlePeerJoined);
      socket.off('voice:peerLeft', handlePeerLeft);
    };
  }, [socket]);

  // Initialize voice chat
  const initialize = useCallback(async () => {
    if (status.isEnabled || isInitializing) return;
    
    setIsInitializing(true);
    setError(null);
    
    const success = await voiceChatService.initialize();
    
    if (success && socket && gameId) {
      socket.emit('voice:ready', { gameId });
    }
  }, [status.isEnabled, isInitializing, socket, gameId]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    return voiceChatService.toggleMute();
  }, []);

  // Set volume
  const setVolume = useCallback((level) => {
    voiceChatService.setVolume(level);
  }, []);

  // Set mode
  const setMode = useCallback((mode) => {
    voiceChatService.setMode(mode);
  }, []);

  // Set proximity range
  const setProximityRange = useCallback((range) => {
    voiceChatService.setProximityRange(range);
  }, []);

  // Update proximity for all peers
  const updateProximities = useCallback((myPosition, playerPositions) => {
    voiceChatService.updateAllProximities(myPosition, playerPositions);
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    voiceChatService.disconnect();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceChatService.disconnect();
    };
  }, []);

  return {
    status,
    isInitializing,
    error,
    initialize,
    toggleMute,
    setVolume,
    setMode,
    setProximityRange,
    updateProximities,
    disconnect
  };
}

export default useVoiceChat;
