import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_H = Dimensions.get('window').height;
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  Clock,
  FileText,
  Home,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import Avatar from '../../components/ui/Avatar';
import ConflictModal from '../../components/modals/ConflictModal';
import StatusBadge from '../../components/ui/StatusBadge';
import api from '../../lib/api';
import { formatDuration, formatSessionDate } from '../../lib/format';
import { useAuthStore } from '../../stores/authStore';
import type { ConflictingSession, GameParticipant, GameResult, GameSession } from '../../types';

type WinnerTeam = 'TEAM_A' | 'TEAM_B' | 'DRAW';
type LucideIconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 20 }}>
      {label}
    </Text>
  );
}

function InfoRow({ Icon, value }: { Icon: LucideIconComponent; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
      <View style={{ marginTop: 2 }}>
        <Icon size={16} color="#9CA3AF" />
      </View>
      <Text style={{ color: '#0D0D14', fontSize: 14, flex: 1 }}>{value}</Text>
    </View>
  );
}

function shortName(displayName: string): string {
  const parts = displayName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { bottom: safeBottom } = useSafeAreaInsets();

  const [showResultModal, setShowResultModal] = useState(false);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [autoAssignNotice, setAutoAssignNotice] = useState<string | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [conflictingSession, setConflictingSession] = useState<ConflictingSession | null>(null);
  const [resultSubmittedLocally, setResultSubmittedLocally] = useState(false);

  const { data: session, isLoading } = useQuery<GameSession>({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/game-sessions/${id}`);
      return data;
    },
    refetchInterval: 15_000,
  });

  const { data: result } = useQuery<GameResult | null>({
    queryKey: ['session-result', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/api/v1/game-sessions/${id}/result`);
        return data;
      } catch {
        return null;
      }
    },
    enabled: session?.status === 'COMPLETED',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['session', id] });
    queryClient.invalidateQueries({ queryKey: ['session-result', id] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
  };

  const { mutate: joinGame, isPending: isJoining } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/join`),
    onSuccess: invalidate,
    onError: (err: any) => {
      const errorCode = err?.response?.data?.errorCode;
      if (errorCode === 'TIME_CONFLICT') {
        setConflictingSession(err.response.data.conflictingSession);
        return;
      }
      Alert.alert('Cannot Join', err?.response?.data?.message ?? 'Failed to join.');
    },
  });

  const { mutate: leaveGame, isPending: isLeaving } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/leave`),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Cannot Leave', err?.response?.data?.message ?? 'Failed to leave.'),
  });

  const { mutate: cancelSession, isPending: isCancelling } = useMutation({
    mutationFn: () => api.patch(`/api/v1/game-sessions/${id}/status`, { status: 'CANCELLED' }),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel.'),
  });

  const { mutate: completeSession, isPending: isCompleting } = useMutation({
    mutationFn: () => api.patch(`/api/v1/game-sessions/${id}/status`, { status: 'COMPLETED' }),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to mark as completed.'),
  });

  const { mutate: reportResult, isPending: isReporting } = useMutation({
    mutationFn: ({ winnerTeam, scoreTeamA, scoreTeamB }: {
      winnerTeam: WinnerTeam;
      scoreTeamA?: number;
      scoreTeamB?: number;
    }) =>
      api.post(`/api/v1/game-sessions/${id}/result`, { winnerTeam, scoreTeamA, scoreTeamB }),
    onSuccess: () => {
      setResultSubmittedLocally(true);
      setShowResultModal(false);
      setScoreA('');
      setScoreB('');
      setAutoAssignNotice(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to report result.'),
  });

  const { mutate: confirmResult, isPending: isConfirming } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/result/confirm`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['elo-history'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to confirm.'),
  });

  const { mutate: disputeResult, isPending: isDisputing } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/result/dispute`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to dispute.'),
  });

  const { mutate: assignTeamMutation } = useMutation({
    mutationFn: ({ targetUserId, team }: { targetUserId: string; team: 'TEAM_A' | 'TEAM_B' | null }) =>
      api.patch(`/api/v1/game-sessions/${id}/participants/${targetUserId}/team`, { team }),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to assign team.'),
  });

  function handleAssignTeam(targetUserId: string, team: 'TEAM_A' | 'TEAM_B' | null) {
    if (!session) return;
    const participants = session.participants ?? [];
    const teamA = participants.filter(p => p.team === 'TEAM_A');
    const teamB = participants.filter(p => p.team === 'TEAM_B');
    const targetP = participants.find(p => p.userId === targetUserId);

    if (team !== 'TEAM_A' && targetP?.team === 'TEAM_A' && teamA.length === 1 && teamB.length > 0) {
      Alert.alert('Team Balance', 'Moving this player will leave Team A empty.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move Anyway', onPress: () => assignTeamMutation({ targetUserId, team }) },
      ]);
      return;
    }
    if (team !== 'TEAM_B' && targetP?.team === 'TEAM_B' && teamB.length === 1 && teamA.length > 0) {
      Alert.alert('Team Balance', 'Moving this player will leave Team B empty.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Move Anyway', onPress: () => assignTeamMutation({ targetUserId, team }) },
      ]);
      return;
    }

    assignTeamMutation({ targetUserId, team });
  }

  async function handleReportResultPressed() {
    if (!session) return;
    const participants = session.participants ?? [];
    const teamA = participants.filter(p => p.team === 'TEAM_A');
    const teamB = participants.filter(p => p.team === 'TEAM_B');
    const unassigned = participants.filter(p => p.team == null);

    if (unassigned.length > 0) {
      setIsAutoAssigning(true);
      try {
        const assignments: { userId: string; team: 'TEAM_A' | 'TEAM_B' }[] = [];
        let aCount = teamA.length;
        let bCount = teamB.length;
        for (const p of unassigned) {
          const t: 'TEAM_A' | 'TEAM_B' = aCount <= bCount ? 'TEAM_A' : 'TEAM_B';
          assignments.push({ userId: p.userId, team: t });
          if (t === 'TEAM_A') aCount++; else bCount++;
        }
        await Promise.all(
          assignments.map(({ userId, team }) =>
            api.patch(`/api/v1/game-sessions/${id}/participants/${userId}/team`, { team })
          )
        );
        await queryClient.refetchQueries({ queryKey: ['session', id] });
        setAutoAssignNotice(
          `${unassigned.length} unassigned player${unassigned.length !== 1 ? 's' : ''} distributed to teams automatically.`
        );
      } catch {
        Alert.alert('Error', 'Failed to auto-assign players. Please assign them to teams manually.');
        return;
      } finally {
        setIsAutoAssigning(false);
      }
    } else if (teamA.length === 0 || teamB.length === 0) {
      Alert.alert('Teams Needed', 'Both teams must have at least one player. Assign players to teams before reporting a result.');
      return;
    }

    setScoreA('');
    setScoreB('');
    setShowResultModal(true);
  }

  function closeResultModal() {
    setShowResultModal(false);
    setScoreA('');
    setScoreB('');
    setAutoAssignNotice(null);
  }

  if (isLoading || !session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
    );
  }

  const isHost = session.hostUserId === user?.id;
  const isParticipant = session.participants?.some((p) => p.userId === user?.id) ?? false;
  const isPast = new Date(session.scheduledAt) < new Date();
  const isReporter = result?.reportedByUserId === user?.id;

  const levelLabel =
    session.minLevel != null && session.maxLevel != null
      ? `Level ${session.minLevel}–${session.maxLevel}`
      : 'All levels';

  const canAssignTeams = isHost && (session.status === 'OPEN' || session.status === 'FULL') && !isPast;

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  } as const;

  function openMaps() {
    if (session.locationLat != null && session.locationLng != null) {
      Linking.openURL(`https://maps.google.com/?q=${session.locationLat},${session.locationLng}`);
    }
  }

  function renderParticipants() {
    const participants = session.participants ?? [];
    const teamA = participants.filter(p => p.team === 'TEAM_A');
    const teamB = participants.filter(p => p.team === 'TEAM_B');
    const unassigned = participants.filter(p => p.team == null);
    const hasAnyTeam = teamA.length > 0 || teamB.length > 0;

    if (canAssignTeams || hasAnyTeam) {
      return (
        <View>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
            <View style={{ flex: 1, backgroundColor: '#EDE9FF', borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
              <Text style={{ color: '#6C47FF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Team A ({teamA.length})
              </Text>
            </View>
            <View style={{ width: 78, backgroundColor: '#F2F3F7', borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
              <Text style={{ color: '#6B7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Bench {unassigned.length > 0 ? `(${unassigned.length})` : ''}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#FFF1E6', borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
              <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Team B ({teamB.length})
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {/* Team A column */}
            <View style={{ flex: 1, gap: 4 }}>
              {teamA.map(p => {
                const isMe = p.userId === user?.id;
                const isThisHost = p.userId === session.hostUserId;
                return (
                  <View
                    key={p.participantId}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#EDE9FF' }}
                  >
                    <Text style={{ color: '#0D0D14', fontSize: 12, fontWeight: '600', marginBottom: canAssignTeams ? 5 : 0 }} numberOfLines={1}>
                      {isThisHost ? '★ ' : ''}{shortName(p.displayName)}{isMe ? ' (you)' : ''}
                    </Text>
                    {canAssignTeams && (
                      <View style={{ flexDirection: 'row', gap: 3 }}>
                        <Pressable
                          onPress={() => handleAssignTeam(p.userId, null)}
                          style={{ flex: 1, backgroundColor: '#F2F3F7', borderRadius: 5, paddingVertical: 4, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#6B7280', fontSize: 10 }}>Bench</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleAssignTeam(p.userId, 'TEAM_B')}
                          style={{ width: 28, backgroundColor: '#FFF1E6', borderRadius: 5, paddingVertical: 4, alignItems: 'center' }}
                        >
                          <ArrowRight size={11} color="#FF6B35" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Bench / Unassigned column */}
            <View style={{ width: 78, gap: 4 }}>
              {unassigned.map(p => {
                const isMe = p.userId === user?.id;
                return (
                  <View
                    key={p.participantId}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 5, borderWidth: 1, borderColor: '#E5E7EB' }}
                  >
                    <Text
                      style={{ color: '#6B7280', fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: canAssignTeams ? 4 : 0 }}
                      numberOfLines={1}
                    >
                      {shortName(p.displayName).split(' ')[0]}{isMe ? '*' : ''}
                    </Text>
                    {canAssignTeams && (
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        <Pressable
                          onPress={() => handleAssignTeam(p.userId, 'TEAM_A')}
                          style={{ flex: 1, backgroundColor: '#EDE9FF', borderRadius: 4, paddingVertical: 4, alignItems: 'center' }}
                        >
                          <ArrowLeft size={10} color="#6C47FF" />
                        </Pressable>
                        <Pressable
                          onPress={() => handleAssignTeam(p.userId, 'TEAM_B')}
                          style={{ flex: 1, backgroundColor: '#FFF1E6', borderRadius: 4, paddingVertical: 4, alignItems: 'center' }}
                        >
                          <ArrowRight size={10} color="#FF6B35" />
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Team B column */}
            <View style={{ flex: 1, gap: 4 }}>
              {teamB.map(p => {
                const isMe = p.userId === user?.id;
                const isThisHost = p.userId === session.hostUserId;
                return (
                  <View
                    key={p.participantId}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#FFF1E6' }}
                  >
                    <Text style={{ color: '#0D0D14', fontSize: 12, fontWeight: '600', marginBottom: canAssignTeams ? 5 : 0, textAlign: 'right' }} numberOfLines={1}>
                      {shortName(p.displayName)}{isMe ? ' (you)' : ''}{isThisHost ? ' ★' : ''}
                    </Text>
                    {canAssignTeams && (
                      <View style={{ flexDirection: 'row', gap: 3, justifyContent: 'flex-end' }}>
                        <Pressable
                          onPress={() => handleAssignTeam(p.userId, 'TEAM_A')}
                          style={{ width: 28, backgroundColor: '#EDE9FF', borderRadius: 5, paddingVertical: 4, alignItems: 'center' }}
                        >
                          <ArrowLeft size={11} color="#6C47FF" />
                        </Pressable>
                        <Pressable
                          onPress={() => handleAssignTeam(p.userId, null)}
                          style={{ flex: 1, backgroundColor: '#F2F3F7', borderRadius: 5, paddingVertical: 4, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#6B7280', fontSize: 10 }}>Bench</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {canAssignTeams && (
            <Text style={{ color: '#9CA3AF', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              Use arrows to move players between teams
            </Text>
          )}
        </View>
      );
    }

    return (
      <View style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {participants.map((p, idx) => {
          const isThisHost = p.userId === session.hostUserId;
          const isMe = p.userId === user?.id;
          return (
            <Pressable
              key={p.participantId}
              onPress={() => router.push(`/user/${p.userId}`)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
                borderTopWidth: idx === 0 ? 0 : 1, borderColor: '#F2F3F7',
              }}
            >
              <Avatar displayName={p.displayName} userId={p.userId} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#0D0D14', fontSize: 14, fontWeight: '600' }}>
                  {p.displayName}{isMe ? ' (You)' : ''}
                </Text>
              </View>
              {isThisHost && (
                <View style={{ backgroundColor: '#EDE9FF', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700' }}>HOST</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderActionButtons() {
    const status = session.status;

    if (status === 'OPEN' && !isParticipant) {
      return (
        <Pressable
          onPress={() => joinGame()}
          disabled={isJoining}
          style={{ backgroundColor: isJoining ? '#6C47FFAA' : '#6C47FF', borderRadius: 24, padding: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            {isJoining ? 'Joining…' : 'Join Game'}
          </Text>
        </Pressable>
      );
    }

    if ((status === 'OPEN' || status === 'FULL') && isParticipant && !isHost) {
      return (
        <Pressable
          onPress={() => leaveGame()}
          disabled={isLeaving}
          style={{ backgroundColor: '#FEE2E2', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}
        >
          <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>
            {isLeaving ? 'Leaving…' : 'Leave Game'}
          </Text>
        </Pressable>
      );
    }

    if ((status === 'OPEN' || status === 'FULL') && isHost) {
      return (
        <View style={{ gap: 12 }}>
          {isPast && (
            <Pressable
              onPress={() => completeSession()}
              disabled={isCompleting}
              style={{ backgroundColor: isCompleting ? '#6C47FFAA' : '#6C47FF', borderRadius: 24, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                {isCompleting ? 'Saving…' : 'Mark as Completed'}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() =>
              Alert.alert('Cancel Session', 'This cannot be undone. Cancel this game?', [
                { text: 'Keep Game', style: 'cancel' },
                { text: 'Cancel Session', style: 'destructive', onPress: () => cancelSession() },
              ])
            }
            disabled={isCancelling}
            style={{ backgroundColor: '#FEE2E2', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}
          >
            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>
              {isCancelling ? 'Cancelling…' : 'Cancel Session'}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (status === 'COMPLETED' && isParticipant && !result && !resultSubmittedLocally) {
      return (
        <Pressable
          onPress={handleReportResultPressed}
          disabled={isAutoAssigning}
          style={{ backgroundColor: isAutoAssigning ? '#6C47FFAA' : '#6C47FF', borderRadius: 24, padding: 16, alignItems: 'center' }}
        >
          {isAutoAssigning ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Report Result</Text>
          )}
        </Pressable>
      );
    }

    if (status === 'COMPLETED' && result?.status === 'PENDING_CONFIRMATION' && !isReporter) {
      const participants = session.participants ?? [];
      const teamAPlayers = participants.filter(p => p.team === 'TEAM_A');
      const teamBPlayers = participants.filter(p => p.team === 'TEAM_B');
      const winnerLabel =
        result.winnerTeam === 'DRAW' ? 'Draw' :
        result.winnerTeam === 'TEAM_A' ? 'Team A wins' : 'Team B wins';
      const reporterParticipant = participants.find(p => p.userId === result.reportedByUserId);
      const reporterName = reporterParticipant ? shortName(reporterParticipant.displayName) : 'A player';

      return (
        <View style={{ gap: 12 }}>
          <View style={{ backgroundColor: '#F8F9FC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Reported Result
            </Text>
            <Text style={{ color: '#6B7280', fontSize: 13 }}>Reported by {reporterName}</Text>
            <Text style={{ color: '#0D0D14', fontSize: 20, fontWeight: '700' }}>{winnerLabel}</Text>
            {result.scoreTeamA != null && result.scoreTeamB != null && (
              <Text style={{ color: '#6B7280', fontSize: 14 }}>
                Score: {result.scoreTeamA} – {result.scoreTeamB}
              </Text>
            )}
            {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#EDE9FF', borderRadius: 10, padding: 10 }}>
                  <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                    Team A
                  </Text>
                  {teamAPlayers.length > 0
                    ? teamAPlayers.map(p => (
                        <Text key={p.participantId} style={{ color: '#0D0D14', fontSize: 12 }} numberOfLines={1}>
                          {shortName(p.displayName)}
                        </Text>
                      ))
                    : <Text style={{ color: '#9CA3AF', fontSize: 11 }}>No players</Text>
                  }
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFF1E6', borderRadius: 10, padding: 10 }}>
                  <Text style={{ color: '#FF6B35', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                    Team B
                  </Text>
                  {teamBPlayers.length > 0
                    ? teamBPlayers.map(p => (
                        <Text key={p.participantId} style={{ color: '#0D0D14', fontSize: 12 }} numberOfLines={1}>
                          {shortName(p.displayName)}
                        </Text>
                      ))
                    : <Text style={{ color: '#9CA3AF', fontSize: 11 }}>No players</Text>
                  }
                </View>
              </View>
            )}
            <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Do you agree with this result?</Text>
          </View>

          <Pressable
            onPress={() => confirmResult()}
            disabled={isConfirming}
            style={{ backgroundColor: isConfirming ? '#DCFCE7' : '#22C55E', borderRadius: 24, padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {isConfirming ? 'Confirming…' : 'Confirm Result'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => disputeResult()}
            disabled={isDisputing}
            style={{ backgroundColor: '#FEE2E2', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}
          >
            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>
              {isDisputing ? 'Disputing…' : 'Dispute Result'}
            </Text>
          </Pressable>
        </View>
      );
    }

    return null;
  }

  function renderResultSummary() {
    if (result?.status !== 'CONFIRMED') return null;
    const winnerLabel =
      result.winnerTeam === 'DRAW' ? 'Draw' :
      result.winnerTeam === 'TEAM_A' ? 'Team A wins' : 'Team B wins';
    return (
      <View style={{ backgroundColor: '#EDE9FF', borderRadius: 16, padding: 16, marginTop: 4 }}>
        <Text style={{ color: '#6C47FF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          Final Result
        </Text>
        <Text style={{ color: '#0D0D14', fontSize: 18, fontWeight: '700' }}>{winnerLabel}</Text>
        {result.scoreTeamA != null && result.scoreTeamB != null && (
          <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            {result.scoreTeamA} – {result.scoreTeamB}
          </Text>
        )}
      </View>
    );
  }

  const hostParticipant = session.participants?.find((p) => p.userId === session.hostUserId);
  const hostDisplayName = hostParticipant?.displayName ?? session.hostUserId.slice(0, 8);

  const modalTeamA = (session.participants ?? []).filter(p => p.team === 'TEAM_A');
  const modalTeamB = (session.participants ?? []).filter(p => p.team === 'TEAM_B');

  const derivedWinner: WinnerTeam | null = (() => {
    if (scoreA === '' || scoreB === '') return null;
    const a = parseInt(scoreA, 10);
    const b = parseInt(scoreB, 10);
    if (isNaN(a) || isNaN(b)) return null;
    if (a > b) return 'TEAM_A';
    if (b > a) return 'TEAM_B';
    return 'DRAW';
  })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}>

        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <ChevronLeft size={20} color="#6C47FF" />
          <Text style={{ color: '#6C47FF', fontSize: 15, fontWeight: '600' }}>Back</Text>
        </Pressable>

        <View style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {session.sportName}
            </Text>
            <StatusBadge status={session.status as any} />
          </View>
          <Text style={{ color: '#0D0D14', fontSize: 22, fontWeight: '700', marginBottom: 10 }}>
            {session.title ?? `${session.sportName} game`}
          </Text>
          <Pressable
            onPress={() => router.push(`/user/${session.hostUserId}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Avatar displayName={hostDisplayName} userId={session.hostUserId} size={28} />
            <Text style={{ color: '#6B7280', fontSize: 13 }}>Hosted by {hostDisplayName}</Text>
            {isHost && (
              <View style={{ backgroundColor: '#EDE9FF', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700' }}>YOU</Text>
              </View>
            )}
          </Pressable>
        </View>

        <SectionLabel label="Details" />
        <View style={cardStyle}>
          <InfoRow Icon={Calendar} value={formatSessionDate(session.scheduledAt)} />
          {session.durationMinutes ? <InfoRow Icon={Clock} value={formatDuration(session.durationMinutes)} /> : null}
          {session.locationName ? <InfoRow Icon={MapPin} value={session.locationName} /> : null}
          {session.locationAddress ? <InfoRow Icon={Home} value={session.locationAddress} /> : null}
          {(session.locationLat != null && session.locationLng != null) && (
            <Pressable onPress={openMaps} style={{ marginTop: 2, marginBottom: 6 }}>
              <Text style={{ color: '#6C47FF', fontSize: 13, fontWeight: '600' }}>Open in Maps</Text>
            </Pressable>
          )}
          <InfoRow Icon={TrendingUp} value={levelLabel} />
          <InfoRow Icon={Users} value={`${session.participantCount}/${session.maxPlayers} players · ${session.spotsRemaining} spot${session.spotsRemaining === 1 ? '' : 's'} left`} />
          {session.description ? <InfoRow Icon={FileText} value={session.description} /> : null}
        </View>

        {result?.status === 'CONFIRMED' && (
          <>
            <SectionLabel label="Result" />
            {renderResultSummary()}
          </>
        )}

        <SectionLabel label={`Players (${session.participants?.length ?? 0})`} />
        {renderParticipants()}

        {(() => {
          const actionButtons = renderActionButtons();
          return actionButtons ? <View style={{ marginTop: 20 }}>{actionButtons}</View> : null;
        })()}
      </ScrollView>

      {/* Report Result Modal */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="slide"
        onRequestClose={closeResultModal}
      >
        {/* KAV pushes the whole panel up when keyboard opens, keeping inputs visible */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          {/* Backdrop — absoluteFill so it doesn't participate in flex sizing */}
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}
            onPress={closeResultModal}
          />

          {/* Panel */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08, shadowRadius: 20, elevation: 24,
          }}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' }} />
            </View>

            {/* Title */}
            <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14 }}>
              <Text style={{ color: '#0D0D14', fontSize: 20, fontWeight: '700', marginBottom: 2 }}>Report Result</Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>Enter the final score — winner is determined automatically</Text>
            </View>

            {/* Score inputs */}
            <ScrollView
              style={{ maxHeight: SCREEN_H * 0.32 }}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {autoAssignNotice && (
                <View style={{ backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 12 }}>
                  <Text style={{ color: '#92400E', fontSize: 12 }}>{autoAssignNotice}</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                {/* Team A column */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  {derivedWinner === 'TEAM_A' ? (
                    <View style={{ backgroundColor: '#6C47FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>WINNER</Text>
                    </View>
                  ) : <View style={{ height: 25, marginBottom: 6 }} />}
                  <Text style={{ color: '#6C47FF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                    Team A
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 10, textAlign: 'center' }} numberOfLines={1}>
                    {modalTeamA.length > 0 ? modalTeamA.map(p => shortName(p.displayName)).join(' · ') : '—'}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: derivedWinner === 'TEAM_A' ? '#EDE9FF' : '#F8F9FC',
                      borderWidth: 1.5,
                      borderColor: derivedWinner === 'TEAM_A' ? '#6C47FF' : (scoreA ? '#6C47FF' : '#E5E7EB'),
                      borderRadius: 14, paddingVertical: 12, width: '100%',
                      textAlign: 'center', fontSize: 30, fontWeight: '700', color: '#0D0D14',
                    }}
                    placeholder="—"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="number-pad"
                    maxLength={3}
                    value={scoreA}
                    onChangeText={(t) => setScoreA(t.replace(/[^0-9]/g, ''))}
                  />
                </View>

                {/* vs / = (single char, never wraps) */}
                <View style={{ width: 32, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 12 }}>
                  {derivedWinner === 'DRAW' ? (
                    <View style={{ backgroundColor: '#FFFBEB', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                      <Text style={{ color: '#D97706', fontSize: 16, fontWeight: '700', lineHeight: 20 }} numberOfLines={1}>=</Text>
                    </View>
                  ) : (
                    <Text style={{ color: '#D1D5DB', fontSize: 16, fontWeight: '300' }}>vs</Text>
                  )}
                </View>

                {/* Team B column */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  {derivedWinner === 'TEAM_B' ? (
                    <View style={{ backgroundColor: '#FF6B35', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 6 }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>WINNER</Text>
                    </View>
                  ) : <View style={{ height: 25, marginBottom: 6 }} />}
                  <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                    Team B
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 10, textAlign: 'center' }} numberOfLines={1}>
                    {modalTeamB.length > 0 ? modalTeamB.map(p => shortName(p.displayName)).join(' · ') : '—'}
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: derivedWinner === 'TEAM_B' ? '#FFF1E6' : '#F8F9FC',
                      borderWidth: 1.5,
                      borderColor: derivedWinner === 'TEAM_B' ? '#FF6B35' : (scoreB ? '#FF6B35' : '#E5E7EB'),
                      borderRadius: 14, paddingVertical: 12, width: '100%',
                      textAlign: 'center', fontSize: 30, fontWeight: '700', color: '#0D0D14',
                    }}
                    placeholder="—"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="number-pad"
                    maxLength={3}
                    value={scoreB}
                    onChangeText={(t) => setScoreB(t.replace(/[^0-9]/g, ''))}
                  />
                </View>
              </View>

              {(!scoreA || !scoreB) && (
                <Text style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
                  Enter both scores to determine the winner
                </Text>
              )}
            </ScrollView>

            {/* Fixed footer — always visible */}
            <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: safeBottom > 0 ? safeBottom + 8 : 24 }}>
              <Pressable
                onPress={() => {
                  if (!derivedWinner || isReporting) return;
                  reportResult({
                    winnerTeam: derivedWinner,
                    scoreTeamA: scoreA ? parseInt(scoreA, 10) : undefined,
                    scoreTeamB: scoreB ? parseInt(scoreB, 10) : undefined,
                  });
                }}
                disabled={!derivedWinner || isReporting}
                style={{
                  backgroundColor: !derivedWinner ? '#E5E7EB' : isReporting ? '#6C47FFAA' : '#6C47FF',
                  borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 4,
                }}
              >
                <Text style={{ color: !derivedWinner ? '#9CA3AF' : '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                  {isReporting ? 'Submitting…' : 'Submit Result'}
                </Text>
              </Pressable>
              <Pressable onPress={closeResultModal} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConflictModal
        visible={conflictingSession !== null}
        conflictingSession={conflictingSession}
        onDismiss={() => setConflictingSession(null)}
      />
    </SafeAreaView>
  );
}
