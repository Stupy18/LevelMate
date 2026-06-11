import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePickerModal from '../../components/ui/DateTimePickerModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConflictModal from '../../components/modals/ConflictModal';
import LocationPicker, { type SelectedLocation } from '../../components/location/LocationPicker';
import SportChip from '../../components/sports/SportChip';
import api from '../../lib/api';
import { formatSessionDate, formatDuration } from '../../lib/format';
import { useAuthStore } from '../../stores/authStore';
import type { ConflictingSession } from '../../types';

function Stepper({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F3F7', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#0D0D14', fontSize: 20, lineHeight: 22 }}>−</Text>
      </Pressable>
      <Text style={{ color: '#0D0D14', fontSize: 16, fontWeight: '600', minWidth: 40, textAlign: 'center' }}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F3F7', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#0D0D14', fontSize: 20, lineHeight: 22 }}>+</Text>
      </Pressable>
    </View>
  );
}

function FormField({ label, error, children, containerStyle }: { label: string; error?: string; children: React.ReactNode; containerStyle?: object }) {
  return (
    <View style={[{ marginBottom: 18 }, containerStyle]}>
      <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{label}</Text>
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
  location?: string;
}

export default function CreateScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: userSports = [], isLoading: sportsLoading } = useQuery({
    queryKey: ['user-sports', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${user!.id}/sports`);
      return data as { userSportId: string; sportId: string; sportName: string; ratingType: string; level: number | null }[];
    },
    enabled: !!user?.id,
  });

  const [sportId, setSportId] = useState<string | null>(null);

  const selectedUserSport = userSports.find((s) => s.sportId === sportId);
  const isEloSport = selectedUserSport?.ratingType === 'ELO_COMPETITIVE';
  const isGradeSport = selectedUserSport?.ratingType === 'GRADE_BASED';
  const isPerformanceSport = selectedUserSport?.ratingType === 'PERFORMANCE_BASED';
  const hostLevel = selectedUserSport?.level ?? null;
  const maxLevelCap = isEloSport && hostLevel != null ? hostLevel + 3 : 10;

  const { data: sportMetrics = [] } = useQuery({
    queryKey: ['sport-metrics', sportId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/sports/${sportId}/metrics`);
      return data as { id: string; metricKey: string; label: string; inputType: string; unit?: string | null }[];
    },
    enabled: !!sportId && isGradeSport,
  });

  const gradeMetric = sportMetrics.find(m => m.inputType === 'grade_v' || m.inputType === 'grade_french_sport');
  const gradeScale: string[] = gradeMetric?.inputType === 'grade_v'
    ? ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17']
    : gradeMetric?.inputType === 'grade_french_sport'
    ? ['5a', '5b', '5c', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a']
    : [];

  useEffect(() => {
    if (maxLevel > maxLevelCap) setMaxLevel(maxLevelCap);
  }, [sportId, maxLevelCap]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [teamSize, setTeamSize] = useState(3);
  const [levelRangeEnabled, setLevelRangeEnabled] = useState(false);
  const [minLevel, setMinLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(10);
  const [gradeMin, setGradeMin] = useState<string | null>(null);
  const [gradeMax, setGradeMax] = useState<string | null>(null);
  const [targetPace, setTargetPace] = useState('');
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [conflictingSession, setConflictingSession] = useState<ConflictingSession | null>(null);

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
      const errorCode = err?.response?.data?.errorCode;
      if (errorCode === 'TIME_CONFLICT') {
        setConflictingSession(err.response.data.conflictingSession);
        return;
      }
      setSubmitError(err?.response?.data?.message ?? 'Failed to create game. Please try again.');
    },
  });

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!sportId) errs.sport = 'Sport is required';
    if (!date) errs.date = 'Date and time is required';
    else if (date <= new Date()) errs.date = 'Date must be in the future';
    if (minPlayers < 2) errs.minPlayers = 'Minimum 2 players';
    if (maxPlayers < minPlayers) errs.maxPlayers = 'Max must be ≥ min players';
    if (!location) errs.location = 'Location is required';
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
      minPlayers: isEloSport ? 2 : minPlayers,
      maxPlayers: isEloSport ? teamSize * 2 : maxPlayers,
      locationName: location!.locationName,
      locationAddress: location!.locationAddress,
      locationLat: location!.locationLat,
      locationLng: location!.locationLng,
      googlePlaceId: location!.googlePlaceId,
      googlePhotoReference: location!.googlePhotoReference,
    };
    if (title.trim()) payload.title = title.trim();
    if (description.trim()) payload.description = description.trim();
    if (isEloSport && levelRangeEnabled) { payload.minLevel = minLevel; payload.maxLevel = maxLevel; }
    if (isGradeSport) {
      if (gradeMin) payload.gradeMin = gradeMin;
      if (gradeMax) payload.gradeMax = gradeMax;
    }
    if (isPerformanceSport && targetPace.trim()) payload.targetPace = targetPace.trim();
    createSession(payload);
  }

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    color: '#0D0D14',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 15,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: '#0D0D14', fontSize: 28, fontWeight: '700', marginBottom: 24 }}>Create Game</Text>

          {/* Sport */}
          <FormField label="Sport *" error={errors.sport}>
            {sportsLoading ? (
              <ActivityIndicator color="#6C47FF" />
            ) : userSports.length === 0 ? (
              <Text style={{ color: '#6B7280', fontSize: 13 }}>Add sports to your profile first.</Text>
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
              style={inputStyle}
              placeholder="e.g. Sunday 3v3 Basketball"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
            />
          </FormField>

          {/* Date & Time */}
          <FormField label="Date & Time *" error={errors.date}>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={{ ...inputStyle, borderColor: errors.date ? '#EF4444' : '#E5E7EB' }}
            >
              <Text style={{ color: date ? '#0D0D14' : '#9CA3AF', fontSize: 15 }}>
                {date ? formatSessionDate(date.toISOString()) : 'Select date and time'}
              </Text>
            </Pressable>
          </FormField>

          {/* Duration */}
          <FormField label="Duration">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#0D0D14', fontSize: 15 }}>{formatDuration(durationMinutes)}</Text>
              <Stepper value={durationMinutes} onChange={setDurationMinutes} min={30} max={240} step={15} />
            </View>
          </FormField>

          {/* Players / Team Size */}
          {isEloSport ? (
            <FormField label="Team Size">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#0D0D14', fontSize: 15 }}>
                  {teamSize} vs {teamSize} · {teamSize * 2} players
                </Text>
                <Stepper value={teamSize} onChange={setTeamSize} min={1} max={15} />
              </View>
            </FormField>
          ) : (
            <FormField label="Players *">
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>Min</Text>
                  <Stepper value={minPlayers} onChange={(v) => setMinPlayers(Math.min(v, maxPlayers))} min={2} max={30} />
                  {errors.minPlayers ? <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{errors.minPlayers}</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>Max</Text>
                  <Stepper value={maxPlayers} onChange={(v) => setMaxPlayers(Math.max(v, minPlayers))} min={2} max={30} />
                  {errors.maxPlayers ? <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{errors.maxPlayers}</Text> : null}
                </View>
              </View>
            </FormField>
          )}

          {/* ELO: Skill Level Range */}
          {isEloSport && (
            <FormField label="Skill Level">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: levelRangeEnabled ? 12 : 0 }}>
                <Text style={{ color: levelRangeEnabled ? '#0D0D14' : '#6B7280', fontSize: 15 }}>
                  {levelRangeEnabled ? `Level ${minLevel}–${maxLevel}` : 'Any level'}
                </Text>
                <Pressable
                  onPress={() => setLevelRangeEnabled((v) => !v)}
                  style={{ backgroundColor: levelRangeEnabled ? '#EDE9FF' : '#F2F3F7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}
                >
                  <Text style={{ color: levelRangeEnabled ? '#6C47FF' : '#6B7280', fontSize: 13, fontWeight: '600' }}>{levelRangeEnabled ? 'On' : 'Off'}</Text>
                </Pressable>
              </View>
              {levelRangeEnabled && (
                <View style={{ flexDirection: 'row', gap: 24 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>Min Level</Text>
                    <Stepper value={minLevel} onChange={(v) => setMinLevel(Math.min(v, maxLevel))} min={1} max={10} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>Max Level</Text>
                    <Stepper
                      value={Math.min(maxLevel, maxLevelCap)}
                      onChange={(v) => setMaxLevel(Math.min(Math.max(v, minLevel), maxLevelCap))}
                      min={1}
                      max={maxLevelCap}
                    />
                    {hostLevel != null && (
                      <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 4 }}>
                        Max: your level + 3 ({hostLevel} + 3 = {maxLevelCap})
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </FormField>
          )}

          {/* GRADE_BASED: Grade Range */}
          {isGradeSport && (
            <FormField label="Grade Range">
              {gradeScale.length > 0 ? (
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 8 }}>Min Grade</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {gradeScale.map(g => (
                        <Pressable
                          key={g}
                          onPress={() => setGradeMin(g === gradeMin ? null : g)}
                          style={{
                            marginRight: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                            backgroundColor: gradeMin === g ? '#6C47FF' : '#F2F3F7',
                            borderWidth: 1, borderColor: gradeMin === g ? '#6C47FF' : '#E5E7EB',
                          }}
                        >
                          <Text style={{ color: gradeMin === g ? '#FFFFFF' : '#0D0D14', fontSize: 13, fontWeight: '600' }}>{g}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  <View>
                    <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 8 }}>Max Grade</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {gradeScale.map(g => (
                        <Pressable
                          key={g}
                          onPress={() => setGradeMax(g === gradeMax ? null : g)}
                          style={{
                            marginRight: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                            backgroundColor: gradeMax === g ? '#6C47FF' : '#F2F3F7',
                            borderWidth: 1, borderColor: gradeMax === g ? '#6C47FF' : '#E5E7EB',
                          }}
                        >
                          <Text style={{ color: gradeMax === g ? '#FFFFFF' : '#0D0D14', fontSize: 13, fontWeight: '600' }}>{g}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  {(gradeMin || gradeMax) && (
                    <Text style={{ color: '#6B7280', fontSize: 13 }}>
                      {gradeMin && gradeMax ? `${gradeMin} – ${gradeMax}` : gradeMin ? `${gradeMin} and above` : `Up to ${gradeMax}`}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Any grade welcome</Text>
              )}
              <View style={{ marginTop: 10 }}>
                <View style={{ backgroundColor: '#EDE9FF', borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ color: '#6C47FF', fontSize: 12, fontWeight: '600' }}>Group Session</Text>
                </View>
              </View>
            </FormField>
          )}

          {/* PERFORMANCE_BASED: Target Pace */}
          {isPerformanceSport && (
            <FormField label="Target Pace">
              <TextInput
                style={inputStyle}
                placeholder="e.g. 5:30/km, sub-20min 5K, 100kg squat"
                placeholderTextColor="#9CA3AF"
                value={targetPace}
                onChangeText={setTargetPace}
              />
              <View style={{ marginTop: 8 }}>
                <View style={{ backgroundColor: '#EDE9FF', borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4 }}>
                  <Text style={{ color: '#6C47FF', fontSize: 12, fontWeight: '600' }}>Group Training</Text>
                </View>
              </View>
            </FormField>
          )}

          {/* Location */}
          <FormField label="Location *" error={errors.location} containerStyle={{ zIndex: 999 }}>
            <LocationPicker value={location} onSelect={setLocation} />
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <TextInput
              style={{ ...inputStyle, minHeight: 80, textAlignVertical: 'top' }}
              placeholder="Optional description"
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              value={description}
              onChangeText={setDescription}
            />
            <Text style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{description.length}/500</Text>
          </FormField>

          {submitError ? (
            <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{submitError}</Text>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isPending}
            style={{ backgroundColor: isPending ? '#6C47FFAA' : '#6C47FF', borderRadius: 24, padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {isPending ? 'Creating…' : 'Create Game'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <DateTimePickerModal
        visible={showDatePicker}
        value={date}
        minimumDate={new Date()}
        onChange={(d) => setDate(d)}
        onClose={() => setShowDatePicker(false)}
      />

      <ConflictModal
        visible={conflictingSession !== null}
        conflictingSession={conflictingSession}
        onDismiss={() => setConflictingSession(null)}
      />
    </SafeAreaView>
  );
}
