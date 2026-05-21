import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SessionCard from '../../components/sessions/SessionCard';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { GameSession } from '../../types';

interface ParticipantSession extends GameSession {
  role: 'HOST' | 'PLAYER';
}

function isPast(s: GameSession) {
  return s.status === 'COMPLETED' || s.status === 'CANCELLED' || new Date(s.scheduledAt) < new Date();
}

export default function MyGamesScreen() {
  const { user } = useAuthStore();

  const { data: sessions = [], isLoading } = useQuery<ParticipantSession[]>({
    queryKey: ['my-sessions', user?.id],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/game-sessions', {
        params: { participantUserId: user?.id, size: 100 },
      });
      return data.content ?? data ?? [];
    },
    enabled: !!user?.id,
  });

  const upcoming = sessions
    .filter((s) => !isPast(s))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const past = sessions
    .filter((s) => isPast(s))
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
    );
  }

  type Section = { title: string; data: ParticipantSession[] };
  const sections: Section[] = [
    { title: `Upcoming (${upcoming.length})`, data: upcoming },
    { title: `Past (${past.length})`, data: past },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>My Games</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 }}
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: '#9B9BAE', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              {section.title}
            </Text>
            {section.data.length === 0 && section.title.startsWith('Upcoming') ? (
              <View style={{ backgroundColor: '#1A1A24', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#2A2A3A', alignItems: 'center' }}>
                <Text style={{ color: '#9B9BAE', fontSize: 14, textAlign: 'center' }}>
                  No upcoming games.{'\n'}Find one in Discover or create your own.
                </Text>
              </View>
            ) : (
              section.data.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onPress={() => router.push(`/session/${s.id}`)}
                  showHostBadge={s.hostUserId === user?.id}
                  hostDisplayName={s.hostUserId}
                  hostUserId={s.hostUserId}
                />
              ))
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
