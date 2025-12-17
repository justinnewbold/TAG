import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socket';
import { useStore } from '../store';

export function useSocket() {
  const {
    currentGame,
    user,
    syncGameState,
    handlePlayerJoined,
    handlePlayerLeft,
    handlePlayerLocation,
    handlePlayerTagged,
    handleGameStarted,
    handleGameEnded,
    handlePlayerOffline,
    handlePlayerOnline,
  } = useStore();

  const connectedRef = useRef(false);

  // Connect socket when user is authenticated
  useEffect(() => {
    if (user && !connectedRef.current) {
      socketService.connect();
      connectedRef.current = true;
    }

    return () => {
      // Don't disconnect on unmount - keep socket alive
    };
  }, [user]);

  // Join game room when in a game
  useEffect(() => {
    if (currentGame && connectedRef.current) {
      socketService.joinGameRoom(currentGame.id);

      return () => {
        socketService.leaveGameRoom(currentGame.id);
      };
    }
  }, [currentGame?.id]);

  // Set up event listeners
  useEffect(() => {
    if (!user) return;

    const handleGameState = ({ game }) => {
      if (game) {
        syncGameState(game);
      }
    };

    const handleJoined = (data) => {
      handlePlayerJoined(data);
    };

    const handleLeft = (data) => {
      handlePlayerLeft(data);
    };

    const handleLocation = (data) => {
      handlePlayerLocation(data);
    };

    const handleTagged = (data) => {
      handlePlayerTagged(data);
    };

    const handleStarted = (data) => {
      handleGameStarted(data);
    };

    const handleEnded = (data) => {
      handleGameEnded(data);
    };

    const handleOffline = (data) => {
      handlePlayerOffline(data);
    };

    const handleOnline = (data) => {
      handlePlayerOnline(data);
    };

    // Register listeners
    socketService.on('game:state', handleGameState);
    socketService.on('player:joined', handleJoined);
    socketService.on('player:left', handleLeft);
    socketService.on('player:location', handleLocation);
    socketService.on('player:tagged', handleTagged);
    socketService.on('game:started', handleStarted);
    socketService.on('game:ended', handleEnded);
    socketService.on('player:offline', handleOffline);
    socketService.on('player:online', handleOnline);

    return () => {
      socketService.off('game:state', handleGameState);
      socketService.off('player:joined', handleJoined);
      socketService.off('player:left', handleLeft);
      socketService.off('player:location', handleLocation);
      socketService.off('player:tagged', handleTagged);
      socketService.off('game:started', handleStarted);
      socketService.off('game:ended', handleEnded);
      socketService.off('player:offline', handleOffline);
      socketService.off('player:online', handleOnline);
    };
  }, [user]);

  // Update location through socket
  const updateLocation = useCallback((location) => {
    socketService.updateLocation(location);
  }, []);

  // Attempt tag through socket
  const attemptTag = useCallback((targetId) => {
    return new Promise((resolve) => {
      let resolved = false;

      const handleResult = (result) => {
        if (resolved) return;
        resolved = true;
        socketService.off('tag:result', handleResult);
        resolve(result);
      };

      socketService.on('tag:result', handleResult);
      socketService.attemptTag(targetId);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (resolved) return;
        resolved = true;
        socketService.off('tag:result', handleResult);
        resolve({ success: false, error: 'Request timed out' });
      }, 5000);
    });
  }, []);

  // Request game sync
  const syncGame = useCallback(() => {
    socketService.syncGame();
  }, []);

  return {
    updateLocation,
    attemptTag,
    syncGame,
    isConnected: socketService.isConnected(),
  };
}
