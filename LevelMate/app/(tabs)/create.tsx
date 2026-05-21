import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SportChip from '../../components/sports/SportChip';
import api from '../../lib/api';
import { formatSessionDate, formatDuration } from '../../lib/format';
import { useAuthStore } from '../../stores/authStore';

function Stepper({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 20, lineHeight: 22 }}>−</Text>
      </Pressable>
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', minWidth: 40, textAlign: 'center' }}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 20, lineHeight: 22 }}>+</Text>
      </Pressable>
    </View>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{label}</Text>
      {children}
      {error ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

interface FormErrors {
  sport?: string;
  date?: string;
  minPlayers?: string;
  maxPlayers?: string;
  locationName?: string;
}

export default function CreateScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: userSports = [], isLoading: sportsLoading } = useQuery({
    queryKey: ['user-sports', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${user!.id}/sports`);
      return data as { userSportId: string; sportId: string; sportName: string }[];
    },
    enabled: !!user?.id,
  });

  const [sportId, setSportId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [levelRangeEnabled, setLevelRangeEnabled] = useState(false);
  const [minLevel, setMinLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(10);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const { mutate: createSession, isPending } = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await api.post('/api/v1/game-sessions', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
      router.push(`/session/${data.id}`);
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.message ?? 'Failed to create game. Please try again.');
    },
  });

  async function useCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Enable location in Settings to use this feature.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocationCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!sportId) errs.sport = 'Sport is required';
    if (!date) errs.date = 'Date and time is required';
    else if (date <= new Date()) errs.date = 'Date must be in the future';
    if (minPlayers < 2) errs.minPlayers = 'Minimum 2 players';
    if (maxPlayers < minPlayers) errs.maxPlayers = 'Max must be ≥ min players';
    if (!locationName.trim()) errs.locationName = 'Location name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    setSubmitError('');
    if (!validate()) return;
    const payload: Record<string, any> = {
      sportId,
      scheduledAt: date!.toISOString(),
      durationMinutes,
      minPlayers,
      maxPlayers,
      locationName: locationName.trim(),
    };
    if (title.trim()) payload.title = title.trim();
    if (locationAddress.trim()) payload.locationAddress = locationAddress.trim();
    if (locationCoords) { payload.locationLat = locationCoords.lat; payload.locationLng = locationCoords.lng; }
    if (levelRangeEnabled) { payload.minLevel = minLevel; payload.maxLevel = maxLevel; }
    if (description.trim()) payload.description = description.trim();
    createSession(payload);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 24 }}>Create Game</Text>

          {/* Sport */}
          <FormField label="Sport *" error={errors.sport}>
            {sportsLoading ? (
              <ActivityIndicator color="#6C47FF" />
            ) : userSports.length === 0 ? (
              <Text style={{ color: '#9B9BAE', fontSize: 13 }}>Add sports to your profile first.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {userSports.map((s) => (
                  <SportChip key={s.sportId} label={s.sportName} selected={sportId === s.sportId} onPress={() => setSportId(s.sportId)} />
                ))}
              </ScrollView>
            )}
          </FormField>

          {/* Title */}
          <FormField label="Title">
            <TextInput
              style={{ backgroundColor: '#1A1A24', color: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A3A' }}
              placeholder="e.g. Sunday 3v3 Basketball"
              placeholderTextColor="#9B9BAE"
              value={title}
              onChangeText={setTitle}
            />
          </FormField>

          {/* Date & Time */}
          <FormField label="Date & Time *" error={errors.date}>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={{ backgroundColor: '#1A1A24', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: errors.date ? '#EF4444' : '#2A2A3A' }}
            >
              <Text style={{ color: date ? '#FFFFFF' : '#9B9BAE', fontSize: 15 }}>
                {date ? formatSessionDate(date.toISOString()) : 'Select date and time'}
              </Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={date ?? new Date(Date.now() + 3600000)}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) setDate(selected);
                }}
              />
            )}
          </FormField>

          {/* Duration */}
          <FormField label="Duration">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15 }}>{formatDuration(durationMinutes)}</Text>
              <Stepper value={durationMinutes} onChange={setDurationMinutes} min={30} max={240} step={15} />
            </View>
          </FormField>

          {/* Players */}
          <FormField label="Players *">
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#9B9BAE', fontSize: 12, marginBottom: 6 }}>Min</Text>
                <Stepper value={minPlayers} onChange={(v) => setMinPlayers(Math.min(v, maxPlayers))} min={2} max={30} />
                {errors.minPlayers ? <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{errors.minPlayers}</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#9B9BAE', fontSize: 12, marginBottom: 6 }}>Max</Text>
                <Stepper value={maxPlayers} onChange={(v) => setMaxPlayers(Math.max(v, minPlayers))} min={2} max={30} />
                {errors.maxPlayers ? <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{errors.maxPlayers}</Text> : null}
              </View>
            </View>
          </FormField>

          {/* Skill Level Range */}
          <FormField label="Skill Level">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: levelRangeEnabled ? 12 : 0 }}>
              <Text style={{ color: levelRangeEnabled ? '#FFFFFF' : '#9B9BAE', fontSize: 15 }}>
                {levelRangeEnabled ? `Level ${minLevel}–${maxLevel}` : 'Any level'}
              </Text>
              <Pressable
                onPress={() => setLevelRangeEnabled((v) => !v)}
                style={{ backgroundColor: levelRangeEnabled ? '#6C47FF' : '#2A2A3A', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{levelRangeEnabled ? 'On' : 'Off'}</Text>
              </Pressable>
            </View>
            {levelRangeEnabled && (
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#9B9BAE', fontSize: 12, marginBottom: 6 }}>Min Level</Text>
                  <Stepper value={minLevel} onChange={(v) => setMinLevel(Math.min(v, maxLevel))} min={1} max={10} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#9B9BAE', fontSize: 12, marginBottom: 6 }}>Max Level</Text>
                  <Stepper value={maxLevel} onChange={(v) => setMaxLevel(Math.max(v, minLevel))} min={1} max={10} />
                </View>
              </View>
            )}
          </FormField>

          {/* Location */}
          <FormField label="Location *" error={errors.locationName}>
            <TextInput
              style={{ backgroundColor: '#1A1A24', color: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: errors.locationName ? '#EF4444' : '#2A2A3A', marginBottom: 8 }}
              placeholder="e.g. Teren Gheorgheni"
              placeholderTextColor="#9B9BAE"
              value={locationName}
              onChangeText={setLocationName}
            />
            <TextInput
              style={{ backgroundColor: '#1A1A24', color: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A3A', marginBottom: 8 }}
              placeholder="Address (optional)"
              placeholderTextColor="#9B9BAE"
              value={locationAddress}
              onChangeText={setLocationAddress}
            />
            <Pressable onPress={useCurrentLocation} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: locationCoords ? '#22C55E' : '#6C47FF', fontSize: 13, fontWeight: '600' }}>
                {locationCoords ? '✓ Location set' : '📍 Use my current location'}
              </Text>
            </Pressable>
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <TextInput
              style={{ backgroundColor: '#1A1A24', color: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A3A', minHeight: 80, textAlignVertical: 'top' }}
              placeholder="Optional description"
              placeholderTextColor="#9B9BAE"
              multiline
              maxLength={500}
              value={description}
              onChangeText={setDescription}
            />
            <Text style={{ color: '#9B9BAE', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{description.length}/500</Text>
          </FormField>

          {submitError ? (
            <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{submitError}</Text>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            style={{ backgroundColor: isPending ? '#6C47FF88' : '#6C47FF', borderRadius: 14, padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
              {isPending ? 'Creating…' : 'Create Game'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
