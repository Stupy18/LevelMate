import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SportChip from '../../components/sports/SportChip';
import LevelDots from '../../components/sports/LevelDots';
import AvatarInitials from '../../components/ui/AvatarInitials';
import EloBadge from '../../components/ui/EloBadge';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { UserProfile, Sport } from '../../types';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAddSport, setShowAddSport] = useState(false);
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(5);

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

  const { mutate: addSport, isPending: isAddingSport } = useMutation({
    mutationFn: async () => {
      await api.post(`/api/v1/users/${user!.id}/sports`, {
        sportId: selectedSportId,
        level: selectedLevel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-sports', user?.id] });
      setShowAddSport(false);
      setSelectedSportId(null);
      setSelectedLevel(5);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to add sport. It may already be on your profile.');
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <AvatarInitials
            displayName={profile?.displayName ?? user?.displayName ?? 'U'}
            userId={user?.id ?? ''}
            size={76}
          />
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 12 }}>
            {profile?.displayName ?? user?.displayName}
          </Text>
          <Text style={{ color: '#9B9BAE', fontSize: 13, marginTop: 4 }}>LevelMate member</Text>
          <Pressable
            disabled
            style={{
              marginTop: 12, borderWidth: 1, borderColor: '#2A2A3A',
              borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8, opacity: 0.4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Sports */}
        <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          My Sports
        </Text>

        {(profile?.sports ?? []).length === 0 ? (
          <Text style={{ color: '#9B9BAE', fontSize: 14, marginBottom: 16 }}>
            No sports added yet. Add one below!
          </Text>
        ) : (
          (profile!.sports).map((s) => (
            <View
              key={s.sportId}
              style={{ backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A3A' }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{s.sportName}</Text>
                {s.ratingType === 'ELO_COMPETITIVE' && s.eloRating != null && (
                  <EloBadge elo={s.eloRating} />
                )}
              </View>
              {s.level != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <LevelDots level={s.level} />
                  <Text style={{ color: '#9B9BAE', fontSize: 12 }}>Level {s.level}/10</Text>
                </View>
              )}
              {s.ratingType === 'GRADE_BASED' && s.grade && (
                <Text style={{ color: '#9B9BAE', fontSize: 12, marginBottom: 4 }}>Grade: {s.grade}</Text>
              )}
              <Text style={{ color: '#9B9BAE', fontSize: 12 }}>{s.gamesPlayed} game{s.gamesPlayed === 1 ? '' : 's'} played</Text>
            </View>
          ))
        )}

        <Pressable
          onPress={() => setShowAddSport(true)}
          style={{ borderWidth: 1, borderColor: '#6C47FF', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 28 }}
        >
          <Text style={{ color: '#6C47FF', fontSize: 14, fontWeight: '600' }}>+ Add Sport</Text>
        </Pressable>

        {/* Coach Profiles */}
        <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
          Coach Profiles
        </Text>

        {(profile?.coachProfiles ?? []).length > 0 ? (
          profile!.coachProfiles.map((cp) => (
            <View
              key={cp.coachProfileId}
              style={{ backgroundColor: '#1A1A24', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A3A' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{cp.sportName}</Text>
              {cp.description ? (
                <Text style={{ color: '#9B9BAE', fontSize: 13, marginTop: 4 }}>{cp.description}</Text>
              ) : null}
              {cp.hourlyRateCents != null && (
                <Text style={{ color: '#9B9BAE', fontSize: 12, marginTop: 4 }}>
                  ${(cp.hourlyRateCents / 100).toFixed(0)}/hr
                </Text>
              )}
              <Text style={{ color: cp.isVerified ? '#22C55E' : '#F59E0B', fontSize: 12, marginTop: 4 }}>
                {cp.isVerified ? '✓ Verified' : 'Pending verification'}
              </Text>
            </View>
          ))
        ) : (
          <View style={{ backgroundColor: '#1A1A24', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2A2A3A', marginBottom: 28, alignItems: 'center' }}>
            <Text style={{ color: '#9B9BAE', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
              Want to coach others at your sport?
            </Text>
            <Pressable
              onPress={() => Alert.alert('Coming Soon', 'Coach profiles will be available in a future update.')}
              style={{ backgroundColor: '#2A2A3A', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Become a Coach</Text>
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
          style={{ backgroundColor: '#1A1A24', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A3A' }}
        >
          <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '600' }}>Log Out</Text>
        </Pressable>
      </ScrollView>

      {/* Add Sport Modal */}
      <Modal visible={showAddSport} transparent animationType="slide" onRequestClose={() => setShowAddSport(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1A1A24', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Add Sport</Text>

            {availableToAdd.length === 0 ? (
              <Text style={{ color: '#9B9BAE', fontSize: 14, marginBottom: 16 }}>You've added all available sports!</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {availableToAdd.map((s) => (
                  <SportChip key={s.id} label={s.name} selected={selectedSportId === s.id} onPress={() => setSelectedSportId(s.id)} />
                ))}
              </ScrollView>
            )}

            <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              Skill Level: {selectedLevel}/10
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <Pressable
                onPress={() => setSelectedLevel(Math.max(1, selectedLevel - 1))}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 20, lineHeight: 22 }}>−</Text>
              </Pressable>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600', minWidth: 30, textAlign: 'center' }}>{selectedLevel}</Text>
              <Pressable
                onPress={() => setSelectedLevel(Math.min(10, selectedLevel + 1))}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 20, lineHeight: 22 }}>+</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => { setShowAddSport(false); setSelectedSportId(null); setSelectedLevel(5); }}
                style={{ flex: 1, backgroundColor: '#2A2A3A', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { if (selectedSportId) addSport(); }}
                disabled={!selectedSportId || isAddingSport || availableToAdd.length === 0}
                style={{
                  flex: 1,
                  backgroundColor: (selectedSportId && !isAddingSport) ? '#6C47FF' : '#6C47FF66',
                  borderRadius: 12, padding: 14, alignItems: 'center',
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
