import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../src/store/gameStore';
import { Card, Button } from '../src/components';
import { colors } from '../src/theme/colors';

export default function StatsScreen() {
  const { user, games, logout } = useGameStore();

  const totalGames = games.length;
  const wins = games.filter((g) => g.winnerId === user?.id).length;
  const totalTags = games.reduce(
    (acc, g) =>
      acc + (g.players.find((p) => p.id === user?.id)?.tagCount || 0),
    0
  );
  const totalTimesIt = games.reduce(
    (acc, g) => acc + g.tags.filter((t) => t.taggedId === user?.id).length,
    0
  );

  const handleLogout = () => {
    logout();
    router.replace('/register');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <Card variant="glow" style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>{user?.avatar || '👤'}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.tagline}>TAG! Player</Text>
        </Card>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="game-controller" size={24} color={colors.neon.cyan} />
            <Text style={styles.statValue}>{totalGames}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="trophy" size={24} color={colors.neon.orange} />
            <Text style={styles.statValue}>{wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="hand-left" size={24} color={colors.neon.purple} />
            <Text style={styles.statValue}>{totalTags}</Text>
            <Text style={styles.statLabel}>Tags</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="locate" size={24} color={colors.error} />
            <Text style={styles.statValue}>{totalTimesIt}</Text>
            <Text style={styles.statLabel}>Times IT</Text>
          </Card>
        </View>

        {/* Win Rate */}
        {totalGames > 0 && (
          <Card style={styles.winRateCard}>
            <View style={styles.winRateHeader}>
              <Text style={styles.winRateTitle}>Win Rate</Text>
              <Text style={styles.winRateValue}>
                {Math.round((wins / totalGames) * 100)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(wins / totalGames) * 100}%` },
                ]}
              />
            </View>
          </Card>
        )}

        {/* Logout Button */}
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="secondary"
          style={styles.logoutButton}
        />
      </ScrollView>
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
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.dark[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    fontSize: 40,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  tagline: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  winRateCard: {
    marginBottom: 24,
  },
  winRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  winRateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  winRateValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neon.cyan,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.dark[700],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.neon.cyan,
    borderRadius: 4,
  },
  logoutButton: {
    marginTop: 8,
  },
});
