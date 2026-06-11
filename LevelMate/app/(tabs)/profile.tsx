import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  InputAccessoryView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SportChip from '../../components/sports/SportChip';
import LevelDots from '../../components/sports/LevelDots';
import SportMetricInput from '../../components/sports/SportMetricInput';
import Avatar from '../../components/ui/Avatar';
import EloBadge from '../../components/ui/EloBadge';
import api from '../../lib/api';
import { getSportColour } from '../../lib/sportColors';
import { useAuthStore } from '../../stores/authStore';
import type { GameSession, ProfileSport, Sport, SportMetricDefinition, SportMetricValue, UserProfile } from '../../types';

interface EloHistoryEntry {
  eloDelta: number;
  eloAfter: number;
  recordedAt: string;
}

function SportEloHistorySection({ userId, sportId }: { userId: string; sportId: string }) {
  const { data } = useQuery<{ history: EloHistoryEntry[]; gamesPlayed: number }>({
    queryKey: ['elo-history', userId, sportId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${userId}/sports/${sportId}/elo-history?size=5`);
      return data;
    },
    enabled: !!userId && !!sportId,
    staleTime: 30_000,
  });

  if (!data?.history?.length) return null;

  return (
    <View style={{ marginTop: 10, borderTopWidth: 1, borderColor: '#F2F3F7', paddingTop: 8 }}>
      <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>
        Recent ELO history
      </Text>
      {data.history.map((entry, idx) => {
        const date = new Date(entry.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const positive = entry.eloDelta >= 0;
        return (
          <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>{date}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: positive ? '#16A34A' : '#EF4444', fontSize: 12, fontWeight: '700' }}>
                {positive ? '+' : ''}{Math.round(entry.eloDelta)}
              </Text>
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                → {Math.round(entry.eloAfter)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const ELO_NEXT_THRESHOLDS = [800, 900, 950, 1000, 1100, 1200, 1350, 1500, 1700];

function pointsToNextLevel(level: number, elo: number): string | null {
  if (level >= 10 || level < 1) return null;
  const pts = Math.ceil(ELO_NEXT_THRESHOLDS[level - 1] - elo);
  return pts > 0 ? `${pts} pts to Level ${level + 1}` : null;
}

function formatMetricValue(metric: SportMetricValue): string | null {
  if (!metric.value) return null;
  if (metric.inputType === 'duration') {
    const total = parseInt(metric.value) || 0;
    if (total === 0) return null;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (metric.unit === 'h:mm:ss' || h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return metric.value;
}

function buildMetricValueMap(metrics: SportMetricValue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const m of metrics) {
    if (m.value !== null && m.value !== undefined) {
      map[m.metricKey] = m.value;
    }
  }
  return map;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();

  // ── Add Sport state ────────────────────────────────────────────────────────
  const [showAddSport, setShowAddSport] = useState(false);
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [addMetricValues, setAddMetricValues] = useState<Record<string, string>>({});
  const [addGradeScales, setAddGradeScales] = useState<Record<string, 'v' | 'font'>>({});

  // ── Edit Sport state ────────────────────────────────────────────────────────
  const [editSportId, setEditSportId] = useState<string | null>(null);
  const [editMetricValues, setEditMetricValues] = useState<Record<string, string>>({});
  const [editGradeScales, setEditGradeScales] = useState<Record<string, 'v' | 'font'>>({});

  // ── Edit Profile state ──────────────────────────────────────────────────────
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAvatarData, setEditAvatarData] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
        queryClient.invalidateQueries({ queryKey: ['elo-history', user.id] });
      }
    }, [queryClient, user?.id])
  );

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${user!.id}/profile`);
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: sportsCatalog = [] } = useQuery<Sport[]>({
    queryKey: ['sports-catalog'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/sports');
      return data;
    },
  });

  const { data: addSportMetrics = [], isLoading: isLoadingAddMetrics } = useQuery<SportMetricDefinition[]>({
    queryKey: ['sport-metrics', selectedSportId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/sports/${selectedSportId}/metrics`);
      return data;
    },
    enabled: !!selectedSportId,
  });

  const { data: editSportMetrics = [], isLoading: isLoadingEditMetrics } = useQuery<SportMetricDefinition[]>({
    queryKey: ['sport-metrics', editSportId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/sports/${editSportId}/metrics`);
      return data;
    },
    enabled: !!editSportId,
  });

  const { data: activeSessions = [] } = useQuery<GameSession[]>({
    queryKey: ['active-sessions', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/users/me/active-sessions');
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const activeSessionSportIds = new Set(activeSessions.map((s) => s.sportId));

  // Pre-fill edit metric values when opening edit modal
  useEffect(() => {
    if (editSportId && profile) {
      const sport = profile.sports.find((s) => s.sportId === editSportId);
      setEditMetricValues(buildMetricValueMap(sport?.metrics ?? []));
      setEditGradeScales({});
    }
  }, [editSportId, profile]);

  // Reset add metric values when sport selection changes
  useEffect(() => {
    setAddMetricValues({});
    setAddGradeScales({});
  }, [selectedSportId]);

  const addedSportIds = new Set((profile?.sports ?? []).map((s) => s.sportId));
  const availableToAdd = sportsCatalog.filter((s) => !addedSportIds.has(s.id));
  const selectedSport = sportsCatalog.find((s) => s.id === selectedSportId);
  const isAddingEloSport = selectedSport?.ratingType === 'ELO_COMPETITIVE';

  const { mutate: addSport, isPending: isAddingSport } = useMutation({
    mutationFn: async () => {
      const metrics = Object.entries(addMetricValues)
        .filter(([, v]) => v.trim())
        .map(([metricKey, value]) => ({ metricKey, value }));
      await api.post(`/api/v1/users/${user!.id}/sports`, { sportId: selectedSportId, metrics });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-sports', user?.id] });
      setShowAddSport(false);
      setSelectedSportId(null);
      setAddMetricValues({});
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add sport. It may already be on your profile.');
    },
  });

  const { mutate: updateSport, isPending: isUpdatingSport } = useMutation({
    mutationFn: async () => {
      const metrics = Object.entries(editMetricValues)
        .filter(([, v]) => v.trim())
        .map(([metricKey, value]) => ({ metricKey, value }));
      await api.put(`/api/v1/users/${user!.id}/sports/${editSportId}`, { metrics });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setEditSportId(null);
    },
    onError: (error: any) => {
      const code = error?.response?.data?.errorCode;
      if (code === 'LEVEL_LOCKED_ACTIVE_SESSION') {
        Alert.alert('Level Locked', error.response.data.message);
      } else {
        Alert.alert('Error', 'Failed to update sport. Please try again.');
      }
    },
  });

  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      await api.patch('/api/v1/users/me/profile', {
        displayName: editDisplayName.trim(),
        avatarData: editAvatarData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setShowEditProfile(false);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    },
  });

  async function pickAvatarForEdit() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setEditAvatarData(result.assets[0].base64);
    }
  }

  function openEditProfile() {
    setEditDisplayName(profile?.displayName ?? user?.displayName ?? '');
    setEditAvatarData(profile?.avatarData ?? null);
    setShowEditProfile(true);
  }

  function openEditSport(sportId: string) {
    setEditSportId(sportId);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
    );
  }

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  } as const;

  function renderSportCard(s: ProfileSport) {
    const colour = getSportColour(s.sportSlug);
    const filledMetrics = s.metrics.filter((m) => m.value !== null && m.value !== undefined && m.value !== '');

    return (
      <View key={s.sportId} style={{ ...cardStyle, borderLeftWidth: 3, borderLeftColor: colour }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#0D0D14', fontSize: 15, fontWeight: '600', flex: 1 }}>{s.sportName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {s.ratingType === 'ELO_COMPETITIVE' && s.eloRating != null && (
              <EloBadge elo={s.eloRating} />
            )}
            <Pressable onPress={() => openEditSport(s.sportId)} hitSlop={8}>
              <Text style={{ color: '#6C47FF', fontSize: 13, fontWeight: '600' }}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {s.ratingType === 'ELO_COMPETITIVE' && s.sportSlug !== 'martial_arts' && (
          <>
            {s.level != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <LevelDots level={s.level} newPlayer={s.gamesPlayed === 0} />
                <Text style={{ color: '#6B7280', fontSize: 12 }}>Level {s.level}/10</Text>
              </View>
            )}
            <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 2 }}>
              {s.gamesPlayed} game{s.gamesPlayed === 1 ? '' : 's'} played
            </Text>
            {s.gamesPlayed > 0 && s.eloRating != null && s.level != null ? (
              <Text style={{ color: '#6C47FF', fontSize: 12, fontWeight: '600' }}>
                {pointsToNextLevel(s.level, s.eloRating) ?? 'Max level reached!'}
              </Text>
            ) : s.gamesPlayed === 0 ? (
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                Play your first match to start your ELO journey
              </Text>
            ) : null}
            {user?.id && <SportEloHistorySection userId={user.id} sportId={s.sportId} />}
          </>
        )}

        {s.ratingType === 'ELO_COMPETITIVE' && s.sportSlug === 'martial_arts' && (() => {
          const discipline = s.metrics.find((m) => m.metricKey === 'discipline')?.value;
          const beltOrLevel = s.metrics.find((m) => m.metricKey === 'belt_or_level')?.value;
          return (
            <>
              {discipline ? (
                <Text style={{ color: '#0D0D14', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                  {discipline}
                </Text>
              ) : null}
              {beltOrLevel ? (
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <View style={{ backgroundColor: colour + '22', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ color: colour, fontSize: 13, fontWeight: '700' }}>{beltOrLevel}</Text>
                  </View>
                </View>
              ) : null}
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 2 }}>
                {s.gamesPlayed} game{s.gamesPlayed === 1 ? '' : 's'} played
              </Text>
              {s.gamesPlayed > 0 && s.eloRating != null && s.level != null ? (
                <Text style={{ color: '#6C47FF', fontSize: 12, fontWeight: '600' }}>
                  {pointsToNextLevel(s.level, s.eloRating) ?? 'Max level reached!'}
                </Text>
              ) : s.gamesPlayed === 0 ? (
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                  Play your first match to start your ELO journey
                </Text>
              ) : null}
              {user?.id && <SportEloHistorySection userId={user.id} sportId={s.sportId} />}
            </>
          );
        })()}

        {s.ratingType === 'GRADE_BASED' && (
          <>
            {filledMetrics.slice(0, 2).map((m) => (
              <View key={m.metricKey} style={{ flexDirection: 'row', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{m.label}:</Text>
                <View style={{ backgroundColor: colour + '22', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: colour, fontSize: 13, fontWeight: '700' }}>{m.value}</Text>
                </View>
              </View>
            ))}
            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
              {s.gamesPlayed} game{s.gamesPlayed === 1 ? '' : 's'} played
            </Text>
          </>
        )}

        {s.ratingType === 'PERFORMANCE_BASED' && (
          <>
            {filledMetrics.slice(0, 3).map((m) => {
              const display = formatMetricValue(m);
              if (!display) return null;
              return (
                <View key={m.metricKey} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{m.label}</Text>
                  <Text style={{ color: '#0D0D14', fontSize: 12, fontWeight: '600' }}>
                    {display}{m.unit && m.inputType !== 'duration' ? ` ${m.unit}` : ''}
                  </Text>
                </View>
              );
            })}
            {filledMetrics.length === 0 && (
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>No personal bests recorded yet</Text>
            )}
            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
              {s.gamesPlayed} session{s.gamesPlayed === 1 ? '' : 's'} logged
            </Text>
          </>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID="sport-metric-done">
          <View style={{ backgroundColor: '#F8F8F8', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', padding: 8, alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={Keyboard.dismiss}>
              <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Avatar
            displayName={profile?.displayName ?? user?.displayName ?? 'U'}
            userId={user?.id ?? ''}
            avatarData={profile?.avatarData}
            size={76}
          />
          <Text style={{ color: '#0D0D14', fontSize: 22, fontWeight: '700', marginTop: 12 }}>
            {profile?.displayName ?? user?.displayName}
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>LevelMate member</Text>
          <Pressable
            onPress={openEditProfile}
            style={{
              marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB',
              borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8,
            }}
          >
            <Text style={{ color: '#0D0D14', fontSize: 13, fontWeight: '600' }}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Sports */}
        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          My Sports
        </Text>

        {(profile?.sports ?? []).length === 0 ? (
          <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
            No sports added yet. Add one below!
          </Text>
        ) : (
          (profile!.sports).map((s) => renderSportCard(s))
        )}

        <Pressable
          onPress={() => setShowAddSport(true)}
          style={{ borderWidth: 1, borderColor: '#6C47FF', borderRadius: 20, padding: 12, alignItems: 'center', marginBottom: 28 }}
        >
          <Text style={{ color: '#6C47FF', fontSize: 14, fontWeight: '600' }}>+ Add Sport</Text>
        </Pressable>

        {/* Coach Profiles */}
        <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          Coach Profiles
        </Text>

        {(profile?.coachProfiles ?? []).length > 0 ? (
          profile!.coachProfiles.map((cp) => (
            <View key={cp.coachProfileId} style={cardStyle}>
              <Text style={{ color: '#0D0D14', fontSize: 15, fontWeight: '600' }}>{cp.sportName}</Text>
              {cp.description ? (
                <Text style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>{cp.description}</Text>
              ) : null}
              {cp.hourlyRateCents != null && (
                <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 4 }}>
                  ${(cp.hourlyRateCents / 100).toFixed(0)}/hr
                </Text>
              )}
              <Text style={{ color: cp.isVerified ? '#16A34A' : '#D97706', fontSize: 12, marginTop: 4 }}>
                {cp.isVerified ? 'Verified' : 'Pending verification'}
              </Text>
            </View>
          ))
        ) : (
          <View style={{ ...cardStyle, marginBottom: 28, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
              Want to coach others at your sport?
            </Text>
            <Pressable
              onPress={() => Alert.alert('Coming Soon', 'Coach profiles will be available in a future update.')}
              style={{ backgroundColor: '#F2F3F7', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 }}
            >
              <Text style={{ color: '#0D0D14', fontSize: 13, fontWeight: '600' }}>Become a Coach</Text>
            </Pressable>
          </View>
        )}

        {/* Logout */}
        <Pressable
          onPress={() =>
            Alert.alert('Log Out', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: () => logout() },
            ])
          }
          style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
        >
          <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600' }}>Log Out</Text>
        </Pressable>
      </ScrollView>

      {/* ── Edit Profile Modal ─────────────────────────────────────────────── */}
      <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ color: '#0D0D14', fontSize: 18, fontWeight: '700', marginBottom: 24 }}>Edit Profile</Text>

            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Pressable onPress={pickAvatarForEdit}>
                {editAvatarData ? (
                  <View>
                    <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden' }}>
                      <Image
                        source={{ uri: `data:image/jpeg;base64,${editAvatarData}` }}
                        style={{ width: 80, height: 80 }}
                        resizeMode="cover"
                      />
                    </View>
                    <Pressable
                      onPress={() => setEditAvatarData(null)}
                      hitSlop={8}
                      style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: '#EF4444',
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: '#FFFFFF',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 13, lineHeight: 14, fontWeight: '700' }}>×</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: '#E5E7EB',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed',
                  }}>
                    <Text style={{ fontSize: 26, color: '#9CA3AF' }}>+</Text>
                  </View>
                )}
              </Pressable>
              <Text style={{ color: '#6C47FF', fontSize: 13, fontWeight: '500', marginTop: 8 }}>
                {editAvatarData ? 'Change photo' : 'Add photo'}
              </Text>
            </View>

            <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              Display name
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F8F9FC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
                fontSize: 15, color: '#0D0D14', borderWidth: 1.5,
                borderColor: editDisplayName ? '#6C47FF' : '#E5E7EB', marginBottom: 24,
              }}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setShowEditProfile(false)}
                style={{ flex: 1, backgroundColor: '#F2F3F7', borderRadius: 20, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#0D0D14', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => updateProfile()}
                disabled={isUpdating || !editDisplayName.trim()}
                style={{
                  flex: 1,
                  backgroundColor: (isUpdating || !editDisplayName.trim()) ? '#6C47FFAA' : '#6C47FF',
                  borderRadius: 20, padding: 14, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
                  {isUpdating ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Sport Modal ────────────────────────────────────────────────── */}
      <Modal visible={showAddSport} transparent animationType="slide" onRequestClose={() => setShowAddSport(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="sport-metric-done">
              <View style={{ backgroundColor: '#F8F8F8', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', padding: 8, alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={Keyboard.dismiss}>
                  <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </InputAccessoryView>
          )}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' }}>
            <Text style={{ color: '#0D0D14', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Add Sport</Text>

            {availableToAdd.length === 0 ? (
              <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>You've added all available sports!</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {availableToAdd.map((s) => (
                  <SportChip key={s.id} label={s.name} selected={selectedSportId === s.id} onPress={() => setSelectedSportId(s.id)} />
                ))}
              </ScrollView>
            )}

            {selectedSportId && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 340 }}>
                {isLoadingAddMetrics ? (
                  <ActivityIndicator color="#6C47FF" style={{ marginVertical: 20 }} />
                ) : (
                  <>
                    {addSportMetrics.map((metric) => (
                      <View key={metric.metricKey} style={{ marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                            {metric.label}{metric.isRequired ? ' *' : ''}
                          </Text>
                          {!metric.isRequired && (
                            <Text style={{ color: '#9CA3AF', fontSize: 11 }}>(optional)</Text>
                          )}
                        </View>
                        <SportMetricInput
                          metric={metric}
                          value={addMetricValues[metric.metricKey] ?? ''}
                          onChange={(v) => setAddMetricValues((prev) => ({ ...prev, [metric.metricKey]: v }))}
                          gradeScale={addGradeScales[metric.metricKey] ?? 'v'}
                          onGradeScaleChange={(scale) => setAddGradeScales((prev) => ({ ...prev, [metric.metricKey]: scale }))}
                          maxLevel={isAddingEloSport && metric.metricKey === 'self_reported_level' ? 4 : undefined}
                          inputAccessoryViewID={Platform.OS === 'ios' ? 'sport-metric-done' : undefined}
                        />
                        {isAddingEloSport && metric.metricKey === 'self_reported_level' && (
                          <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6 }}>
                            Levels 5–10 unlock through match results
                          </Text>
                        )}
                      </View>
                    ))}
                    {addSportMetrics.some((m) => !m.isRequired) && (
                      <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>
                        Optional fields can be filled later from your profile
                      </Text>
                    )}
                  </>
                )}
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={() => { setShowAddSport(false); setSelectedSportId(null); setAddMetricValues({}); }}
                style={{ flex: 1, backgroundColor: '#F2F3F7', borderRadius: 20, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#0D0D14', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => addSport()}
                disabled={!selectedSportId || isAddingSport}
                style={{
                  flex: 1,
                  backgroundColor: (!selectedSportId || isAddingSport) ? '#6C47FFAA' : '#6C47FF',
                  borderRadius: 20, padding: 14, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
                  {isAddingSport ? 'Adding…' : 'Add Sport'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Sport Modal ───────────────────────────────────────────────── */}
      <Modal visible={!!editSportId} transparent animationType="slide" onRequestClose={() => setEditSportId(null)}>
        <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="sport-metric-done">
              <View style={{ backgroundColor: '#F8F8F8', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', padding: 8, alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={Keyboard.dismiss}>
                  <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </InputAccessoryView>
          )}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' }}>
            {(() => {
              const editingSport = profile?.sports.find((s) => s.sportId === editSportId);
              const isElo = editingSport?.ratingType === 'ELO_COMPETITIVE';
              const isMartialArts = editingSport?.sportSlug === 'martial_arts';
              const hasActiveSportSession = editSportId ? activeSessionSportIds.has(editSportId) : false;
              const gamesPlayedCount = editingSport?.gamesPlayed ?? 0;
              const levelLockedByElo = isElo && gamesPlayedCount >= 1;
              const levelLockedBySession = isElo && gamesPlayedCount === 0 && hasActiveSportSession;
              const canEditLevel = isElo && !levelLockedByElo && !levelLockedBySession;
              const visibleMetrics = editSportMetrics
                .sort((a, b) => {
                  if (isMartialArts) {
                    const order: Record<string, number> = { discipline: 1, belt_or_level: 2 };
                    return (order[a.metricKey] ?? 99) - (order[b.metricKey] ?? 99);
                  }
                  return 0;
                });

              return (
                <>
                  <Text style={{ color: '#0D0D14', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
                    Edit {editingSport?.sportName ?? 'Sport'}
                  </Text>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
                    {isLoadingEditMetrics ? (
                      <ActivityIndicator color="#6C47FF" style={{ marginVertical: 20 }} />
                    ) : (
                      <>
                        {isElo && editingSport && editingSport.gamesPlayed > 0 && (
                          <View style={{ backgroundColor: '#F8F9FC', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                              <EloBadge elo={editingSport.eloRating ?? 1000} />
                              <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>
                                Level {editingSport.level ?? 1}
                              </Text>
                            </View>
                            {editingSport.eloRating != null && editingSport.level != null ? (
                              <Text style={{ color: '#6C47FF', fontSize: 12, fontWeight: '600' }}>
                                {pointsToNextLevel(editingSport.level, editingSport.eloRating) ?? 'Max level reached!'}
                              </Text>
                            ) : null}
                          </View>
                        )}
                        {levelLockedByElo && (
                          <View style={{
                            backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12,
                            marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B',
                          }}>
                            <Text style={{ color: '#92400E', fontSize: 12, lineHeight: 17 }}>
                              Your level is automatically calculated from your ELO rating after each match. It can no longer be edited manually.
                            </Text>
                          </View>
                        )}
                        {levelLockedBySession && (
                          <View style={{
                            backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12,
                            marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#F59E0B',
                          }}>
                            <Text style={{ color: '#92400E', fontSize: 12, lineHeight: 17 }}>
                              Level editing is locked while you have an active game. It unlocks once your current session ends.
                            </Text>
                          </View>
                        )}
                        {visibleMetrics.map((metric) => {
                          const isLevelMetric = isElo && metric.metricKey === 'self_reported_level';
                          const isLocked = isLevelMetric && !canEditLevel;
                          return (
                            <View key={metric.metricKey} style={{ marginBottom: 20 }}>
                              <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                                {metric.label}
                              </Text>
                              <View pointerEvents={isLocked ? 'none' : 'auto'} style={{ opacity: isLocked ? 0.45 : 1 }}>
                                <SportMetricInput
                                  metric={metric}
                                  value={editMetricValues[metric.metricKey] ?? ''}
                                  onChange={(v) => setEditMetricValues((prev) => ({ ...prev, [metric.metricKey]: v }))}
                                  gradeScale={editGradeScales[metric.metricKey] ?? 'v'}
                                  onGradeScaleChange={(scale) => setEditGradeScales((prev) => ({ ...prev, [metric.metricKey]: scale }))}
                                  maxLevel={isLevelMetric ? 4 : undefined}
                                  inputAccessoryViewID={Platform.OS === 'ios' ? 'sport-metric-done' : undefined}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </>
                    )}
                  </ScrollView>

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                    <Pressable
                      onPress={() => setEditSportId(null)}
                      style={{ flex: 1, backgroundColor: '#F2F3F7', borderRadius: 20, padding: 14, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#0D0D14', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateSport()}
                      disabled={isUpdatingSport}
                      style={{
                        flex: 1,
                        backgroundColor: isUpdatingSport ? '#6C47FFAA' : '#6C47FF',
                        borderRadius: 20, padding: 14, alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
                        {isUpdatingSport ? 'Saving…' : 'Save Changes'}
                      </Text>
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
