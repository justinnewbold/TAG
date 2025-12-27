/**
 * Voice Chat Service using WebRTC
 * Supports proximity-based voice chat and team voice channels
 */

class VoiceChatService {
  constructor() {
    this.localStream = null;
    this.peerConnections = {};
    this.audioElements = {};
    this.isEnabled = false;
    this.isMuted = false;
    this.volume = 1.0;
    this.proximityRange = 50; // meters
    this.mode = 'proximity'; // 'proximity' | 'team' | 'all'
    this.listeners = new Set();
    
    // WebRTC configuration
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
  }

  /**
   * Initialize voice chat and request microphone permissions
   */
  async initialize() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      this.isEnabled = true;
      this.emit('initialized');
      console.log('[VoiceChat] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[VoiceChat] Failed to initialize:', error);
      this.emit('error', { message: 'Microphone access denied' });
      return false;
    }
  }

  /**
   * Create peer connection for a specific user
   */
  async createPeerConnection(userId, isInitiator = false) {
    if (this.peerConnections[userId]) {
      return this.peerConnections[userId];
    }

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections[userId] = pc;

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle incoming audio stream
    pc.ontrack = (event) => {
      console.log('[VoiceChat] Received remote track from:', userId);
      this.handleRemoteStream(userId, event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('iceCandidate', { userId, candidate: event.candidate });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[VoiceChat] Connection state with', userId, ':', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.disconnectPeer(userId);
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.emit('offer', { userId, offer });
    }

    return pc;
  }

  /**
   * Handle incoming offer from peer
   */
  async handleOffer(userId, offer) {
    const pc = await this.createPeerConnection(userId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.emit('answer', { userId, answer });
  }

  /**
   * Handle incoming answer from peer
   */
  async handleAnswer(userId, answer) {
    const pc = this.peerConnections[userId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(userId, candidate) {
    const pc = this.peerConnections[userId];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  /**
   * Handle remote audio stream
   */
  handleRemoteStream(userId, stream) {
    // Remove existing audio element if any
    if (this.audioElements[userId]) {
      this.audioElements[userId].remove();
    }

    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.volume = this.volume;
    
    // Store reference
    this.audioElements[userId] = audio;
    
    this.emit('peerConnected', { userId });
  }

  /**
   * Update volume based on proximity
   */
  updateProximityVolume(userId, distance) {
    if (this.mode !== 'proximity' || !this.audioElements[userId]) {
      return;
    }

    // Calculate volume based on distance (linear falloff)
    let volume = 1 - (distance / this.proximityRange);
    volume = Math.max(0, Math.min(1, volume)) * this.volume;
    
    this.audioElements[userId].volume = volume;
    
    // Mute if out of range
    if (distance > this.proximityRange) {
      this.audioElements[userId].muted = true;
    } else {
      this.audioElements[userId].muted = this.isMuted;
    }
  }

  /**
   * Update proximity for all peers
   */
  updateAllProximities(myPosition, playerPositions) {
    Object.keys(this.audioElements).forEach(userId => {
      const playerPos = playerPositions[userId];
      if (playerPos && myPosition) {
        const distance = this.calculateDistance(myPosition, playerPos);
        this.updateProximityVolume(userId, distance);
      }
    });
  }

  /**
   * Calculate distance between two positions (in meters)
   */
  calculateDistance(pos1, pos2) {
    const R = 6371e3; // Earth's radius in meters
    const lat1 = pos1.lat * Math.PI / 180;
    const lat2 = pos2.lat * Math.PI / 180;
    const deltaLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const deltaLng = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    
    this.emit('muteChanged', { isMuted: this.isMuted });
    return this.isMuted;
  }

  /**
   * Set volume level (0-1)
   */
  setVolume(level) {
    this.volume = Math.max(0, Math.min(1, level));
    
    Object.values(this.audioElements).forEach(audio => {
      audio.volume = this.volume;
    });
    
    this.emit('volumeChanged', { volume: this.volume });
  }

  /**
   * Set voice chat mode
   */
  setMode(mode) {
    this.mode = mode;
    this.emit('modeChanged', { mode });
    
    // Update all audio elements based on new mode
    if (mode === 'all') {
      Object.values(this.audioElements).forEach(audio => {
        audio.volume = this.volume;
        audio.muted = this.isMuted;
      });
    }
  }

  /**
   * Set proximity range in meters
   */
  setProximityRange(range) {
    this.proximityRange = range;
    this.emit('proximityRangeChanged', { range });
  }

  /**
   * Disconnect from a specific peer
   */
  disconnectPeer(userId) {
    if (this.peerConnections[userId]) {
      this.peerConnections[userId].close();
      delete this.peerConnections[userId];
    }
    
    if (this.audioElements[userId]) {
      this.audioElements[userId].remove();
      delete this.audioElements[userId];
    }
    
    this.emit('peerDisconnected', { userId });
  }

  /**
   * Disconnect from all peers and cleanup
   */
  disconnect() {
    Object.keys(this.peerConnections).forEach(userId => {
      this.disconnectPeer(userId);
    });
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.isEnabled = false;
    this.emit('disconnected');
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      isMuted: this.isMuted,
      volume: this.volume,
      mode: this.mode,
      proximityRange: this.proximityRange,
      connectedPeers: Object.keys(this.peerConnections).length
    };
  }

  /**
   * Event listener management
   */
  on(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event, data = {}) {
    this.listeners.forEach(callback => callback({ type: event, ...data }));
  }
}

// Singleton instance
export const voiceChatService = new VoiceChatService();
export default voiceChatService;
