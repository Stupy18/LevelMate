import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import LevelDots from '../../components/sports/LevelDots';
import Avatar from '../../components/ui/Avatar';
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

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}>

        {/* Back button */}
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <ChevronLeft size={20} color="#6C47FF" />
          <Text style={{ color: '#6C47FF', fontSize: 15, fontWeight: '600' }}>Back</Text>
        </Pressable>

        {isLoading || !profile ? (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <ActivityIndicator color="#6C47FF" size="large" />
          </View>
        ) : (
          <>
            {/* Profile header */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <Avatar displayName={profile.displayName} userId={profile.userId} avatarData={profile.avatarData} size={76} />
              <Text style={{ color: '#0D0D14', fontSize: 22, fontWeight: '700', marginTop: 12 }}>
                {profile.displayName}
              </Text>
            </View>

            {/* Sports */}
            <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Sports
            </Text>

            {profile.sports.length === 0 ? (
              <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>No sports on this profile.</Text>
            ) : (
              profile.sports.map((s) => (
                <View key={s.sportId} style={cardStyle}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#0D0D14', fontSize: 15, fontWeight: '600' }}>{s.sportName}</Text>
                    {s.ratingType === 'ELO_COMPETITIVE' && s.eloRating != null && (
                      <EloBadge elo={s.eloRating} />
                    )}
                  </View>
                  {s.level != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <LevelDots level={s.level} newPlayer={s.gamesPlayed === 0} />
                      <Text style={{ color: '#6B7280', fontSize: 12 }}>Level {s.level}/10</Text>
                    </View>
                  )}
                  {s.ratingType === 'GRADE_BASED' && s.grade && (
                    <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 4 }}>Grade: {s.grade}</Text>
                  )}
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{s.gamesPlayed} game{s.gamesPlayed === 1 ? '' : 's'} played</Text>
                </View>
              ))
            )}

            {/* Coach Profiles */}
            {profile.coachProfiles.length > 0 && (
              <>
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 20 }}>
                  Coach
                </Text>
                {profile.coachProfiles.map((cp) => (
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
                      {cp.isVerified ? 'Verified Coach' : 'Pending verification'}
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
