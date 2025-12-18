import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useGameStore } from '../src/store/gameStore';
import { Button, Input } from '../src/components';
import { colors, gradients } from '../src/theme/colors';

const AVATARS = ['🏃', '🏃‍♀️', '🦊', '🐺', '🦁', '🐯', '🐻', '🐼', '🦄', '🐲', '👻', '🤖', '🥷', '🦸', '🦹', '🧙'];

export default function RegisterScreen() {
  const { register, isLoading, error, clearError } = useGameStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🏃');
  const [localError, setLocalError] = useState('');

  const handleRegister = async () => {
    clearError();
    setLocalError('');

    if (!name.trim()) {
      setLocalError('Please enter a name');
      return;
    }

    if (name.trim().length < 2) {
      setLocalError('Name must be at least 2 characters');
      return;
    }

    const success = await register(name.trim(), avatar);
    if (success) {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Avatar Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Choose Your Avatar</Text>
            <View style={styles.avatarSelected}>
              <Text style={styles.avatarLarge}>{avatar}</Text>
            </View>
            <View style={styles.avatarGrid}>
              {AVATARS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[
                    styles.avatarOption,
                    avatar === a && styles.avatarOptionSelected,
                  ]}
                  onPress={() => setAvatar(a)}
                >
                  <Text style={styles.avatarEmoji}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Input
              label="Your Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={20}
              error={localError || error || undefined}
            />
          </View>

          {/* Submit Button */}
          <Button
            title="Start Playing"
            onPress={handleRegister}
            loading={isLoading}
            size="large"
            style={styles.button}
          />

          <Text style={styles.disclaimer}>
            Your data is stored locally and on our servers for game
            functionality. No account required!
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.dark[900],
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  avatarSelected: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    fontSize: 64,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  avatarOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark[800],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: colors.neon.cyan,
    backgroundColor: colors.neon.cyan + '20',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  button: {
    marginTop: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
});
