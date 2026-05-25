import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SportChip from '../../components/sports/SportChip';
import LevelDots from '../../components/sports/LevelDots';
import Avatar from '../../components/ui/Avatar';
import EloBadge from '../../components/ui/EloBadge';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { UserProfile, Sport } from '../../types';

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

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAddSport, setShowAddSport] = useState(false);
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(5);
  const [gradeInput, setGradeInput] = useState('');

  // Edit profile state
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

  const addedSportIds = new Set((profile?.sports ?? []).map((s) => s.sportId));
  const availableToAdd = sportsCatalog.filter((s) => !addedSportIds.has(s.id));

  const selectedSport = availableToAdd.find((s) => s.id === selectedSportId);
  const selectedRatingType = selectedSport?.ratingType ?? 'ELO_COMPETITIVE';

  const { mutate: addSport, isPending: isAddingSport } = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = { sportId: selectedSportId };
      if (selectedRatingType === 'GRADE_BASED') {
        payload.grade = gradeInput.trim() || undefined;
      } else {
        payload.level = selectedLevel;
      }
      await api.post(`/api/v1/users/${user!.id}/sports`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-sports', user?.id] });
      setShowAddSport(false);
      setSelectedSportId(null);
      setSelectedLevel(5);
      setGradeInput('');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add sport. It may already be on your profile.');
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
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
          (profile!.sports).map((s) => (
            <View key={s.sportId} style={cardStyle}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#0D0D14', fontSize: 15, fontWeight: '600' }}>{s.sportName}</Text>
                {s.ratingType === 'ELO_COMPETITIVE' && s.eloRating != null && (
                  <EloBadge elo={s.eloRating} />
                )}
              </View>
              {s.level != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <LevelDots level={s.level} />
                  <Text style={{ color: '#6B7280', fontSize: 12 }}>Level {s.level}/10</Text>
                </View>
              )}
              {s.ratingType === 'GRADE_BASED' && s.grade && (
                <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 4 }}>Grade: {s.grade}</Text>
              )}
              <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{s.gamesPlayed} game{s.gamesPlayed === 1 ? '' : 's'} played</Text>
              {s.ratingType === 'ELO_COMPETITIVE' && user?.id && (
                <SportEloHistorySection userId={user.id} sportId={s.sportId} />
              )}
            </View>
          ))
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

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} transparent animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ color: '#0D0D14', fontSize: 18, fontWeight: '700', marginBottom: 24 }}>Edit Profile</Text>

            {/* Avatar */}
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

            {/* Display name */}
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

            {/* Buttons */}
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

      {/* Add Sport Modal */}
      <Modal visible={showAddSport} transparent animationType="slide" onRequestClose={() => setShowAddSport(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
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

            {selectedRatingType === 'GRADE_BASED' ? (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                  Grade
                </Text>
                <TextInput
                  style={{
                    backgroundColor: '#F8F9FC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
                    fontSize: 15, color: '#0D0D14', borderWidth: 1.5, borderColor: gradeInput ? '#6C47FF' : '#E5E7EB',
                  }}
                  placeholder="e.g. V5, 6a, 5.10b"
                  placeholderTextColor="#9CA3AF"
                  value={gradeInput}
                  onChangeText={setGradeInput}
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                  Skill Level: {selectedLevel}/10
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <Pressable
                    onPress={() => setSelectedLevel(Math.max(1, selectedLevel - 1))}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F3F7', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#0D0D14', fontSize: 20, lineHeight: 22 }}>−</Text>
                  </Pressable>
                  <Text style={{ color: '#0D0D14', fontSize: 18, fontWeight: '600', minWidth: 30, textAlign: 'center' }}>{selectedLevel}</Text>
                  <Pressable
                    onPress={() => setSelectedLevel(Math.min(10, selectedLevel + 1))}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F3F7', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#0D0D14', fontSize: 20, lineHeight: 22 }}>+</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => { setShowAddSport(false); setSelectedSportId(null); setSelectedLevel(5); setGradeInput(''); }}
                style={{ flex: 1, backgroundColor: '#F2F3F7', borderRadius: 20, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#0D0D14', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { if (selectedSportId) addSport(); }}
                disabled={!selectedSportId || isAddingSport || availableToAdd.length === 0}
                style={{
                  flex: 1,
                  backgroundColor: (selectedSportId && !isAddingSport) ? '#6C47FF' : '#6C47FFAA',
                  borderRadius: 20, padding: 14, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
                  {isAddingSport ? 'Adding…' : 'Add'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
