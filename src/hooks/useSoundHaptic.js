// Sound and Haptic Feedback Hook
// Provides easy integration with React components

import { useCallback, useEffect } from 'react';
import { soundService } from '../services/soundHaptic';
import { useStore } from '../store';

export function useSoundHaptic() {
  const settings = useStore((state) => state.settings);

  // Sync settings with sound service
  useEffect(() => {
    soundService.setSound(settings?.sound !== false);
    soundService.setHaptic(settings?.vibration !== false);
  }, [settings?.sound, settings?.vibration]);

  // Initialize audio context on first user interaction
  const initAudio = useCallback(async () => {
    await soundService.init();
    await soundService.resume();
  }, []);

  // Game events
  const playTagSuccess = useCallback(() => {
    initAudio().then(() => soundService.playTagSuccess());
  }, [initAudio]);

  const playTaggedByOther = useCallback(() => {
    initAudio().then(() => soundService.playTaggedByOther());
  }, [initAudio]);

  const playGameStart = useCallback(() => {
    initAudio().then(() => soundService.playGameStart());
  }, [initAudio]);

  const playCountdownTick = useCallback(() => {
    initAudio().then(() => soundService.playCountdownTick());
  }, [initAudio]);

  const playFinalCountdownTick = useCallback(() => {
    initAudio().then(() => soundService.playFinalCountdownTick());
  }, [initAudio]);

  const playGameEnd = useCallback(() => {
    initAudio().then(() => soundService.playGameEnd());
  }, [initAudio]);

  const playVictory = useCallback(() => {
    initAudio().then(() => soundService.playVictory());
  }, [initAudio]);

  const playDefeat = useCallback(() => {
    initAudio().then(() => soundService.playDefeat());
  }, [initAudio]);

  // Powerup events
  const playPowerupCollected = useCallback(() => {
    initAudio().then(() => soundService.playPowerupCollected());
  }, [initAudio]);

  const playPowerupActivated = useCallback(() => {
    initAudio().then(() => soundService.playPowerupActivated());
  }, [initAudio]);

  const playSpeedBoost = useCallback(() => {
    initAudio().then(() => soundService.playSpeedBoost());
  }, [initAudio]);

  const playInvisibility = useCallback(() => {
    initAudio().then(() => soundService.playInvisibility());
  }, [initAudio]);

  const playShield = useCallback(() => {
    initAudio().then(() => soundService.playShield());
  }, [initAudio]);

  // Alert events
  const playProximityWarning = useCallback(() => {
    initAudio().then(() => soundService.playProximityWarning());
  }, [initAudio]);

  const playTaggerNearby = useCallback(() => {
    initAudio().then(() => soundService.playTaggerNearby());
  }, [initAudio]);

  const playEnterSafeZone = useCallback(() => {
    initAudio().then(() => soundService.playEnterSafeZone());
  }, [initAudio]);

  const playLeaveSafeZone = useCallback(() => {
    initAudio().then(() => soundService.playLeaveSafeZone());
  }, [initAudio]);

  const playBoundaryWarning = useCallback(() => {
    initAudio().then(() => soundService.playBoundaryWarning());
  }, [initAudio]);

  // Social events
  const playAchievement = useCallback(() => {
    initAudio().then(() => soundService.playAchievement());
  }, [initAudio]);

  const playLevelUp = useCallback(() => {
    initAudio().then(() => soundService.playLevelUp());
  }, [initAudio]);

  const playFriendRequest = useCallback(() => {
    initAudio().then(() => soundService.playFriendRequest());
  }, [initAudio]);

  const playChatMessage = useCallback(() => {
    initAudio().then(() => soundService.playChatMessage());
  }, [initAudio]);

  const playPlayerJoined = useCallback(() => {
    initAudio().then(() => soundService.playPlayerJoined());
  }, [initAudio]);

  const playPlayerLeft = useCallback(() => {
    initAudio().then(() => soundService.playPlayerLeft());
  }, [initAudio]);

  // UI events
  const playButtonTap = useCallback(() => {
    initAudio().then(() => soundService.playButtonTap());
  }, [initAudio]);

  const playToggle = useCallback(() => {
    initAudio().then(() => soundService.playToggle());
  }, [initAudio]);

  const playError = useCallback(() => {
    initAudio().then(() => soundService.playError());
  }, [initAudio]);

  const playSuccess = useCallback(() => {
    initAudio().then(() => soundService.playSuccess());
  }, [initAudio]);

  const playNotification = useCallback(() => {
    initAudio().then(() => soundService.playNotification());
  }, [initAudio]);

  return {
    initAudio,
    // Game events
    playTagSuccess,
    playTaggedByOther,
    playGameStart,
    playCountdownTick,
    playFinalCountdownTick,
    playGameEnd,
    playVictory,
    playDefeat,
    // Powerup events
    playPowerupCollected,
    playPowerupActivated,
    playSpeedBoost,
    playInvisibility,
    playShield,
    // Alert events
    playProximityWarning,
    playTaggerNearby,
    playEnterSafeZone,
    playLeaveSafeZone,
    playBoundaryWarning,
    // Social events
    playAchievement,
    playLevelUp,
    playFriendRequest,
    playChatMessage,
    playPlayerJoined,
    playPlayerLeft,
    // UI events
    playButtonTap,
    playToggle,
    playError,
    playSuccess,
    playNotification,
  };
}

export default useSoundHaptic;
