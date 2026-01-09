import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../src/store/gameStore';
import { Card } from '../src/components';
import { colors } from '../src/theme/colors';

export default function SettingsScreen() {
  const { user, logout } = useGameStore();

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [highAccuracyGPS, setHighAccuracyGPS] = useState(true);
  const [showDistance, setShowDistance] = useState(true);

  const handleToggle = (setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean) => {
    setter(value);
    if (vibration) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/register');
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your game history and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            // Reset store
            useGameStore.getState().logout();
            router.replace('/register');
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    iconColor,
    title,
    subtitle,
    value,
    onValueChange,
  }: {
    icon: string;
    iconColor: string;
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.dark[700], true: colors.neon.cyan + '50' }}
        thumbColor={value ? colors.neon.cyan : colors.text.muted}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.section}>
          <View style={styles.accountRow}>
            <View style={styles.accountAvatar}>
              <Text style={styles.avatar}>{user?.avatar || '👤'}</Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{user?.name}</Text>
              <Text style={styles.accountId}>TAG! Player</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="pencil" size={16} color={colors.neon.cyan} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.section}>
          <SettingRow
            icon="notifications"
            iconColor={colors.neon.cyan}
            title="Push Notifications"
            subtitle="Game invites and updates"
            value={notifications}
            onValueChange={(v) => handleToggle(setNotifications, v)}
          />
        </Card>

        {/* Sound & Haptics */}
        <Text style={styles.sectionTitle}>Sound & Haptics</Text>
        <Card style={styles.section}>
          <SettingRow
            icon="volume-high"
            iconColor={colors.neon.purple}
            title="Sound Effects"
            subtitle="In-game sounds"
            value={sound}
            onValueChange={(v) => handleToggle(setSound, v)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="phone-portrait"
            iconColor={colors.neon.orange}
            title="Vibration"
            subtitle="Haptic feedback"
            value={vibration}
            onValueChange={(v) => handleToggle(setVibration, v)}
          />
        </Card>

        {/* GPS Settings */}
        <Text style={styles.sectionTitle}>Location</Text>
        <Card style={styles.section}>
          <SettingRow
            icon="locate"
            iconColor={colors.success}
            title="High Accuracy GPS"
            subtitle="Uses more battery"
            value={highAccuracyGPS}
            onValueChange={(v) => handleToggle(setHighAccuracyGPS, v)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="eye"
            iconColor={colors.neon.cyan}
            title="Show Distance"
            subtitle="Display distance to players"
            value={showDistance}
            onValueChange={(v) => handleToggle(setShowDistance, v)}
          />
        </Card>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <Card style={styles.section}>
          <TouchableOpacity style={styles.linkRow}>
            <Ionicons name="document-text" size={20} color={colors.text.muted} />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.linkRow}>
            <Ionicons name="shield-checkmark" size={20} color={colors.text.muted} />
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.linkRow}>
            <Ionicons name="information-circle" size={20} color={colors.text.muted} />
            <Text style={styles.linkText}>Version</Text>
            <Text style={styles.versionText}>1.0.0</Text>
          </View>
        </Card>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <Card style={styles.section}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={colors.error} />
            <Text style={styles.dangerText}>Sign Out</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.dangerRow} onPress={handleClearData}>
            <Ionicons name="trash" size={20} color={colors.error} />
            <Text style={styles.dangerText}>Clear All Data</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>TAG! GPS Hunt Game</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for outdoor fun</Text>
        </View>
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  section: {
    marginBottom: 8,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    fontSize: 24,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  accountId: {
    fontSize: 12,
    color: colors.text.muted,
  },
  editButton: {
    padding: 8,
    backgroundColor: colors.neon.cyan + '20',
    borderRadius: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.text.primary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  versionText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  dangerText: {
    fontSize: 16,
    color: colors.error,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
});
