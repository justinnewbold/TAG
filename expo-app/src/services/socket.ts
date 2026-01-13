import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const SOCKET_URL = Constants.expoConfig?.extra?.socketUrl || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.log('Socket connection error:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  on(event: string, callback: Function) {
    if (!this.socket) return;

    // Prevent duplicate listeners
    const existingListeners = this.listeners.get(event) || [];
    if (existingListeners.includes(callback)) {
      return;
    }

    this.socket.on(event, callback as any);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback as any);
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Game-specific methods
  joinGameRoom(gameId: string) {
    this.emit('game:join', gameId);
  }

  leaveGameRoom(gameId: string) {
    this.emit('game:leave', gameId);
  }

  updateLocation(location: { lat: number; lng: number }) {
    this.emit('location:update', location);
  }

  attemptTag(targetId: string) {
    this.emit('tag:attempt', { targetId });
  }

  syncGame() {
    this.emit('game:sync');
  }

  async ping(): Promise<number> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(-1);
        return;
      }

      const start = Date.now();
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(-1);
        }
      }, 5000);

      this.socket.emit('ping');
      this.socket.once('pong', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve(Date.now() - start);
        }
      });
    });
  }

  // Game invite methods
  inviteToGame(friendId: string, gameCode: string) {
    this.emit('game:invite:send', { friendId, gameCode });
  }

  respondToInvite(inviteId: string, accept: boolean) {
    this.emit('game:invite:respond', { inviteId, accept });
  }
}

export const socketService = new SocketService();
