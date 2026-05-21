import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LevelDots from '../../components/sports/LevelDots';
import AvatarInitials from '../../components/ui/AvatarInitials';
import EloBadge from '../../components/ui/EloBadge';
import api from '../../lib/api';
import type { UserProfile } from '../../types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['public-profile', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${id}/profile`);
      return data;
    },
    enabled: !!id,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}>

        {/* Back button */}
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#6C47FF', fontSize: 15, fontWeight: '600' }}>← Back</Text>
        </Pressable>

        {isLoading || !profile ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <ActivityIndicator color="#6C47FF" size="large" />
          </View>
        ) : (
          <>
            {/* Profile header */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <AvatarInitials displayName={profile.displayName} userId={profile.userId} size={76} />
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 12 }}>
                {profile.displayName}
              </Text>
            </View>

            {/* Sports */}
            <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Sports
            </Text>

            {profile.sports.length === 0 ? (
              <Text style={{ color: '#9B9BAE', fontSize: 14, marginBottom: 16 }}>No sports on this profile.</Text>
            ) : (
              profile.sports.map((s) => (
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

            {/* Coach Profiles */}
            {profile.coachProfiles.length > 0 && (
              <>
                <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 20 }}>
                  Coach
                </Text>
                {profile.coachProfiles.map((cp) => (
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
                      {cp.isVerified ? '✓ Verified Coach' : 'Pending verification'}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
