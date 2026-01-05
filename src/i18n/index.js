/**
 * Internationalization (i18n) Setup
 * Phase 9: Multi-language support with react-i18next
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// Supported languages
export const LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  zh: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  pt: { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
};

// RTL languages
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Translation context
const I18nContext = createContext(null);

// English translations (default)
const translations = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      close: 'Close',
      retry: 'Retry',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      refresh: 'Refresh',
      share: 'Share',
      copy: 'Copy',
      copied: 'Copied!',
      settings: 'Settings',
      profile: 'Profile',
      help: 'Help',
      logout: 'Logout',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      or: 'or',
      and: 'and',
      online: 'Online',
      offline: 'Offline',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      signUp: 'Sign Up',
      signIn: 'Sign In',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      noAccount: "Don't have an account?",
      continueAsGuest: 'Continue as Guest',
      username: 'Username',
      chooseAvatar: 'Choose Avatar',
    },
    game: {
      createGame: 'Create Game',
      joinGame: 'Join Game',
      startGame: 'Start Game',
      endGame: 'End Game',
      leaveGame: 'Leave Game',
      gameCode: 'Game Code',
      enterCode: 'Enter Code',
      players: 'Players',
      waiting: 'Waiting...',
      active: 'Active',
      ended: 'Ended',
      youAreIt: "You're IT!",
      tagPlayer: 'Tag Player',
      tagged: 'Tagged!',
      winner: 'Winner',
      gameOver: 'Game Over',
      playAgain: 'Play Again',
      rematch: 'Rematch',
      spectate: 'Spectate',
      host: 'Host',
      pause: 'Pause',
      resume: 'Resume',
      settings: 'Game Settings',
      tagRadius: 'Tag Radius',
      duration: 'Duration',
      maxPlayers: 'Max Players',
      gameName: 'Game Name',
      gameMode: 'Game Mode',
      noTagZones: 'Safe Zones',
      noTagTimes: 'Safe Times',
    },
    modes: {
      classic: 'Classic Tag',
      freezeTag: 'Freeze Tag',
      infection: 'Infection',
      teamTag: 'Team Tag',
      manhunt: 'Manhunt',
      hotPotato: 'Hot Potato',
      hideAndSeek: 'Hide & Seek',
      assassin: 'Assassin',
      battleRoyale: 'Battle Royale',
      kingOfTheHill: 'King of the Hill',
    },
    stats: {
      gamesPlayed: 'Games Played',
      gamesWon: 'Games Won',
      totalTags: 'Total Tags',
      timesTagged: 'Times Tagged',
      longestSurvival: 'Longest Survival',
      winStreak: 'Win Streak',
      fastestTag: 'Fastest Tag',
      playTime: 'Play Time',
      achievements: 'Achievements',
      leaderboard: 'Leaderboard',
      history: 'History',
    },
    friends: {
      friends: 'Friends',
      addFriend: 'Add Friend',
      removeFriend: 'Remove Friend',
      friendRequests: 'Friend Requests',
      pending: 'Pending',
      accept: 'Accept',
      decline: 'Decline',
      block: 'Block',
      unblock: 'Unblock',
      invite: 'Invite',
      noFriends: 'No friends yet',
      searchFriends: 'Search friends...',
    },
    notifications: {
      notifications: 'Notifications',
      markAsRead: 'Mark as Read',
      clearAll: 'Clear All',
      noNotifications: 'No notifications',
      friendRequest: 'Friend Request',
      gameInvite: 'Game Invite',
      achievement: 'Achievement',
    },
    settings: {
      settings: 'Settings',
      account: 'Account',
      privacy: 'Privacy',
      notifications: 'Notifications',
      sound: 'Sound',
      vibration: 'Vibration',
      language: 'Language',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      accessibility: 'Accessibility',
      about: 'About',
      version: 'Version',
      feedback: 'Feedback',
      rateApp: 'Rate App',
      shareApp: 'Share App',
      termsOfService: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      deleteAccount: 'Delete Account',
    },
    accessibility: {
      colorblindMode: 'Colorblind Mode',
      largeText: 'Large Text',
      reducedMotion: 'Reduced Motion',
      screenReader: 'Screen Reader',
      highContrast: 'High Contrast',
    },
    errors: {
      networkError: 'Network error. Please check your connection.',
      serverError: 'Server error. Please try again.',
      notFound: 'Not found',
      unauthorized: 'Please log in to continue',
      invalidCode: 'Invalid game code',
      gameFull: 'Game is full',
      gameStarted: 'Game has already started',
      permissionDenied: 'Permission denied',
      locationRequired: 'Location access required',
      genericError: 'Something went wrong',
    },
    time: {
      justNow: 'Just now',
      minutesAgo: '{{count}} min ago',
      hoursAgo: '{{count}} hours ago',
      daysAgo: '{{count}} days ago',
      seconds: 'seconds',
      minutes: 'minutes',
      hours: 'hours',
      days: 'days',
    },
    distance: {
      meters: 'm',
      kilometers: 'km',
      feet: 'ft',
      miles: 'mi',
      away: 'away',
    },
  },

  es: {
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      back: 'Atrás',
      next: 'Siguiente',
      done: 'Hecho',
      close: 'Cerrar',
      retry: 'Reintentar',
      search: 'Buscar',
      settings: 'Configuración',
      profile: 'Perfil',
      logout: 'Cerrar Sesión',
      yes: 'Sí',
      no: 'No',
      ok: 'OK',
      online: 'En línea',
      offline: 'Desconectado',
    },
    auth: {
      login: 'Iniciar Sesión',
      register: 'Registrarse',
      email: 'Correo electrónico',
      password: 'Contraseña',
      forgotPassword: '¿Olvidaste tu contraseña?',
      username: 'Nombre de usuario',
    },
    game: {
      createGame: 'Crear Juego',
      joinGame: 'Unirse al Juego',
      startGame: 'Iniciar Juego',
      endGame: 'Terminar Juego',
      gameCode: 'Código del Juego',
      players: 'Jugadores',
      youAreIt: '¡Eres IT!',
      winner: 'Ganador',
      gameOver: 'Fin del Juego',
      playAgain: 'Jugar de Nuevo',
    },
    modes: {
      classic: 'Etiqueta Clásica',
      freezeTag: 'Etiqueta Congelada',
      infection: 'Infección',
      teamTag: 'Etiqueta en Equipo',
    },
    stats: {
      gamesPlayed: 'Juegos Jugados',
      gamesWon: 'Juegos Ganados',
      totalTags: 'Etiquetas Totales',
      achievements: 'Logros',
    },
    friends: {
      friends: 'Amigos',
      addFriend: 'Añadir Amigo',
      noFriends: 'Sin amigos todavía',
    },
  },

  fr: {
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      save: 'Enregistrer',
      settings: 'Paramètres',
      profile: 'Profil',
      logout: 'Déconnexion',
      online: 'En ligne',
      offline: 'Hors ligne',
    },
    game: {
      createGame: 'Créer une Partie',
      joinGame: 'Rejoindre',
      startGame: 'Démarrer',
      youAreIt: "C'est toi!",
      winner: 'Gagnant',
      gameOver: 'Fin de Partie',
    },
  },

  de: {
    common: {
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      settings: 'Einstellungen',
      logout: 'Abmelden',
    },
    game: {
      createGame: 'Spiel erstellen',
      joinGame: 'Beitreten',
      startGame: 'Starten',
      youAreIt: 'Du bist dran!',
      winner: 'Gewinner',
    },
  },

  ja: {
    common: {
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
      cancel: 'キャンセル',
      confirm: '確認',
      settings: '設定',
    },
    game: {
      createGame: 'ゲームを作成',
      joinGame: '参加',
      startGame: '開始',
      youAreIt: '鬼だ！',
      winner: '勝者',
    },
  },

  zh: {
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认',
      settings: '设置',
    },
    game: {
      createGame: '创建游戏',
      joinGame: '加入',
      startGame: '开始',
      youAreIt: '你是鬼！',
      winner: '赢家',
    },
  },
};

/**
 * Get nested translation value
 */
