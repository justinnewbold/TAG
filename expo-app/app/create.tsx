import React, { useState } from 'react';
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
import Slider from '@react-native-community/slider';
import { useGameStore } from '../src/store/gameStore';
import { Button, Card, Input } from '../src/components';
import { colors } from '../src/theme/colors';

const GPS_INTERVALS = [
  { label: '1 min', value: 60 * 1000 },
  { label: '5 min', value: 5 * 60 * 1000 },
  { label: '15 min', value: 15 * 60 * 1000 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: '4 hours', value: 4 * 60 * 60 * 1000 },
];

const DURATIONS = [
  { label: 'None', value: null },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: '4 hours', value: 4 * 60 * 60 * 1000 },
  { label: '1 day', value: 24 * 60 * 60 * 1000 },
  { label: '1 week', value: 7 * 24 * 60 * 60 * 1000 },
];

export default function CreateGameScreen() {
  const { createGame, user, isLoading, error } = useGameStore();
  const [gameName, setGameName] = useState(`${user?.name}'s Game`);
  const [gpsInterval, setGpsInterval] = useState(5 * 60 * 1000);
  const [tagRadius, setTagRadius] = useState(20);
  const [duration, setDuration] = useState<number | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(10);

  const handleCreate = async () => {
    const game = await createGame({
      gameName,
      gpsInterval,
      tagRadius,
      duration,
      maxPlayers,
    });

    if (game) {
      router.replace('/lobby');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Game</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Game Name */}
        <Card style={styles.section}>
          <Input
            label="Game Name"
            value={gameName}
            onChangeText={setGameName}
            placeholder="Enter game name"
            maxLength={30}
          />
        </Card>

        {/* GPS Interval */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>GPS Update Interval</Text>
          <Text style={styles.sectionHint}>
            How often player locations are shared
          </Text>
          <View style={styles.optionGrid}>
            {GPS_INTERVALS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionButton,
                  gpsInterval === opt.value && styles.optionButtonSelected,
                ]}
                onPress={() => setGpsInterval(opt.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    gpsInterval === opt.value && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Tag Radius */}
        <Card style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Tag Radius</Text>
            <Text style={styles.sliderValue}>{tagRadius}m</Text>
          </View>
          <Text style={styles.sectionHint}>
            How close you need to be to tag someone
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={100}
            step={5}
            value={tagRadius}
            onValueChange={setTagRadius}
            minimumTrackTintColor={colors.neon.cyan}
            maximumTrackTintColor={colors.dark[700]}
            thumbTintColor={colors.neon.cyan}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>5m</Text>
            <Text style={styles.sliderLabel}>100m</Text>
          </View>
        </Card>

        {/* Duration */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Game Duration</Text>
          <Text style={styles.sectionHint}>
            Auto-end game after this time (optional)
          </Text>
          <View style={styles.optionGrid}>
            {DURATIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.optionButton,
                  duration === opt.value && styles.optionButtonSelected,
                ]}
                onPress={() => setDuration(opt.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    duration === opt.value && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Max Players */}
        <Card style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.sectionTitle}>Max Players</Text>
            <Text style={styles.sliderValue}>{maxPlayers}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={2}
            maximumValue={20}
            step={1}
            value={maxPlayers}
            onValueChange={setMaxPlayers}
            minimumTrackTintColor={colors.neon.purple}
            maximumTrackTintColor={colors.dark[700]}
            thumbTintColor={colors.neon.purple}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>2</Text>
            <Text style={styles.sliderLabel}>20</Text>
          </View>
        </Card>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title="Create Game"
          onPress={handleCreate}
          loading={isLoading}
          size="large"
          style={styles.createButton}
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 16,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  optionButtonSelected: {
    backgroundColor: colors.neon.cyan + '20',
    borderColor: colors.neon.cyan,
  },
  optionText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.neon.cyan,
    fontWeight: '600',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neon.cyan,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  createButton: {
    marginTop: 8,
  },
});
