import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGameStore } from '../src/store/gameStore';
import { Button, Card } from '../src/components';
import { colors } from '../src/theme/colors';

export default function JoinGameScreen() {
  const { joinGame, isLoading, error, clearError } = useGameStore();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    // Only allow alphanumeric
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleaned.length <= 1) {
      const newCode = [...code];
      newCode[index] = cleaned;
      setCode(newCode);

      // Auto-focus next input
      if (cleaned && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when complete
      if (cleaned && index === 5) {
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
          handleJoin(fullCode);
        }
      }
    } else if (cleaned.length === 6) {
      // Pasted full code
      const newCode = cleaned.split('');
      setCode(newCode);
      handleJoin(cleaned);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async (fullCode?: string) => {
    clearError();
    setLocalError('');

    const gameCode = fullCode || code.join('');

    if (gameCode.length !== 6) {
      setLocalError('Please enter a 6-character code');
      return;
    }

    const success = await joinGame(gameCode);
    if (success) {
      router.replace('/lobby');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Join Game</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Card variant="glow" style={styles.card}>
            <Text style={styles.label}>Enter Game Code</Text>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.codeInput,
                    digit && styles.codeInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index)
                  }
                  maxLength={6}
                  autoCapitalize="characters"
                  keyboardType="default"
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>

            {(localError || error) && (
              <Text style={styles.error}>{localError || error}</Text>
            )}

            <Text style={styles.hint}>
              Ask the game host for the 6-character code
            </Text>
          </Card>

          <Button
            title="Join Game"
            onPress={() => handleJoin()}
            loading={isLoading}
            disabled={code.join('').length !== 6}
            size="large"
            style={styles.button}
          />

          {/* QR Scanner Option */}
          <TouchableOpacity style={styles.scanOption}>
            <Ionicons name="qr-code" size={20} color={colors.neon.cyan} />
            <Text style={styles.scanText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  label: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 24,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  codeInput: {
    width: 44,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.dark[700],
    borderWidth: 2,
    borderColor: colors.border.default,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: colors.neon.cyan,
    backgroundColor: colors.neon.cyan + '10',
  },
  error: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
  },
  scanOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 16,
  },
  scanText: {
    fontSize: 16,
    color: colors.neon.cyan,
    fontWeight: '600',
  },
});
