import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import AvatarInitials from '../../components/ui/AvatarInitials';
import EloBadge from '../../components/ui/EloBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import api from '../../lib/api';
import { formatDuration, formatSessionDate } from '../../lib/format';
import { useAuthStore } from '../../stores/authStore';
import type { GameParticipant, GameResult, GameSession } from '../../types';

type WinnerTeam = 'TEAM_A' | 'TEAM_B' | 'DRAW';

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 20 }}>
      {label}
    </Text>
  );
}

function InfoRow({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <Text style={{ fontSize: 14, width: 20 }}>{icon}</Text>
      <Text style={{ color: '#FFFFFF', fontSize: 14, flex: 1 }}>{value}</Text>
    </View>
  );
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showResultModal, setShowResultModal] = useState(false);
  const [winner, setWinner] = useState<WinnerTeam>('TEAM_A');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');

  const { data: session, isLoading } = useQuery<GameSession>({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/game-sessions/${id}`);
      return data;
    },
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
    onError: (err: any) => Alert.alert('Cannot Join', err?.response?.data?.message ?? 'Failed to join.'),
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
    mutationFn: () =>
      api.post(`/api/v1/game-sessions/${id}/result`, {
        winnerTeam: winner,
        scoreTeamA: scoreA ? parseInt(scoreA, 10) : undefined,
        scoreTeamB: scoreB ? parseInt(scoreB, 10) : undefined,
      }),
    onSuccess: () => {
      setShowResultModal(false);
      invalidate();
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to report result.'),
  });

  const { mutate: confirmResult, isPending: isConfirming } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/result/confirm`),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to confirm.'),
  });

  const { mutate: disputeResult, isPending: isDisputing } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/result/dispute`),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to dispute.'),
  });

  if (isLoading || !session) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14', alignItems: 'center', justifyContent: 'center' }}>
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

  function openMaps() {
    if (session.locationLat != null && session.locationLng != null) {
      Linking.openURL(`https://maps.google.com/?q=${session.locationLat},${session.locationLng}`);
    }
  }

  function renderActionButtons() {
    const status = session.status;

    if (status === 'OPEN' && !isParticipant) {
      return (
        <Pressable
          onPress={() => joinGame()}
          disabled={isJoining}
          style={{ backgroundColor: isJoining ? '#6C47FF88' : '#6C47FF', borderRadius: 14, padding: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
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
          style={{ backgroundColor: '#EF444422', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' }}
        >
          <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700' }}>
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
              style={{ backgroundColor: isCompleting ? '#6C47FF88' : '#6C47FF', borderRadius: 14, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
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
            style={{ backgroundColor: '#EF444422', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' }}
          >
            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700' }}>
              {isCancelling ? 'Cancelling…' : 'Cancel Session'}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (status === 'COMPLETED' && isParticipant && !result) {
      return (
        <Pressable
          onPress={() => setShowResultModal(true)}
          style={{ backgroundColor: '#6C47FF', borderRadius: 14, padding: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Report Result</Text>
        </Pressable>
      );
    }

    if (status === 'COMPLETED' && result?.status === 'PENDING_CONFIRMATION' && !isReporter) {
      return (
        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() => confirmResult()}
            disabled={isConfirming}
            style={{ backgroundColor: isConfirming ? '#22C55E88' : '#22C55E', borderRadius: 14, padding: 16, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
              {isConfirming ? 'Confirming…' : 'Confirm Result'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => disputeResult()}
            disabled={isDisputing}
            style={{ backgroundColor: '#EF444422', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' }}
          >
            <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700' }}>
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
    const winnerLabel = result.winnerTeam === 'DRAW' ? 'Draw' : result.winnerTeam === 'TEAM_A' ? 'Team A wins' : 'Team B wins';
    return (
      <View style={{ backgroundColor: '#6C47FF22', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#6C47FF44', marginTop: 4 }}>
        <Text style={{ color: '#6C47FF', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
          Final Result
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800' }}>{winnerLabel}</Text>
        {result.scoreTeamA != null && result.scoreTeamB != null && (
          <Text style={{ color: '#9B9BAE', fontSize: 14, marginTop: 4 }}>
            {result.scoreTeamA} – {result.scoreTeamB}
          </Text>
        )}
      </View>
    );
  }

  const hostParticipant = session.participants?.find((p) => p.userId === session.hostUserId);
  const hostDisplayId = session.hostUserId.slice(0, 8);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14' }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}>

        {/* Back button */}
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ color: '#6C47FF', fontSize: 15, fontWeight: '600' }}>← Back</Text>
        </Pressable>

        {/* Header */}
        <View style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {session.sportName}
            </Text>
            <StatusBadge status={session.status as any} />
          </View>
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginBottom: 10 }}>
            {session.title ?? `${session.sportName} game`}
          </Text>
          <Pressable
            onPress={() => router.push(`/user/${session.hostUserId}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <AvatarInitials displayName={hostDisplayId} userId={session.hostUserId} size={28} />
            <Text style={{ color: '#9B9BAE', fontSize: 13 }}>Hosted by {hostDisplayId}</Text>
            {isHost && (
              <View style={{ backgroundColor: '#6C47FF33', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700' }}>YOU</Text>
              </View>
            )}
          </Pressable>
        </View>

        <SectionLabel label="Details" />
        <View style={{ backgroundColor: '#1A1A24', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2A2A3A' }}>
          <InfoRow icon="🗓" value={formatSessionDate(session.scheduledAt)} />
          {session.durationMinutes && <InfoRow icon="⏱" value={formatDuration(session.durationMinutes)} />}
          {session.locationName && <InfoRow icon="📍" value={session.locationName} />}
          {session.locationAddress && <InfoRow icon="🏠" value={session.locationAddress} />}
          {(session.locationLat != null && session.locationLng != null) && (
            <Pressable onPress={openMaps} style={{ marginTop: 4 }}>
              <Text style={{ color: '#6C47FF', fontSize: 13, fontWeight: '600' }}>Open in Maps →</Text>
            </Pressable>
          )}
          <InfoRow icon="🎯" value={levelLabel} />
          <InfoRow icon="👥" value={`${session.participantCount}/${session.maxPlayers} players · ${session.spotsRemaining} spot${session.spotsRemaining === 1 ? '' : 's'} left`} />
          {session.description && <InfoRow icon="📝" value={session.description} />}
        </View>

        {result?.status === 'CONFIRMED' && (
          <>
            <SectionLabel label="Result" />
            {renderResultSummary()}
          </>
        )}

        <SectionLabel label={`Players (${session.participants?.length ?? 0})`} />
        <View style={{ backgroundColor: '#1A1A24', borderRadius: 14, borderWidth: 1, borderColor: '#2A2A3A', overflow: 'hidden' }}>
          {(session.participants ?? []).map((p: GameParticipant, idx: number) => {
            const shortId = p.userId.slice(0, 8);
            const isThisHost = p.userId === session.hostUserId;
            const isMe = p.userId === user?.id;
            return (
              <Pressable
                key={p.participantId}
                onPress={() => router.push(`/user/${p.userId}`)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
                  borderTopWidth: idx === 0 ? 0 : 1, borderColor: '#2A2A3A',
                }}
              >
                <AvatarInitials displayName={shortId} userId={p.userId} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                    {shortId}{isMe ? ' (You)' : ''}
                  </Text>
                  <Text style={{ color: '#9B9BAE', fontSize: 12 }}>
                    {p.team ? p.team.replace('_', ' ') : 'No team'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  {isThisHost && (
                    <View style={{ backgroundColor: '#6C47FF33', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700' }}>HOST</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {(() => {
          const actionButtons = renderActionButtons();
          return actionButtons ? <View style={{ marginTop: 20 }}>{actionButtons}</View> : null;
        })()}
      </ScrollView>

      {/* Report Result Modal */}
      <Modal visible={showResultModal} transparent animationType="slide" onRequestClose={() => setShowResultModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1A1A24', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Report Result</Text>

            <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
              Winner
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['TEAM_A', 'DRAW', 'TEAM_B'] as WinnerTeam[]).map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setWinner(opt)}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, alignItems: 'center',
                    backgroundColor: winner === opt ? '#6C47FF' : '#2A2A3A',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>
                    {opt === 'TEAM_A' ? 'Team A' : opt === 'TEAM_B' ? 'Team B' : 'Draw'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
              Score (optional)
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: '#2A2A3A', color: '#FFFFFF', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 16 }}
                placeholder="Team A"
                placeholderTextColor="#9B9BAE"
                keyboardType="numeric"
                maxLength={3}
                value={scoreA}
                onChangeText={setScoreA}
              />
              <Text style={{ color: '#9B9BAE', fontSize: 18, alignSelf: 'center' }}>–</Text>
              <TextInput
                style={{ flex: 1, backgroundColor: '#2A2A3A', color: '#FFFFFF', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 16 }}
                placeholder="Team B"
                placeholderTextColor="#9B9BAE"
                keyboardType="numeric"
                maxLength={3}
                value={scoreB}
                onChangeText={setScoreB}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => setShowResultModal(false)}
                style={{ flex: 1, backgroundColor: '#2A2A3A', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => reportResult()}
                disabled={isReporting}
                style={{ flex: 1, backgroundColor: isReporting ? '#6C47FF88' : '#6C47FF', borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>
                  {isReporting ? 'Submitting…' : 'Submit Result'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
