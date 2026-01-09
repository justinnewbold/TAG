import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../src/store/gameStore';
import { socketService } from '../src/services/socket';
import { api } from '../src/services/api';
import { Card, Button } from '../src/components';
import { colors } from '../src/theme/colors';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
  inGame?: boolean;
  lastSeen?: number;
}

interface FriendRequest {
  id: string;
  fromUser: { id: string; name: string; avatar: string };
  toUser: { id: string; name: string; avatar: string };
}

export default function FriendsScreen() {
  const { currentGame, user } = useGameStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [myFriendCode, setMyFriendCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  const loadData = useCallback(async () => {
    try {
      const [friendsRes, requestsRes, codeRes] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
        api.getFriendCode(),
      ]);

      setFriends(friendsRes.friends || []);
      setIncomingRequests(requestsRes.incoming || []);
      setOutgoingRequests(requestsRes.outgoing || []);
      setMyFriendCode(codeRes.code || '');
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen for game invites
    const handleGameInvite = (data: { fromId: string; fromName: string; gameCode: string }) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Game Invite',
        `${data.fromName} invited you to join their game!`,
        [
          { text: 'Decline', style: 'cancel' },
          {
            text: 'Join',
            onPress: async () => {
              const success = await useGameStore.getState().joinGame(data.gameCode);
              if (success) {
                router.replace('/lobby');
              }
            },
          },
        ]
      );
    };

    socketService.on('game:invite', handleGameInvite);

    return () => {
      socketService.off('game:invite', handleGameInvite);
    };
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(myFriendCode);
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async () => {
    if (!friendCode.trim()) return;

    setIsAdding(true);
    setAddError('');

    try {
      await api.sendFriendRequest(friendCode.trim().toUpperCase());
      setFriendCode('');
      setShowAddModal(false);
      loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setAddError(err.message || 'Failed to send friend request');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await api.acceptFriendRequest(requestId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await api.declineFriendRequest(requestId);
      loadData();
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  };

  const handleInviteToGame = (friendId: string, friendName: string) => {
    if (!currentGame) {
      Alert.alert('No Active Game', 'Create or join a game first to invite friends.');
      return;
    }

    socketService.inviteToGame(friendId, currentGame.code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Invite Sent', `Game invite sent to ${friendName}!`);
  };

  const handleRemoveFriend = (friendId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.removeFriend(friendId);
              loadData();
            } catch (err) {
              console.error('Failed to remove friend:', err);
            }
          },
        },
      ]
    );
  };

  const renderFriend = ({ item: friend }: { item: Friend }) => (
    <Card style={styles.friendCard}>
      <View style={styles.friendRow}>
        <View style={styles.friendAvatar}>
          <Text style={styles.avatarEmoji}>{friend.avatar || '👤'}</Text>
          {friend.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{friend.name}</Text>
          <Text style={styles.friendStatus}>
            {friend.isOnline
              ? friend.inGame
                ? '🎮 In Game'
                : '🟢 Online'
              : 'Offline'}
          </Text>
        </View>
        <View style={styles.friendActions}>
          {currentGame && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleInviteToGame(friend.id, friend.name)}
            >
              <Ionicons name="game-controller" size={20} color={colors.neon.cyan} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemoveFriend(friend.id, friend.name)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  const renderRequest = ({ item: request }: { item: FriendRequest }) => (
    <Card style={styles.requestCard}>
      <View style={styles.requestRow}>
        <Text style={styles.requestAvatar}>{request.fromUser.avatar || '👤'}</Text>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{request.fromUser.name}</Text>
          <Text style={styles.requestText}>Wants to be friends</Text>
        </View>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(request.id)}
        >
          <Ionicons name="checkmark" size={20} color={colors.success} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineRequest(request.id)}
        >
          <Ionicons name="close" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={styles.addButton}
        >
          <Ionicons name="person-add" size={24} color={colors.neon.cyan} />
        </TouchableOpacity>
      </View>

      {/* Friend Code Card */}
      <View style={styles.codeCardContainer}>
        <Card variant="glow" style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Friend Code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{myFriendCode || '--------'}</Text>
            <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy'}
                size={20}
                color={copied ? colors.success : colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text
            style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}
          >
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text
            style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}
          >
            Requests
            {incomingRequests.length > 0 && (
              <Text style={styles.badge}> ({incomingRequests.length})</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'friends' ? (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people" size={64} color={colors.text.muted} />
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptyHint}>
                Add friends using their friend code
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={incomingRequests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail" size={64} color={colors.text.muted} />
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          }
        />
      )}

      {/* Add Friend Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <TextInput
              style={styles.input}
              value={friendCode}
              onChangeText={(text) => setFriendCode(text.toUpperCase())}
              placeholder="Enter friend code"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="characters"
              maxLength={8}
            />
            {addError && <Text style={styles.error}>{addError}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setFriendCode('');
                  setAddError('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title="Add"
                onPress={handleAddFriend}
                loading={isAdding}
                disabled={!friendCode.trim()}
              />
            </View>
          </View>
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
  addButton: {
    padding: 8,
  },
  codeCardContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  codeCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  code: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.neon.cyan,
    letterSpacing: 4,
  },
  copyButton: {
    padding: 8,
    backgroundColor: colors.dark[700],
    borderRadius: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.dark[800],
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.neon.cyan + '20',
    borderWidth: 1,
    borderColor: colors.neon.cyan + '50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  },
  tabTextActive: {
    color: colors.neon.cyan,
  },
  badge: {
    color: colors.neon.orange,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  friendCard: {
    marginBottom: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendAvatar: {
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.dark[800],
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  friendStatus: {
    fontSize: 12,
    color: colors.text.muted,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: colors.dark[700],
    borderRadius: 8,
  },
  requestCard: {
    marginBottom: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestAvatar: {
    fontSize: 32,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  requestText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  acceptButton: {
    padding: 8,
    backgroundColor: colors.success + '20',
    borderRadius: 8,
  },
  declineButton: {
    padding: 8,
    backgroundColor: colors.error + '20',
    borderRadius: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    backgroundColor: colors.dark[800],
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.dark[700],
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 16,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.dark[700],
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
});
