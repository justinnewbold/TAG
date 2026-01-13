/**
 * AR (Augmented Reality) Service
 * Camera overlays, directional arrows, radar pulse, and AR visualization
 */

// AR Mode Types
export const AR_MODES = {
  DISABLED: 'disabled',
  COMPASS: 'compass',      // Simple direction arrows
  RADAR: 'radar',          // Radar pulse visualization
  CAMERA: 'camera',        // Full camera AR overlay
  MINI_MAP: 'mini_map',    // AR mini-map overlay
};

// AR Element Types
export const AR_ELEMENTS = {
  PLAYER_MARKER: 'player_marker',
  DIRECTION_ARROW: 'direction_arrow',
  DISTANCE_INDICATOR: 'distance_indicator',
  DANGER_ZONE: 'danger_zone',
  SAFE_ZONE: 'safe_zone',
  POI_MARKER: 'poi_marker',
  POWERUP_MARKER: 'powerup_marker',
  BOUNDARY_LINE: 'boundary_line',
  RADAR_PULSE: 'radar_pulse',
};

class ARService {
  constructor() {
    this.isSupported = false;
    this.isActive = false;
    this.currentMode = AR_MODES.DISABLED;
    this.cameraStream = null;
    this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    this.playerPosition = null;
    this.targetPlayers = [];
    this.pois = [];
    this.boundaries = null;
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
    this.listeners = new Map();

    // Settings
    this.settings = {
      showDistances: true,
      showDirections: true,
      showDangerIndicators: true,
      radarRange: 200, // meters
      pulseInterval: 3000, // ms
      fadeDistance: 500, // meters - elements fade beyond this
      colorScheme: 'default',
    };

    // Cached calculations
    this.lastUpdate = 0;
    this.updateInterval = 100; // ms

    this.checkSupport();
  }

  /**
   * Check device AR support
   */
  async checkSupport() {
    // Check for required APIs
    const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasOrientation = 'DeviceOrientationEvent' in window;
    const hasGeolocation = 'geolocation' in navigator;

    this.isSupported = hasCamera && hasOrientation && hasGeolocation;

    // Check for WebXR support (for future full AR)
    if ('xr' in navigator) {
      try {
        this.hasWebXR = await navigator.xr.isSessionSupported('immersive-ar');
      } catch {
        this.hasWebXR = false;
      }
    }

    return {
      supported: this.isSupported,
      hasCamera,
      hasOrientation,
      hasGeolocation,
      hasWebXR: this.hasWebXR || false,
    };
  }

  /**
   * Initialize AR mode
   */
  async initialize(mode = AR_MODES.CAMERA, options = {}) {
    if (!this.isSupported) {
      throw new Error('AR is not supported on this device');
    }

    this.currentMode = mode;
    this.settings = { ...this.settings, ...options };

    // Request permissions
    await this.requestPermissions();

    // Start device orientation tracking
    await this.startOrientationTracking();

    // If camera mode, start camera
    if (mode === AR_MODES.CAMERA) {
      await this.startCamera();
    }

    this.isActive = true;
    this.emit('initialized', { mode });

    return true;
  }

