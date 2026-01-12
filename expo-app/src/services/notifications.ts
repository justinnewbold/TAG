import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notification types
export type NotificationType =
  | 'game_invite'
  | 'game_starting'
  | 'you_are_it'
  | 'player_tagged'
  | 'it_nearby'
  | 'game_ended'
  | 'friend_request'
  | 'achievement_unlocked'
  | 'power_up_available';

export interface NotificationData {
  type: NotificationType;
  gameCode?: string;
  action?: string;
  [key: string]: any;
}

export interface NotificationPreferences {
  game_invites: boolean;
  game_events: boolean;
  proximity_alerts: boolean;
  friend_activity: boolean;
  achievements: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;

  // Initialize the notification service
  async initialize(): Promise<string | null> {
    // Register for push notifications
    const token = await this.registerForPushNotifications();

    if (token) {
      this.expoPushToken = token;

      // Register token with server
      await this.registerTokenWithServer(token);
    }

    // Set up notification listeners
    this.setupNotificationListeners();

    return token;
  }

  // Register for push notifications and get the Expo push token
  async registerForPushNotifications(): Promise<string | null> {
    // Check if we're on a physical device
    if (!Device.isDevice) {
      console.log('Push notifications are not available on simulators');
      return null;
    }

    // Check and request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    try {
      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;
      console.log('Expo push token:', token);

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Set up Android notification channels
  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00f5ff',
    });

    await Notifications.setNotificationChannelAsync('game_events', {
      name: 'Game Events',
      description: 'Notifications about game events like tags and game end',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00f5ff',
    });

    await Notifications.setNotificationChannelAsync('game_invites', {
      name: 'Game Invites',
      description: 'Notifications when friends invite you to play',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('proximity', {
      name: 'Proximity Alerts',
      description: 'Alerts when IT is nearby',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 100, 50, 100],
      lightColor: '#ff0000',
    });
  }

  // Register the push token with the server
  async registerTokenWithServer(token: string): Promise<boolean> {
    try {
      const platform = Platform.OS as 'ios' | 'android';
      const deviceId = Constants.deviceId || undefined;

      await api.post('/notifications/register', {
        token,
        platform,
        deviceId,
      });

      console.log('Push token registered with server');
      return true;
    } catch (error) {
      console.error('Failed to register push token with server:', error);
      return false;
    }
  }

  // Unregister the push token from the server
  async unregisterToken(): Promise<boolean> {
    if (!this.expoPushToken) {
      return true;
    }

    try {
      await api.post('/notifications/unregister', {
        token: this.expoPushToken,
        platform: Platform.OS,
      });

      this.expoPushToken = null;
      console.log('Push token unregistered');
      return true;
    } catch (error) {
      console.error('Failed to unregister push token:', error);
      return false;
    }
  }

  // Set up notification listeners
  private setupNotificationListeners(): void {
    // Handle notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Handle notification interactions (taps)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  // Handle notification received in foreground
  private handleNotificationReceived(notification: Notifications.Notification): void {
    const data = notification.request.content.data as NotificationData;

    // You can emit events or update state here
    // For example, update a notification badge or show an in-app alert
    console.log('Notification data:', data);
  }

  // Handle notification tap/response
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data as NotificationData;

    // Navigate based on notification type
    switch (data.type) {
      case 'game_invite':
        if (data.gameCode) {
          // Navigate to game or join game
          router.push('/');
        }
        break;

      case 'game_starting':
      case 'you_are_it':
      case 'player_tagged':
      case 'it_nearby':
        // Navigate to active game
        router.push('/');
        break;

      case 'game_ended':
        // Navigate to game history or results
        router.push('/history');
        break;

      case 'friend_request':
        // Navigate to friends screen
        router.push('/friends');
        break;

      case 'achievement_unlocked':
        // Navigate to stats/achievements
        router.push('/stats');
        break;

      default:
        // Default action
        router.push('/');
    }
  }

  // Get notification preferences from server
  async getPreferences(): Promise<NotificationPreferences | null> {
    try {
      const response = await api.get<{ preferences: NotificationPreferences }>(
        '/notifications/preferences'
      );
      return response.preferences;
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return null;
    }
  }

  // Update notification preferences on server
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      await api.put('/notifications/preferences', preferences);
      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  }

  // Send a local notification (for testing or local events)
  async sendLocalNotification(
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Send immediately
    });

    return id;
  }

  // Get current notification permissions status
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  // Clean up listeners
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // Get the current push token
  getToken(): string | null {
    return this.expoPushToken;
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
