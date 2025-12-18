import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../src/store/gameStore';
import { Button, Card } from '../src/components';
import { socketService } from '../src/services/socket';
import { colors } from '../src/theme/colors';

export default function LobbyScreen() {
  const { currentGame, user, startGame, leaveGame, syncGameState, isLoading } =
    useGameStore();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isHost = currentGame?.host === user?.id;
  const playerCount = currentGame?.players?.length || 0;
  const canStart = playerCount >= 2;

  useEffect(() => {
    if (!currentGame) {
      router.replace('/');
      return;
    }

    // Listen for game started
    const handleGameStarted = ({ game }: { game: any }) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      syncGameState(game);
      router.replace('/game');
    };

    // Listen for player joined
    const handlePlayerJoined = ({ game }: { game: any }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      syncGameState(game);
    };

    // Listen for player left
    const handlePlayerLeft = ({ game }: { game: any }) => {
      syncGameState(game);
    };

    socketService.on('game:started', handleGameStarted);
    socketService.on('player:joined', handlePlayerJoined);
    socketService.on('player:left', handlePlayerLeft);

    return () => {
      socketService.off('game:started', handleGameStarted);
      socketService.off('player:joined', handlePlayerJoined);
      socketService.off('player:left', handlePlayerLeft);
    };
  }, [currentGame]);

  const handleCopyCode = async () => {
    if (currentGame?.code) {
      await Clipboard.setStringAsync(currentGame.code);
      setCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!currentGame) return;

    try {
      await Share.share({
        message: `Join my TAG! game!\n\nGame Code: ${currentGame.code}\n\nDownload the app and enter the code to play!`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleStartGame = async () => {
    if (!canStart) return;

    // Countdown
    setCountdown(3);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          doStartGame();
          return null;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return prev - 1;
      });
    }, 1000);
  };

  const doStartGame = async () => {
    const success = await startGame();
    if (success) {
      router.replace('/game');
    } else {
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  const handleLeave = async () => {
    Alert.alert('Leave Game', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveGame();
          router.replace('/');
        },
      },
    ]);
  };

  if (!currentGame) {
    return null;
  }

  const formatInterval = (ms: number) => {
    if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))} min`;
    if (ms < 24 * 60 * 60 * 1000)
      return `${Math.floor(ms / (60 * 60 * 1000))} hour${
        ms >= 2 * 60 * 60 * 1000 ? 's' : ''
      }`;
    return `${Math.floor(ms / (24 * 60 * 60 * 1000))} day${
      ms >= 2 * 24 * 60 * 60 * 1000 ? 's' : ''
    }`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title} numberOfLines={1}>
            {currentGame.settings.gameName || 'Game Lobby'}
          </Text>
          <Text style={styles.subtitle}>Waiting for players...</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Game Code */}
        <Card variant="glow" style={styles.codeCard}>
          <Text style={styles.codeLabel}>Game Code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{currentGame.code}</Text>
            <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy'}
                size={20}
                color={copied ? colors.success : colors.text.primary}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={16} color={colors.neon.cyan} />
            <Text style={styles.shareText}>Share invite link</Text>
          </TouchableOpacity>
        </Card>

        {/* Settings Summary */}
        <Card style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Game Settings</Text>
          <View style={styles.settingsGrid}>
            <View style={styles.settingItem}>
              <Ionicons name="time" size={16} color={colors.neon.cyan} />
              <Text style={styles.settingLabel}>GPS Update</Text>
              <Text style={styles.settingValue}>
                {formatInterval(currentGame.settings.gpsInterval || 300000)}
              </Text>
            </View>
            <View style={styles.settingItem}>
              <Ionicons name="locate" size={16} color={colors.neon.purple} />
              <Text style={styles.settingLabel}>Tag Radius</Text>
              <Text style={styles.settingValue}>
                {currentGame.settings.tagRadius || 20}m
              </Text>
            </View>
            <View style={styles.settingItem}>
              <Ionicons name="people" size={16} color={colors.neon.orange} />
              <Text style={styles.settingLabel}>Max Players</Text>
              <Text style={styles.settingValue}>
                {currentGame.settings.maxPlayers || 10}
              </Text>
            </View>
          </View>
        </Card>

        {/* Players */}
        <Card style={styles.playersCard}>
          <View style={styles.playersHeader}>
            <Text style={styles.playersTitle}>
              Players ({playerCount}/{currentGame.settings.maxPlayers || 10})
            </Text>
          </View>

          {currentGame.players?.map((player) => (
            <View
              key={player.id}
              style={[
                styles.playerRow,
                player.id === user?.id && styles.playerRowSelf,
              ]}
            >
              <Text style={styles.playerAvatar}>{player.avatar || '👤'}</Text>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {player.name}
                  {player.id === user?.id && (
                    <Text style={styles.youBadge}> (You)</Text>
                  )}
                </Text>
                <Text style={styles.playerRole}>
                  {player.id === currentGame.host ? '👑 Host' : 'Player'}
                </Text>
              </View>
              <Ionicons
                name="wifi"
                size={16}
                color={colors.success}
              />
            </View>
          ))}

          {playerCount < 2 && (
            <Text style={styles.waitingText}>
              Need at least 2 players to start
            </Text>
          )}
        </Card>
      </ScrollView>

      {/* Start Button (Host Only) */}
      {isHost && (
        <View style={styles.footer}>
          <Button
            title={canStart ? 'Start Game' : `Waiting for ${2 - playerCount} more`}
            onPress={handleStartGame}
            disabled={!canStart || isLoading}
            loading={isLoading}
            size="large"
          />
        </View>
      )}

      {!isHost && (
        <View style={styles.footer}>
          <Text style={styles.waitingForHost}>
            Waiting for host to start the game...
          </Text>
        </View>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownText}>Get Ready!</Text>
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
    padding: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.muted,
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  codeCard: {
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  code: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.neon.cyan,
    letterSpacing: 4,
  },
  copyButton: {
    padding: 8,
    backgroundColor: colors.dark[700],
    borderRadius: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  shareText: {
    fontSize: 14,
    color: colors.neon.cyan,
  },
  settingsCard: {
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  settingsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  settingItem: {
    flex: 1,
    backgroundColor: colors.dark[700],
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 10,
    color: colors.text.muted,
    marginTop: 4,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 2,
  },
  playersCard: {
    marginBottom: 16,
  },
  playersHeader: {
    marginBottom: 12,
  },
  playersTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  playerRowSelf: {
    backgroundColor: colors.neon.cyan + '10',
    borderWidth: 1,
    borderColor: colors.neon.cyan + '30',
  },
  playerAvatar: {
    fontSize: 24,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  youBadge: {
    color: colors.neon.cyan,
  },
  playerRole: {
    fontSize: 12,
    color: colors.text.muted,
  },
  waitingText: {
    textAlign: 'center',
    color: colors.text.muted,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.dark[900],
  },
  waitingForHost: {
    textAlign: 'center',
    color: colors.text.muted,
    fontSize: 14,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.dark[900] + 'F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 120,
    fontWeight: '900',
    color: colors.neon.cyan,
  },
  countdownText: {
    fontSize: 24,
    color: colors.text.secondary,
    marginTop: 16,
  },
});