  /**
   * Request necessary permissions
   */
  async requestPermissions() {
    // Request camera permission
    if (this.currentMode === AR_MODES.CAMERA) {
      try {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (error) {
        console.error('Camera permission denied:', error);
        throw new Error('Camera permission required for AR');
      }
    }

    // Request device orientation permission (iOS 13+)
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Device orientation permission denied');
        }
      } catch (error) {
        console.error('Orientation permission error:', error);
      }
    }
  }

  /**
   * Start camera feed
   */
  async startCamera() {
    if (!this.cameraStream) return;

    // Create video element for camera feed
    this.videoElement = document.createElement('video');
    this.videoElement.srcObject = this.cameraStream;
    this.videoElement.setAttribute('playsinline', '');
    this.videoElement.play();

    return this.videoElement;
  }

  /**
   * Start device orientation tracking
   */
  async startOrientationTracking() {
    const handleOrientation = (event) => {
      this.deviceOrientation = {
        alpha: event.alpha || 0, // Compass direction (0-360)
        beta: event.beta || 0,   // Front/back tilt (-180 to 180)
        gamma: event.gamma || 0, // Left/right tilt (-90 to 90)
      };

      this.emit('orientation', this.deviceOrientation);
    };

    window.addEventListener('deviceorientation', handleOrientation, true);

    // Also track device motion for shake detection
    window.addEventListener('devicemotion', (event) => {
      const acceleration = event.accelerationIncludingGravity;
      if (acceleration) {
        const shake = Math.abs(acceleration.x) + Math.abs(acceleration.y) + Math.abs(acceleration.z);
        if (shake > 30) {
          this.emit('shake', { intensity: shake });
        }
      }
    });
  }

  /**
   * Set player's current position
   */
  updatePlayerPosition(position) {
    this.playerPosition = {
      lat: position.lat,
      lng: position.lng,
      accuracy: position.accuracy || 10,
      heading: position.heading || this.deviceOrientation.alpha,
    };
  }

  /**
   * Update target players to track
   */
  updateTargets(players) {
    this.targetPlayers = players.map(player => ({
      id: player.id,
      name: player.name,
      lat: player.location?.lat,
      lng: player.location?.lng,
      role: player.role,
      isIt: player.isIt,
      distance: null,
      bearing: null,
      relativeAngle: null,
    }));

    // Calculate distances and bearings
    this.calculateTargetData();
  }

  /**
   * Update POIs
   */
  updatePOIs(pois) {
    this.pois = pois.map(poi => ({
      ...poi,
      distance: null,
      bearing: null,
      relativeAngle: null,
    }));
  }

  /**
   * Update game boundaries
   */
  updateBoundaries(boundaries) {
    this.boundaries = boundaries;
  }

  /**
   * Calculate target distances and bearings
   */
  calculateTargetData() {
    if (!this.playerPosition) return;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    const playerHeading = this.playerPosition.heading || this.deviceOrientation.alpha || 0;

    // Calculate for players
    this.targetPlayers.forEach(target => {
      if (!target.lat || !target.lng) return;

      target.distance = this.calculateDistance(
        this.playerPosition.lat,
        this.playerPosition.lng,
        target.lat,
        target.lng
      );

      target.bearing = this.calculateBearing(
        this.playerPosition.lat,
        this.playerPosition.lng,
        target.lat,
        target.lng
      );

      // Relative angle from device heading
      target.relativeAngle = this.normalizeAngle(target.bearing - playerHeading);
    });

    // Calculate for POIs
    this.pois.forEach(poi => {
      if (!poi.lat || !poi.lng) return;

      poi.distance = this.calculateDistance(
        this.playerPosition.lat,
        this.playerPosition.lng,
        poi.lat,
        poi.lng
      );

      poi.bearing = this.calculateBearing(
        this.playerPosition.lat,
        this.playerPosition.lng,
        poi.lat,
        poi.lng
      );

      poi.relativeAngle = this.normalizeAngle(poi.bearing - playerHeading);
    });

    this.emit('updated', {
      players: this.targetPlayers,
      pois: this.pois,
    });
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing from point 1 to point 2
   */
  calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = this.toRad(lng2 - lng1);
    const lat1Rad = this.toRad(lat1);
    const lat2Rad = this.toRad(lat2);

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    const bearing = Math.atan2(y, x);
    return (this.toDeg(bearing) + 360) % 360;
  }

  /**
   * Normalize angle to -180 to 180
   */
  normalizeAngle(angle) {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  toRad(deg) { return deg * Math.PI / 180; }
  toDeg(rad) { return rad * 180 / Math.PI; }

  /**
   * Get AR overlay data for rendering
   */
  getOverlayData() {
    const overlayElements = [];

    // Add player markers
    this.targetPlayers.forEach(target => {
      if (target.distance === null) return;

      // Determine visibility
      const isInView = Math.abs(target.relativeAngle) < 45;
      const isNearby = target.distance < this.settings.radarRange;

      overlayElements.push({
        type: AR_ELEMENTS.PLAYER_MARKER,
        id: target.id,
        name: target.name,
        distance: target.distance,
        bearing: target.bearing,
        relativeAngle: target.relativeAngle,
        isInView,
        isNearby,
        isDanger: target.isIt || target.role === 'hunter',
        color: this.getPlayerColor(target),
        opacity: this.calculateOpacity(target.distance),
        screenPosition: isInView ? this.calculateScreenPosition(target.relativeAngle) : null,
      });

      // Add direction arrow if not in view
      if (!isInView && isNearby) {
        overlayElements.push({
          type: AR_ELEMENTS.DIRECTION_ARROW,
          targetId: target.id,
          direction: target.relativeAngle > 0 ? 'right' : 'left',
          angle: Math.min(Math.abs(target.relativeAngle), 90),
          distance: target.distance,
          isDanger: target.isIt || target.role === 'hunter',
        });
      }
    });

    // Add POI markers
    this.pois.forEach(poi => {
      if (poi.distance === null || poi.distance > this.settings.fadeDistance) return;

      const isInView = Math.abs(poi.relativeAngle) < 45;

      overlayElements.push({
        type: AR_ELEMENTS.POI_MARKER,
        id: poi.id,
        name: poi.name,
        poiType: poi.type,
        distance: poi.distance,
        relativeAngle: poi.relativeAngle,
        isInView,
        color: this.getPOIColor(poi.type),
        icon: this.getPOIIcon(poi.type),
        screenPosition: isInView ? this.calculateScreenPosition(poi.relativeAngle) : null,
      });
    });

    // Add boundary warning if close to edge
    if (this.boundaries) {
      const distanceToBoundary = this.calculateDistanceToBoundary();
      if (distanceToBoundary < 50) {
        overlayElements.push({
          type: AR_ELEMENTS.BOUNDARY_LINE,
          distance: distanceToBoundary,
          urgency: distanceToBoundary < 20 ? 'critical' : 'warning',
        });
      }
    }

    return overlayElements;
  }

  /**
   * Calculate screen position for AR element
   */
  calculateScreenPosition(relativeAngle) {
    // Map -45 to 45 degrees to 0-100% screen width
    const normalized = (relativeAngle + 45) / 90;
    return {
      x: normalized * 100,
      y: 50, // Center vertically for now
    };
  }

  /**
   * Calculate opacity based on distance
   */
  calculateOpacity(distance) {
    if (distance < this.settings.radarRange) return 1;
    if (distance > this.settings.fadeDistance) return 0;

    return 1 - ((distance - this.settings.radarRange) /
      (this.settings.fadeDistance - this.settings.radarRange));
  }

  /**
   * Calculate distance to play boundary
   */
  calculateDistanceToBoundary() {
    if (!this.boundaries || !this.playerPosition) return Infinity;

    // Simple circle boundary
    if (this.boundaries.type === 'circle') {
      const centerDistance = this.calculateDistance(
        this.playerPosition.lat,
        this.playerPosition.lng,
        this.boundaries.center.lat,
        this.boundaries.center.lng
      );
      return this.boundaries.radius - centerDistance;
    }

    // Polygon boundary support
    if (this.boundaries.type === 'polygon' && this.boundaries.points?.length >= 3) {
      const points = this.boundaries.points;
      const playerLat = this.playerPosition.lat;
      const playerLng = this.playerPosition.lng;

      // Check if player is inside the polygon
      const isInside = this.isPointInPolygon(playerLat, playerLng, points);

      // Calculate distance to nearest edge
      const distanceToEdge = this.calculateDistanceToPolygonEdge(
        playerLat, playerLng, points
      );

      // If inside, return positive distance; if outside, return negative
      return isInside ? distanceToEdge : -distanceToEdge;
    }

    return Infinity;
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   * @param {number} lat - Point latitude
   * @param {number} lng - Point longitude
   * @param {Array} polygon - Array of {lat, lng} points defining the polygon
   * @returns {boolean} - True if point is inside polygon
   */
  isPointInPolygon(lat, lng, polygon) {
    if (!polygon || polygon.length < 3) return false;

    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      // Ray casting algorithm
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Calculate the shortest distance from a point to a polygon edge
   * @param {number} lat - Point latitude
   * @param {number} lng - Point longitude
   * @param {Array} polygon - Array of {lat, lng} points defining the polygon
   * @returns {number} - Distance in meters to nearest edge
   */
  calculateDistanceToPolygonEdge(lat, lng, polygon) {
    if (!polygon || polygon.length < 2) return Infinity;

    let minDistance = Infinity;
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const distance = this.distanceToLineSegment(
        lat, lng,
        polygon[i].lat, polygon[i].lng,
        polygon[j].lat, polygon[j].lng
      );

      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * Calculate the shortest distance from a point to a line segment
   * @param {number} px - Point latitude
   * @param {number} py - Point longitude
   * @param {number} x1 - Line start latitude
   * @param {number} y1 - Line start longitude
   * @param {number} x2 - Line end latitude
   * @param {number} y2 - Line end longitude
   * @returns {number} - Distance in meters
   */
  distanceToLineSegment(px, py, x1, y1, x2, y2) {
    // Convert to approximate cartesian coordinates for the calculation
    // Using a local approximation around the point
    const cosLat = Math.cos(this.toRad(px));

    // Convert points to local meters (approximate)
    const scale = 111320; // meters per degree latitude
    const pxM = px * scale;
    const pyM = py * scale * cosLat;
    const x1M = x1 * scale;
    const y1M = y1 * scale * cosLat;
    const x2M = x2 * scale;
    const y2M = y2 * scale * cosLat;

    // Vector from line start to end
    const dx = x2M - x1M;
    const dy = y2M - y1M;

    // If the segment has zero length, return distance to the point
    const segmentLengthSq = dx * dx + dy * dy;
    if (segmentLengthSq === 0) {
      return this.calculateDistance(px, py, x1, y1);
    }

    // Calculate projection parameter t
    // t = ((P - A) · (B - A)) / |B - A|²
    const t = Math.max(0, Math.min(1,
      ((pxM - x1M) * dx + (pyM - y1M) * dy) / segmentLengthSq
    ));

    // Find the closest point on the segment
    const closestX = x1M + t * dx;
    const closestY = y1M + t * dy;

    // Calculate distance from point to closest point on segment
    const distX = pxM - closestX;
    const distY = pyM - closestY;

    return Math.sqrt(distX * distX + distY * distY);
  }

  /**
   * Get the centroid of a polygon (for display purposes)
   * @param {Array} polygon - Array of {lat, lng} points
   * @returns {{lat: number, lng: number}} - Centroid point
   */
  getPolygonCentroid(polygon) {
    if (!polygon || polygon.length === 0) return null;

    let sumLat = 0;
    let sumLng = 0;

    for (const point of polygon) {
      sumLat += point.lat;
      sumLng += point.lng;
    }

    return {
      lat: sumLat / polygon.length,
      lng: sumLng / polygon.length,
    };
  }

  /**
   * Calculate the area of a polygon (in square meters)
   * Uses the Shoelace formula with spherical correction
   * @param {Array} polygon - Array of {lat, lng} points
   * @returns {number} - Area in square meters
   */
  getPolygonArea(polygon) {
    if (!polygon || polygon.length < 3) return 0;

    const n = polygon.length;
    let area = 0;

    // Get centroid for local projection
    const centroid = this.getPolygonCentroid(polygon);
    const cosLat = Math.cos(this.toRad(centroid.lat));
    const scale = 111320; // meters per degree

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;

      // Convert to local meters
      const x1 = (polygon[i].lng - centroid.lng) * scale * cosLat;
      const y1 = (polygon[i].lat - centroid.lat) * scale;
      const x2 = (polygon[j].lng - centroid.lng) * scale * cosLat;
      const y2 = (polygon[j].lat - centroid.lat) * scale;

      area += x1 * y2 - x2 * y1;
    }

    return Math.abs(area / 2);
  }

  /**
   * Get color for player marker
   */
  getPlayerColor(player) {
    if (player.isIt || player.role === 'hunter') return '#FF4444';
    if (player.role === 'infected') return '#FF8800';
    if (player.team) return player.teamColor || '#4444FF';
    return '#44FF44';
  }

  /**
   * Get POI color
   */
  getPOIColor(poiType) {
    const colors = {
      power_up_spawn: '#FFD700',
      safe_house: '#00FF00',
      capture_point: '#FF00FF',
      teleporter: '#00FFFF',
      mystery_box: '#FF8800',
    };
    return colors[poiType] || '#FFFFFF';
  }

  /**
   * Get POI icon
   */
  getPOIIcon(poiType) {
    const icons = {
      power_up_spawn: '⚡',
      safe_house: '🏠',
      capture_point: '🚩',
      teleporter: '🌀',
      mystery_box: '❓',
      checkpoint: '✅',
      hospital: '🏥',
    };
    return icons[poiType] || '📍';
  }

  /**
   * Trigger radar pulse visualization
   */
  triggerRadarPulse() {
    this.emit('radar_pulse', {
      timestamp: Date.now(),
      range: this.settings.radarRange,
      detectedTargets: this.targetPlayers.filter(t =>
        t.distance !== null && t.distance < this.settings.radarRange
      ),
    });
  }

  /**
   * Start automatic radar pulses
   */
  startRadarPulses() {
    if (this.radarInterval) return;

    this.radarInterval = setInterval(() => {
      this.triggerRadarPulse();
    }, this.settings.pulseInterval);

    // Initial pulse
    this.triggerRadarPulse();
  }

  /**
   * Stop radar pulses
   */
  stopRadarPulses() {
    if (this.radarInterval) {
      clearInterval(this.radarInterval);
      this.radarInterval = null;
    }
  }

  /**
   * Get compass data for simple AR mode
   */
  getCompassData() {
    const nearestDanger = this.targetPlayers
      .filter(t => t.isIt || t.role === 'hunter')
      .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))[0];

    const nearestPOI = this.pois
      .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))[0];

    return {
      heading: this.deviceOrientation.alpha,
      nearestDanger: nearestDanger ? {
        distance: nearestDanger.distance,
        direction: nearestDanger.relativeAngle,
        name: nearestDanger.name,
      } : null,
      nearestPOI: nearestPOI ? {
        distance: nearestPOI.distance,
        direction: nearestPOI.relativeAngle,
        name: nearestPOI.name,
        type: nearestPOI.type,
      } : null,
      boundaryDistance: this.calculateDistanceToBoundary(),
    };
  }

  /**
   * Stop AR and cleanup
   */
  stop() {
    this.isActive = false;
    this.stopRadarPulses();

    // Stop camera
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }

    // Cancel animation
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    this.emit('stopped');
  }

  /**
   * Update settings
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.emit('settings_changed', this.settings);
  }

  // Event emitter
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }
}

export const arService = new ARService();
export default arService;
