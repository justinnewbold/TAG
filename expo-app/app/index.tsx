import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { Button, Card } from '../src/components';
import { colors, gradients } from '../src/theme/colors';
import { typography, globalStyles } from '../src/theme/styles';

export default function HomeScreen() {
  const { user, isAuthenticated, currentGame, games } = useGameStore();

  useEffect(() => {
    // Redirect to register if not authenticated
    if (!isAuthenticated) {
      router.replace('/register');
      return;
    }

    // Redirect to game if in active game
    if (currentGame?.status === 'active') {
      router.replace('/game');
    } else if (currentGame?.status === 'waiting') {
      router.replace('/lobby');
    }
  }, [isAuthenticated, currentGame]);

  if (!isAuthenticated) {
    return null;
  }

  const recentGames = games.filter((g) => g.status === 'ended').slice(0, 3);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user?.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/friends')}
            >
              <Ionicons name="people" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings" size={22} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => router.push('/stats')}
            >
              <Text style={styles.avatar}>{user?.avatar || '👤'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={gradients.primary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoBg}
          >
            <Text style={styles.logo}>TAG!</Text>
          </LinearGradient>
          <Text style={styles.tagline}>Hunt Your Friends</Text>
        </View>

        {/* Main Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/create')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.neon.cyan + '20', 'transparent']}
              style={styles.actionGradient}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="add-circle" size={32} color={colors.neon.cyan} />
              </View>
              <Text style={styles.actionTitle}>Create Game</Text>
              <Text style={styles.actionSubtitle}>Start a new game</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/join')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.neon.purple + '20', 'transparent']}
              style={styles.actionGradient}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="enter" size={32} color={colors.neon.purple} />
              </View>
              <Text style={styles.actionTitle}>Join Game</Text>
              <Text style={styles.actionSubtitle}>Enter game code</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recent Games */}
        {recentGames.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Games</Text>
              <TouchableOpacity onPress={() => router.push('/history')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {recentGames.map((game) => (
              <Card key={game.id} style={styles.gameCard}>
                <View style={globalStyles.spaceBetween}>
                  <View>
                    <Text style={styles.gameName}>
                      {game.settings.gameName || 'TAG! Game'}
                    </Text>
                    <Text style={styles.gameInfo}>
                      {game.players.length} players
                    </Text>
                  </View>
                  <View style={styles.gameResult}>
                    {game.winnerId === user?.id ? (
                      <Text style={styles.winText}>👑 Won!</Text>
                    ) : (
                      <Text style={styles.lostText}>Ended</Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{games.length}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>
                {games.filter((g) => g.winnerId === user?.id).length}
              </Text>
              <Text style={styles.statLabel}>Wins</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>
                {games.reduce(
                  (acc, g) =>
                    acc +
                    (g.players.find((p) => p.id === user?.id)?.tagCount || 0),
                  0
                )}
              </Text>
              <Text style={styles.statLabel}>Tags</Text>
            </Card>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 14,
    color: colors.text.muted,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark[800],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.neon.cyan,
  },
  avatar: {
    fontSize: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBg: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.text.primary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 16,
    color: colors.text.muted,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.dark[800],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
  },
  actionIcon: {
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  seeAll: {
    fontSize: 14,
    color: colors.neon.cyan,
  },
  gameCard: {
    marginBottom: 8,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  gameInfo: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  gameResult: {
    alignItems: 'flex-end',
  },
  winText: {
    color: colors.neon.cyan,
    fontWeight: '600',
  },
  lostText: {
    color: colors.text.muted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neon.cyan,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
});
