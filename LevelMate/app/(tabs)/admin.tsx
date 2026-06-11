import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { formatSessionDate } from '../../lib/format';

interface ParticipantInfo {
  userId: string;
  displayName: string;
  team: string | null;
}

interface AdminDispute {
  sessionId: string;
  sportName: string;
  scheduledAt: string;
  locationName?: string;
  reportedByDisplayName: string;
  winnerTeam: string;
  scoreTeamA?: number;
  scoreTeamB?: number;
  counterReportedByDisplayName?: string;
  counterWinnerTeam?: string;
  counterScoreTeamA?: number;
  counterScoreTeamB?: number;
  participants: ParticipantInfo[];
}

function scoreLabel(winner: string, a?: number, b?: number) {
  const score = a != null && b != null ? ` (${a}–${b})` : '';
  return `${winner === 'TEAM_A' ? 'Team A wins' : winner === 'TEAM_B' ? 'Team B wins' : 'Draw'}${score}`;
}

function DisputeCard({ dispute }: { dispute: AdminDispute }) {
  const qc = useQueryClient();

  const resolve = useMutation({
    mutationFn: (body: { winnerTeam: string; scoreTeamA?: number; scoreTeamB?: number }) =>
      api.post(`/api/v1/admin/disputes/${dispute.sessionId}/resolve`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-disputes'] }),
    onError: () => Alert.alert('Error', 'Failed to resolve dispute.'),
  });

  function confirmResolve(label: string, winnerTeam: string, scoreTeamA?: number, scoreTeamB?: number) {
    Alert.alert(
      'Confirm resolution',
      `Set result to: ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => resolve.mutate({ winnerTeam, scoreTeamA, scoreTeamB }) },
      ]
    );
  }

  const teamANames = dispute.participants
    .filter(p => p.team === 'TEAM_A')
    .map(p => p.displayName)
    .join(', ') || '—';
  const teamBNames = dispute.participants
    .filter(p => p.team === 'TEAM_B')
    .map(p => p.displayName)
    .join(', ') || '—';

  return (
    <View style={{ backgroundColor: '#1A1A24', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{dispute.sportName}</Text>
        <Text style={{ color: '#9B9BAE', fontSize: 12 }}>{formatSessionDate(dispute.scheduledAt)}</Text>
      </View>
      {dispute.locationName && (
        <Text style={{ color: '#9B9BAE', fontSize: 12, marginBottom: 8 }}>{dispute.locationName}</Text>
      )}

      {/* Teams */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: '#2A2A3A', borderRadius: 8, padding: 10 }}>
          <Text style={{ color: '#9B9BAE', fontSize: 11, marginBottom: 4 }}>TEAM A</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{teamANames}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#2A2A3A', borderRadius: 8, padding: 10 }}>
          <Text style={{ color: '#9B9BAE', fontSize: 11, marginBottom: 4 }}>TEAM B</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{teamBNames}</Text>
        </View>
      </View>

      {/* Versions */}
      <Text style={{ color: '#9B9BAE', fontSize: 12, marginBottom: 6 }}>Reported versions:</Text>

      <View style={{ backgroundColor: '#6C47FF22', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <Text style={{ color: '#9B9BAE', fontSize: 11 }}>{dispute.reportedByDisplayName} reported:</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 2 }}>
          {scoreLabel(dispute.winnerTeam, dispute.scoreTeamA, dispute.scoreTeamB)}
        </Text>
      </View>

      {dispute.counterWinnerTeam && (
        <View style={{ backgroundColor: '#FF6B3522', borderRadius: 8, padding: 10, marginBottom: 12 }}>
          <Text style={{ color: '#9B9BAE', fontSize: 11 }}>{dispute.counterReportedByDisplayName} counter-reported:</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', marginTop: 2 }}>
            {scoreLabel(dispute.counterWinnerTeam, dispute.counterScoreTeamA, dispute.counterScoreTeamB)}
          </Text>
        </View>
      )}

      {/* Resolve buttons */}
      <Text style={{ color: '#9B9BAE', fontSize: 12, marginBottom: 8 }}>Choose the result to keep:</Text>
      <TouchableOpacity
        onPress={() => confirmResolve(
          scoreLabel(dispute.winnerTeam, dispute.scoreTeamA, dispute.scoreTeamB),
          dispute.winnerTeam, dispute.scoreTeamA, dispute.scoreTeamB
        )}
        style={{ backgroundColor: '#6C47FF', borderRadius: 8, padding: 12, marginBottom: 8, alignItems: 'center' }}
        disabled={resolve.isPending}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
          Keep {dispute.reportedByDisplayName}'s version
        </Text>
      </TouchableOpacity>

      {dispute.counterWinnerTeam && (
        <TouchableOpacity
          onPress={() => confirmResolve(
            scoreLabel(dispute.counterWinnerTeam!, dispute.counterScoreTeamA, dispute.counterScoreTeamB),
            dispute.counterWinnerTeam!, dispute.counterScoreTeamA, dispute.counterScoreTeamB
          )}
          style={{ backgroundColor: '#FF6B35', borderRadius: 8, padding: 12, alignItems: 'center' }}
          disabled={resolve.isPending}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Keep {dispute.counterReportedByDisplayName}'s version
          </Text>
        </TouchableOpacity>
      )}

      {resolve.isPending && (
        <ActivityIndicator color="#6C47FF" style={{ marginTop: 12 }} />
      )}
    </View>
  );
}

export default function AdminScreen() {
  const [tab, setTab] = useState<'disputes' | 'sessions'>('disputes');

  const { data: disputes = [], isLoading: loadingDisputes } = useQuery<AdminDispute[]>({
    queryKey: ['admin-disputes'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/admin/disputes');
      return data;
    },
    enabled: tab === 'disputes',
  });

  const { data: sessionsPage, isLoading: loadingSessions } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/admin/sessions?page=0&size=50');
      return data;
    },
    enabled: tab === 'sessions',
  });

  const sessions = sessionsPage?.content ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>Admin</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 8 }}>
        {(['disputes', 'sessions'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: tab === t ? '#6C47FF' : '#1A1A24',
            }}
          >
            <Text style={{ color: tab === t ? '#FFFFFF' : '#9B9BAE', fontWeight: '600', textTransform: 'capitalize' }}>
              {t === 'disputes' ? `Disputes${disputes.length ? ` (${disputes.length})` : ''}` : 'All Sessions'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === 'disputes' && (
        loadingDisputes ? (
          <ActivityIndicator color="#6C47FF" style={{ marginTop: 40 }} />
        ) : disputes.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: '#9B9BAE', fontSize: 16 }}>No disputed matches</Text>
          </View>
        ) : (
          <FlatList
            data={disputes}
            keyExtractor={(d) => d.sessionId}
            renderItem={({ item }) => <DisputeCard dispute={item} />}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          />
        )
      )}

      {tab === 'sessions' && (
        loadingSessions ? (
          <ActivityIndicator color="#6C47FF" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(s: any) => s.id}
            renderItem={({ item: s }: { item: any }) => (
              <View style={{ backgroundColor: '#1A1A24', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{s.sportName}</Text>
                  <Text style={{
                    color: s.status === 'DISPUTED' ? '#EF4444' : s.status === 'COMPLETED' ? '#22C55E' : '#9B9BAE',
                    fontSize: 12, fontWeight: '600'
                  }}>
                    {s.status}
                  </Text>
                </View>
                <Text style={{ color: '#9B9BAE', fontSize: 12 }}>{formatSessionDate(s.scheduledAt)}</Text>
                {s.locationName && (
                  <Text style={{ color: '#9B9BAE', fontSize: 12 }}>{s.locationName}</Text>
                )}
                <Text style={{ color: '#9B9BAE', fontSize: 12 }}>
                  {s.participantCount}/{s.maxPlayers} players
                </Text>
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          />
        )
      )}
    </SafeAreaView>
  );
}
