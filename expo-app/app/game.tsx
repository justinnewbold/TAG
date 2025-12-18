import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useGameStore } from '../src/store/gameStore';
import { socketService } from '../src/services/socket';
import { Button } from '../src/components';
import { colors } from '../src/theme/colors';

const { width, height } = Dimensions.get('window');

export default function GameScreen() {
  const {
    currentGame,
    user,
    updateUserLocation,
    updatePlayerLocation,
    tagPlayer,
    endGame,
    syncGameState,
  } = useGameStore();

  const [gameTime, setGameTime] = useState(0);
  const [isTagging, setIsTagging] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const isIt = currentGame?.itPlayerId === user?.id;
  const itPlayer = currentGame?.players?.find((p) => p.id === currentGame?.itPlayerId);

  // Start location tracking
  useEffect(() => {
    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission is required to play TAG!');
        return;
      }

      // Get initial location
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      updateUserLocation(coords);

      // Subscribe to location updates
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        (loc) => {
          const newCoords = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
          updateUserLocation(newCoords);
          if (socketService.isConnected()) {
            socketService.updateLocation(newCoords);
          }
        }
      );
    };

    startLocationTracking();

    return () => {
      locationSubscription.current?.remove();
    };
  }, []);

  // Game timer
  useEffect(() => {
    if (!currentGame?.startedAt) return;

    const interval = setInterval(() => {
      setGameTime(Date.now() - currentGame.startedAt!);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentGame?.startedAt]);

  // Socket listeners
  useEffect(() => {
    const handleLocationUpdate = ({ playerId, location }: any) => {
      updatePlayerLocation(playerId, location);
    };

    const handleTagged = ({ newItPlayerId, taggedId }: any) => {
      if (taggedId === user?.id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (newItPlayerId !== user?.id) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    };

    const handleGameEnded = ({ game }: any) => {
      syncGameState(game);
      router.replace('/');
    };

    socketService.on('player:location', handleLocationUpdate);
    socketService.on('player:tagged', handleTagged);
    socketService.on('game:ended', handleGameEnded);

    return () => {
      socketService.off('player:location', handleLocationUpdate);
      socketService.off('player:tagged', handleTagged);
      socketService.off('game:ended', handleGameEnded);
    };
  }, []);

  // Redirect if no game
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'active') {
      router.replace('/');
    }
  }, [currentGame]);

  const getDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getNearestTarget = () => {
    if (!isIt || !user?.location || !currentGame) {
      return { player: null, distance: Infinity };
    }

    let nearest = null;
    let nearestDist = Infinity;

    currentGame.players
      .filter((p) => p.id !== user.id && p.location)
      .forEach((player) => {
        const dist = getDistance(
          user.location!.lat,
          user.location!.lng,
          player.location!.lat,
          player.location!.lng
        );
        if (dist < nearestDist) {
          nearest = player;
          nearestDist = dist;
        }
      });

    return { player: nearest, distance: nearestDist };
  };

  const { player: nearestPlayer, distance: nearestDistance } = getNearestTarget();
  const tagRadius = currentGame?.settings?.tagRadius || 20;
  const inTagRange = isIt && nearestPlayer && nearestDistance <= tagRadius;

  const handleTag = async () => {
    if (!inTagRange || !nearestPlayer || isTagging) return;

    setIsTagging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const result = tagPlayer(nearestPlayer.id);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsTagging(false);
  };

  const handleEndGame = () => {
    Alert.alert('End Game', 'Are you sure you want to end this game?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Game',
        style: 'destructive',
        onPress: () => {
          endGame(isIt ? null : user?.id);
          router.replace('/');
        },
      },
    ]);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentGame) return null;

  const userLocation = user?.location || { lat: 37.7749, lng: -122.4194 };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={16} color={colors.text.muted} />
          <Text style={styles.timer}>{formatTime(gameTime)}</Text>
        </View>
        <View style={styles.headerCenter}>
          <View
            style={[
              styles.statusBadge,
              isIt ? styles.statusIt : styles.statusRunner,
            ]}
          >
            <Ionicons
              name={isIt ? 'locate' : 'walk'}
              size={16}
              color={isIt ? colors.neon.orange : colors.neon.cyan}
            />
            <Text
              style={[
                styles.statusText,
                isIt ? styles.statusTextIt : styles.statusTextRunner,
              ]}
            >
              {isIt ? "YOU'RE IT!" : `${itPlayer?.name} is IT`}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleEndGame} style={styles.headerRight}>
          <Ionicons name="flag" size={20} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {/* Tag radius circle for IT */}
          {isIt && user?.location && (
            <Circle
              center={{
                latitude: user.location.lat,
                longitude: user.location.lng,
              }}
              radius={tagRadius}
              fillColor={colors.neon.orange + '20'}
              strokeColor={colors.neon.orange}
              strokeWidth={2}
            />
          )}

          {/* User marker */}
          {user?.location && (
            <Marker
              coordinate={{
                latitude: user.location.lat,
                longitude: user.location.lng,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View
                style={[
                  styles.marker,
                  isIt ? styles.markerIt : styles.markerRunner,
                ]}
              >
                <Text style={styles.markerEmoji}>{user.avatar || '🏃'}</Text>
              </View>
            </Marker>
          )}

          {/* Other players */}
          {currentGame.players
            .filter((p) => p.id !== user?.id && p.location)
            .map((player) => (
              <Marker
                key={player.id}
                coordinate={{
                  latitude: player.location!.lat,
                  longitude: player.location!.lng,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={[
                    styles.marker,
                    player.id === currentGame.itPlayerId
                      ? styles.markerIt
                      : styles.markerRunner,
                  ]}
                >
                  <Text style={styles.markerEmoji}>
                    {player.avatar || '🏃'}
                  </Text>
                </View>
              </Marker>
            ))}
        </MapView>

        {/* Nearest target info */}
        {isIt && nearestPlayer && (
          <View style={styles.targetInfo}>
            <Text style={styles.targetAvatar}>
              {nearestPlayer.avatar || '🏃'}
            </Text>
            <View>
              <Text style={styles.targetName}>{nearestPlayer.name}</Text>
              <Text
                style={[
                  styles.targetDistance,
                  inTagRange && styles.targetInRange,
                ]}
              >
                {nearestDistance < 1000
                  ? `${Math.round(nearestDistance)}m`
                  : `${(nearestDistance / 1000).toFixed(1)}km`}
                {inTagRange && ' - IN RANGE!'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* TAG Button */}
      {isIt && (
        <View style={styles.tagButtonContainer}>
          <TouchableOpacity
            style={[
              styles.tagButton,
              inTagRange ? styles.tagButtonActive : styles.tagButtonDisabled,
            ]}
            onPress={handleTag}
            disabled={!inTagRange || isTagging}
            activeOpacity={0.8}
          >
            <Text style={styles.tagButtonText}>TAG!</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Distance from IT (for runners) */}
      {!isIt && itPlayer?.location && user?.location && (
        <View style={styles.distanceBar}>
          <Ionicons name="locate" size={20} color={colors.neon.orange} />
          <Text style={styles.distanceText}>
            {itPlayer.name} is{' '}
            {(() => {
              const dist = getDistance(
                user.location.lat,
                user.location.lng,
                itPlayer.location.lat,
                itPlayer.location.lng
              );
              return dist < 1000
                ? `${Math.round(dist)}m`
                : `${(dist / 1000).toFixed(1)}km`;
            })()}{' '}
            away
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark[900],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.dark[900],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timer: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusIt: {
    backgroundColor: colors.neon.orange + '20',
    borderWidth: 1,
    borderColor: colors.neon.orange + '50',
  },
  statusRunner: {
    backgroundColor: colors.neon.cyan + '20',
    borderWidth: 1,
    borderColor: colors.neon.cyan + '50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextIt: {
    color: colors.neon.orange,
  },
  statusTextRunner: {
    color: colors.neon.cyan,
  },
  headerRight: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  markerIt: {
    backgroundColor: colors.neon.orange,
  },
  markerRunner: {
    backgroundColor: colors.neon.cyan,
  },
  markerEmoji: {
    fontSize: 20,
  },
  targetInfo: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.dark[800] + 'F0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetAvatar: {
    fontSize: 32,
  },
  targetName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  targetDistance: {
    fontSize: 14,
    color: colors.text.muted,
  },
  targetInRange: {
    color: colors.neon.orange,
    fontWeight: '700',
  },
  tagButtonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tagButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagButtonActive: {
    backgroundColor: colors.neon.orange,
    shadowColor: colors.neon.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  tagButtonDisabled: {
    backgroundColor: colors.dark[700],
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  tagButtonText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text.primary,
  },
  distanceBar: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: colors.dark[800] + 'F0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
