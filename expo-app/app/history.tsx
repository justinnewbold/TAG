import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../src/store/gameStore';
import { Card } from '../src/components';
import { colors } from '../src/theme/colors';
import { formatDistanceToNow } from 'date-fns';

export default function HistoryScreen() {
  const { games, user } = useGameStore();
  const endedGames = games.filter((g) => g.status === 'ended');

  const renderGame = ({ item: game }: { item: any }) => {
    const isWinner = game.winnerId === user?.id;
    const userStats = game.players.find((p: any) => p.id === user?.id);

    return (
      <Card style={styles.gameCard}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameName}>
            {game.settings.gameName || 'TAG! Game'}
          </Text>
          {isWinner && <Text style={styles.winBadge}>👑 Winner</Text>}
        </View>

        <View style={styles.gameInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={14} color={colors.text.muted} />
            <Text style={styles.infoText}>{game.players.length} players</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="hand-left" size={14} color={colors.text.muted} />
            <Text style={styles.infoText}>{userStats?.tagCount || 0} tags</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={14} color={colors.text.muted} />
            <Text style={styles.infoText}>
              {game.endedAt
                ? formatDistanceToNow(game.endedAt, { addSuffix: true })
                : 'Unknown'}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Game History</Text>
        <View style={styles.placeholder} />
      </View>

      {endedGames.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="game-controller" size={64} color={colors.text.muted} />
          <Text style={styles.emptyText}>No games played yet</Text>
          <Text style={styles.emptyHint}>
            Create or join a game to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={endedGames}
          renderItem={renderGame}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
  list: {
    padding: 16,
  },
  gameCard: {
    marginBottom: 12,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  winBadge: {
    fontSize: 12,
    color: colors.neon.cyan,
    fontWeight: '600',
  },
  gameInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: 8,
    textAlign: 'center',
  },
});
