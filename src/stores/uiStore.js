import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      // Settings
      settings: {
        notifications: true,
        sound: true,
        vibration: true,
        highAccuracyGPS: true,
        darkMode: true,
        showDistance: true,
      },

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),

      // Toast notifications
      toast: null,
      showToast: (toast) => set({ toast: typeof toast === 'string' ? { type: 'error', message: toast } : toast }),
      showError: (message, title) => set({ toast: { type: 'error', message, title } }),
      showSuccess: (message, title) => set({ toast: { type: 'success', message, title } }),
      showWarning: (message, title) => set({ toast: { type: 'warning', message, title } }),
      showInfo: (message, title) => set({ toast: { type: 'info', message, title } }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'tag-ui-storage',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);

// Sound effects hook
export const useSounds = () => {
  const { settings } = useUIStore();

  const playSound = (soundName) => {
    if (!settings.sound) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      switch (soundName) {
        case 'tag':
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.3;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'tagged':
          oscillator.frequency.value = 300;
          gainNode.gain.value = 0.3;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'gameStart':
          oscillator.frequency.value = 440;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'achievement':
          oscillator.type = 'triangle';
          oscillator.frequency.value = 523;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        case 'error':
          oscillator.frequency.value = 200;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        default:
          oscillator.frequency.value = 440;
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      // Audio context not available
    }
  };

  const vibrate = (pattern = [100]) => {
    if (settings.vibration && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return { playSound, vibrate };
};