function getNestedTranslation(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Interpolate variables in translation string
 */
function interpolate(text, variables = {}) {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

/**
 * I18n Provider Component
 */
export function I18nProvider({ children, defaultLanguage = 'en' }) {
  const [language, setLanguage] = useState(() => {
    // Check stored preference
    const stored = localStorage.getItem('language');
    if (stored && LANGUAGES[stored]) return stored;

    // Check browser language
    const browserLang = navigator.language?.split('-')[0];
    if (LANGUAGES[browserLang]) return browserLang;

    return defaultLanguage;
  });

  const isRTL = RTL_LANGUAGES.includes(language);

  // Update document direction
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  // Save language preference
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  // Translation function
  const t = useCallback((key, variables = {}) => {
    // Try current language
    let text = getNestedTranslation(translations[language], key);

    // Fallback to English
    if (text === undefined && language !== 'en') {
      text = getNestedTranslation(translations.en, key);
    }

    // Return key if not found
    if (text === undefined) {
      console.warn(`Missing translation: ${key}`);
      return key;
    }

    return interpolate(text, variables);
  }, [language]);

  // Change language
  const changeLanguage = useCallback((lang) => {
    if (LANGUAGES[lang]) {
      setLanguage(lang);
    }
  }, []);

  const value = {
    language,
    languageInfo: LANGUAGES[language],
    isRTL,
    t,
    changeLanguage,
    availableLanguages: Object.values(LANGUAGES),
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to use translations
 */
export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}

/**
 * Hook for just the t function
 */
export function useT() {
  const { t } = useTranslation();
  return t;
}

export default { I18nProvider, useTranslation, useT, LANGUAGES, RTL_LANGUAGES };
