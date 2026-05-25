import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Trophy } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SessionCard from '../../components/sessions/SessionCard';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { usePendingSheetStore } from '../../stores/pendingSheetStore';
import type { GameSession, PendingResult } from '../../types';

interface ParticipantSession extends GameSession {
  role: 'HOST' | 'PLAYER';
}

export default function MyGamesScreen() {
  const { user } = useAuthStore();
  const { open: openPendingSheet } = usePendingSheetStore();

  const { data: sessions = [], isLoading } = useQuery<ParticipantSession[]>({
    queryKey: ['my-sessions', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/game-sessions/by-participant/${user!.id}`);
      return data.content ?? [];
    },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  const { data: pendingResults = [] } = useQuery<PendingResult[]>({
    queryKey: ['pending-results'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/users/me/pending-results');
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const activeNow = sessions
    .filter((s) => s.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const upcoming = sessions
    .filter((s) => s.status === 'OPEN' || s.status === 'FULL')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const past = sessions
    .filter((s) => s.status === 'COMPLETED' || s.status === 'CANCELLED')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
    );
  }

  type Section = { title: string; data: ParticipantSession[]; isLive?: boolean };
  const sections: Section[] = [
    ...(activeNow.length > 0 ? [{ title: 'Active Now', data: activeNow, isLive: true }] : []),
    { title: `Upcoming (${upcoming.length})`, data: upcoming },
    { title: `Past (${past.length})`, data: past },
  ];

  const ListHeader = pendingResults.length > 0 ? (
    <TouchableOpacity
      onPress={openPendingSheet}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B',
        borderWidth: 0.5,
        borderColor: '#FDE68A',
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 12,
      }}
    >
      <Trophy size={20} color="#F59E0B" style={{ flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>
          Results pending
        </Text>
        <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
          {pendingResults.length === 1
            ? '1 game needs your attention'
            : `${pendingResults.length} games need your attention`}
        </Text>
      </View>
      <ChevronRight size={16} color="#D97706" style={{ flexShrink: 0 }} />
    </TouchableOpacity>
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Text style={{ color: '#0D0D14', fontSize: 28, fontWeight: '700' }}>My Games</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
        ListHeaderComponent={ListHeader}
        renderItem={({ item: section }) => (
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              {section.isLive && (
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' }} />
              )}
              <Text style={{ color: section.isLive ? '#EF4444' : '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {section.title}
              </Text>
            </View>
            {section.data.length === 0 && section.title.startsWith('Upcoming') ? (
              <View style={{
                backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
                alignItems: 'center',
              }}>
                <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
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
                  hostDisplayName={s.hostDisplayName}
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
