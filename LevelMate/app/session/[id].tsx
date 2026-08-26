import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import Avatar from '../../components/ui/Avatar';
import DurationInput from '../../components/sports/DurationInput';
import ConflictModal from '../../components/modals/ConflictModal';
import StatusBadge from '../../components/ui/StatusBadge';
import ScreenBackground from '../../components/ui/ScreenBackground';
import api from '../../lib/api';
import { formatDuration, formatSessionDate } from '../../lib/format';
import { hapticError, hapticMedium, hapticSuccess, hapticWarning } from '../../lib/haptics';
import { useAuthStore } from '../../stores/authStore';
import type { ConflictingSession, GameParticipant, GameResult, GameSession, PendingResult } from '../../types';

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
  const [resultModalMode, setResultModalMode] = useState<'report' | 'dispute'>('report');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [autoAssignNotice, setAutoAssignNotice] = useState<string | null>(null);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [conflictingSession, setConflictingSession] = useState<ConflictingSession | null>(null);
  const [resultSubmittedLocally, setResultSubmittedLocally] = useState(false);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [rebalanceParticipants, setRebalanceParticipants] = useState<GameParticipant[]>([]);
  const [isSavingRebalance, setIsSavingRebalance] = useState(false);
  const [showPbSheet, setShowPbSheet] = useState(false);
  const [pbDraft, setPbDraft] = useState<Record<string, string>>({});

  const { data: session, isLoading } = useQuery<GameSession>({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/game-sessions/${id}`);
      return data;
    },
    refetchInterval: 15_000,
  });

  const { data: result, isLoading: isResultLoading } = useQuery<GameResult | null>({
    queryKey: ['session-result', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/api/v1/game-sessions/${id}/result`);
        return data;
      } catch (err: any) {
        if (err?.response?.status === 404) return null; // no result yet
        throw err; // network / server errors — let TanStack retry
      }
    },
    enabled: session?.status === 'COMPLETED' && (session?.ratingType === 'ELO_COMPETITIVE' || session?.ratingType == null),
    retry: 2,
    staleTime: 0,
    refetchInterval: 15_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['session', id] });
    queryClient.invalidateQueries({ queryKey: ['session-result', id] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
  };

  // Instantly drops this session from the pending-reminders list so the sheet/banner
  // updates the moment the user acts, instead of waiting for the next 60s poll.
  const removeFromPendingResults = () => {
    queryClient.setQueryData<PendingResult[]>(['pending-results'], (old) =>
      (old ?? []).filter((r) => r.sessionId !== id)
    );
  };

  const { mutate: joinGame, isPending: isJoining } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/join`),
    onSuccess: () => { hapticSuccess(); invalidate(); },
    onError: (err: any) => {
      const errorCode = err?.response?.data?.errorCode;
      if (errorCode === 'TIME_CONFLICT') {
        hapticWarning();
        setConflictingSession(err.response.data.conflictingSession);
        return;
      }
      hapticError();
      Alert.alert('Cannot Join', err?.response?.data?.message ?? 'Failed to join.');
    },
  });

  const { mutate: leaveGame, isPending: isLeaving } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/leave`),
    onSuccess: () => { hapticSuccess(); invalidate(); },
    onError: (err: any) => Alert.alert('Cannot Leave', err?.response?.data?.message ?? 'Failed to leave.'),
  });

  const { mutate: cancelSession, isPending: isCancelling } = useMutation({
    mutationFn: () => api.patch(`/api/v1/game-sessions/${id}/status`, { status: 'CANCELLED' }),
    onSuccess: invalidate,
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to cancel.'),
  });

  const { mutate: completeSession, isPending: isCompleting } = useMutation({
    mutationFn: () => api.patch(`/api/v1/game-sessions/${id}/status`, { status: 'COMPLETED' }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to mark as completed.'),
  });

  const { mutate: reportResult, isPending: isReporting } = useMutation({
    mutationFn: ({ winnerTeam, scoreTeamA, scoreTeamB }: {
      winnerTeam: WinnerTeam;
      scoreTeamA?: number;
      scoreTeamB?: number;
    }) =>
      api.post(`/api/v1/game-sessions/${id}/result`, { winnerTeam, scoreTeamA, scoreTeamB }),
    onMutate: removeFromPendingResults,
    onSuccess: () => {
      hapticSuccess();
      setResultSubmittedLocally(true);
      setShowResultModal(false);
      setScoreA('');
      setScoreB('');
      setAutoAssignNotice(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
    },
    onError: (err: any) => { hapticError(); Alert.alert('Error', err?.response?.data?.message ?? 'Failed to report result.'); },
  });

  const { mutate: confirmResult, isPending: isConfirming } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/result/confirm`),
    onMutate: removeFromPendingResults,
    onSuccess: () => {
      hapticSuccess();
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['elo-history'] });
    },
    onError: (err: any) => { hapticError(); Alert.alert('Error', err?.response?.data?.message ?? 'Failed to confirm.'); },
  });

  const { mutate: disputeResult, isPending: isDisputing } = useMutation({
    mutationFn: ({ winnerTeam, scoreTeamA, scoreTeamB }: {
      winnerTeam: WinnerTeam;
      scoreTeamA?: number;
      scoreTeamB?: number;
    }) =>
      api.post(`/api/v1/game-sessions/${id}/result/dispute`, { winnerTeam, scoreTeamA, scoreTeamB }),
    onMutate: removeFromPendingResults,
    onSuccess: () => {
      setResultSubmittedLocally(true);
      setShowResultModal(false);
      setScoreA('');
      setScoreB('');
      setAutoAssignNotice(null);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to dispute.'),
  });

  const { mutate: rejectEscalate, isPending: isRejecting } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/result/dispute`),
    onMutate: removeFromPendingResults,
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to escalate.'),
  });

  const { mutate: acceptCounter, isPending: isAccepting } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/result/accept-counter`),
    onMutate: removeFromPendingResults,
    onSuccess: () => {
      hapticSuccess();
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['elo-history'] });
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to accept counter.'),
  });

  const { data: canRebalanceData } = useQuery<{ canRebalance: boolean; reason: string }>({
    queryKey: ['can-rebalance', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/game-sessions/${id}/can-rebalance`);
      return data;
    },
    enabled: !!id && session?.status === 'COMPLETED' && result === null &&
             (session?.participants?.some(p => p.userId === user?.id) ?? false),
    staleTime: 30_000,
  });

  const isPerformanceSport = session?.ratingType === 'PERFORMANCE_BASED';
  const myParticipantGlobal = session?.participants?.find(p => p.userId === user?.id);
  const isParticipantEarly = session?.participants?.some(p => p.userId === user?.id) ?? false;
  const showPbPrompt = isPerformanceSport && session?.status === 'COMPLETED' && isParticipantEarly &&
                       myParticipantGlobal?.pbUpdateSubmitted === false;

  const { data: pbSportMetrics = [] } = useQuery({
    queryKey: ['sport-metrics', session?.sportId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/sports/${session!.sportId}/metrics`);
      return data as { id: string; metricKey: string; label: string; inputType: string; unit?: string | null }[];
    },
    enabled: showPbPrompt,
  });

  const { data: pbUserProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${user!.id}/profile`);
      return data as { sports: { sportId: string; metrics: { metricKey: string; value: string | null }[] }[] };
    },
    enabled: showPbPrompt,
    staleTime: 60_000,
  });

  const currentPbValues: Record<string, string> = (() => {
    if (!pbUserProfile || !session) return {};
    const sportEntry = pbUserProfile.sports.find((s: any) => s.sportId === session.sportId);
    const vals: Record<string, string> = {};
    sportEntry?.metrics?.forEach((m: any) => { if (m.value != null) vals[m.metricKey] = String(m.value); });
    return vals;
  })();

  const { mutate: markPbSubmitted, isPending: isMarkingPb } = useMutation({
    mutationFn: () => api.post(`/api/v1/game-sessions/${id}/pb-submitted`),
    onMutate: removeFromPendingResults,
    onSuccess: () => {
      hapticSuccess();
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      setShowPbSheet(false);
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to submit.'),
  });

  const { mutate: savePbResults, isPending: isSavingPb } = useMutation({
    mutationFn: async () => {
      const metrics = pbSportMetrics
        .filter(m => pbDraft[m.metricKey]?.trim())
        .map(m => ({ metricKey: m.metricKey, value: pbDraft[m.metricKey].trim() }));
      if (metrics.length > 0) {
        await api.put(`/api/v1/users/${user!.id}/sports/${session!.sportId}`, { metrics });
      }
      await api.post(`/api/v1/game-sessions/${id}/pb-submitted`);
    },
    onMutate: removeFromPendingResults,
    onSuccess: () => {
      hapticSuccess();
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['pending-results'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setShowPbSheet(false);
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save results.'),
  });

  const { mutate: acknowledgeSession } = useMutation({
    mutationFn: () => api.patch(`/api/v1/game-sessions/${id}/acknowledge`),
    onMutate: removeFromPendingResults,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pending-results'] }),
  });

  useEffect(() => {
    const isGradeCompleted = session?.status === 'COMPLETED' && session?.ratingType === 'GRADE_BASED';
    const isAutoCancelled = session?.status === 'CANCELLED' && session?.cancellationReasonInsufficientPlayers === true;
    if ((isGradeCompleted || isAutoCancelled) && isParticipantEarly && myParticipantGlobal?.sessionAcknowledged === false) {
      acknowledgeSession();
    }
  }, [session?.id, session?.status, session?.ratingType, session?.cancellationReasonInsufficientPlayers, myParticipantGlobal?.sessionAcknowledged]);

  const pbValuesKey = JSON.stringify(currentPbValues);
  useEffect(() => {
    if (showPbSheet && Object.keys(currentPbValues).length > 0) {
      setPbDraft(prev => {
        const merged = { ...currentPbValues };
        Object.keys(prev).forEach(k => { if (prev[k] !== currentPbValues[k]) merged[k] = prev[k]; });
        return merged;
      });
    }
    if (!showPbSheet) setPbDraft({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPbSheet, pbValuesKey]);

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
      hapticWarning();
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
    setResultModalMode('report');
  }

  function openRebalanceModal() {
    const participants = session?.participants ?? [];
    setRebalanceParticipants([...participants]);
    setShowRebalanceModal(true);
    const teamA = participants.filter(p => p.team === 'TEAM_A');
    const teamB = participants.filter(p => p.team === 'TEAM_B');
    if (teamA.length === 0 || teamB.length === 0) {
      setTimeout(() => {
        hapticWarning();
        Alert.alert(
          'Unbalanced Teams',
          'Teams are currently unbalanced. Move at least one player to each team before confirming.'
        );
      }, 300);
    }
  }

  function rebalanceMovePlayer(userId: string, toTeam: 'TEAM_A' | 'TEAM_B') {
    setRebalanceParticipants(prev => {
      const target = prev.find(p => p.userId === userId);
      if (!target || target.team === toTeam) return prev;
      const fromTeam = target.team;
      if (fromTeam === 'TEAM_A' || fromTeam === 'TEAM_B') {
        const sameTeam = prev.filter(p => p.team === fromTeam);
        if (sameTeam.length === 1) {
          hapticWarning();
          Alert.alert('Cannot Move', `At least one player must remain on ${fromTeam === 'TEAM_A' ? 'Team A' : 'Team B'}.`);
          return prev;
        }
      }
      hapticMedium();
      return prev.map(p => p.userId === userId ? { ...p, team: toTeam } : p);
    });
  }

  async function confirmRebalance() {
    const rTeamA = rebalanceParticipants.filter(p => p.team === 'TEAM_A');
    const rTeamB = rebalanceParticipants.filter(p => p.team === 'TEAM_B');
    if (rTeamA.length === 0 || rTeamB.length === 0) {
      hapticWarning();
      Alert.alert('Unbalanced Teams', 'Each team must have at least one player before confirming.');
      return;
    }
    const original = session?.participants ?? [];
    const changed = rebalanceParticipants.filter(rp => {
      const orig = original.find(p => p.userId === rp.userId);
      return orig?.team !== rp.team;
    });
    setIsSavingRebalance(true);
    try {
      if (changed.length > 0) {
        await Promise.all(
          changed.map(p =>
            api.patch(`/api/v1/game-sessions/${id}/participants/${p.userId}/team`, { team: p.team })
          )
        );
      }
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['can-rebalance', id] });
      setShowRebalanceModal(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save team changes.');
    } finally {
      setIsSavingRebalance(false);
    }
  }

  if (isLoading || !session) {
    return (
      <ScreenBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
      </ScreenBackground>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  } as const;

  function openMaps() {
    const s = session!;
    if (s.locationLat == null || s.locationLng == null) return;
    const lat = s.locationLat;
    const lng = s.locationLng;
    const url = Platform.OS === 'ios'
      ? `maps://?q=${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)
    );
  }

  function renderParticipants() {
    const s = session!;
    const participants = s.participants ?? [];
    const isEloCompetitive = s.ratingType === 'ELO_COMPETITIVE' || s.ratingType == null;
    const teamA = participants.filter(p => p.team === 'TEAM_A');
    const teamB = participants.filter(p => p.team === 'TEAM_B');
    const unassigned = participants.filter(p => p.team == null);
    const hasAnyTeam = teamA.length > 0 || teamB.length > 0;

    if (isEloCompetitive && (canAssignTeams || hasAnyTeam)) {
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
                const isThisHost = p.userId === s.hostUserId;
                return (
                  <View
                    key={p.participantId}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#EDE9FF' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: canAssignTeams ? 5 : 0 }}>
                      {p.isCapt && <Shield size={10} color="#6C47FF" />}
                      <Text style={{ color: '#0D0D14', fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {isThisHost ? '★ ' : ''}{shortName(p.displayName)}{isMe ? ' (you)' : ''}
                      </Text>
                    </View>
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
                const isThisHost = p.userId === s.hostUserId;
                return (
                  <View
                    key={p.participantId}
                    style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#FFF1E6' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginBottom: canAssignTeams ? 5 : 0 }}>
                      <Text style={{ color: '#0D0D14', fontSize: 12, fontWeight: '600', flex: 1, textAlign: 'right' }} numberOfLines={1}>
                        {shortName(p.displayName)}{isMe ? ' (you)' : ''}{isThisHost ? ' ★' : ''}
                      </Text>
                      {p.isCapt && <Shield size={10} color="#FF6B35" />}
                    </View>
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
          const isThisHost = p.userId === s.hostUserId;
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
    const s = session!;
    const status = s.status;

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
          {isPast && s.participantCount >= s.minPlayers && (
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

    if (status === 'COMPLETED' && isResultLoading) return null;

    // PERFORMANCE_BASED: PB update prompt
    if (status === 'COMPLETED' && showPbPrompt) {
      return (
        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#BBF7D0', gap: 12 }}>
          <Text style={{ color: '#166534', fontSize: 15, fontWeight: '700' }}>Did you set a new PB?</Text>
          <Text style={{ color: '#166534', fontSize: 13, lineHeight: 20 }}>
            Update your personal bests from this session.
          </Text>
          <Pressable
            onPress={() => {
              setPbDraft({ ...currentPbValues });
              setShowPbSheet(true);
            }}
            style={{ backgroundColor: '#22C55E', borderRadius: 24, padding: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Save My Results</Text>
          </Pressable>
          <Pressable
            onPress={() => markPbSubmitted()}
            disabled={isMarkingPb}
            style={{ alignItems: 'center', paddingVertical: 4 }}
          >
            <Text style={{ color: '#6B7280', fontSize: 13 }}>
              {isMarkingPb ? 'Saving…' : 'Nothing to update'}
            </Text>
          </Pressable>
        </View>
      );
    }

    // Non-ELO completed: no result reporting
    if (status === 'COMPLETED' && s.ratingType !== 'ELO_COMPETITIVE' && s.ratingType != null) {
      return null;
    }

    // No result yet — captains see Review Teams option, all participants can report (ELO only)
    if (status === 'COMPLETED' && isParticipant && !result && !resultSubmittedLocally) {
      return (
        <View style={{ gap: 12 }}>
          {canRebalanceData?.canRebalance && (
            <Pressable
              onPress={openRebalanceModal}
              style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#6C47FF' }}
            >
              <Text style={{ color: '#6C47FF', fontSize: 16, fontWeight: '600' }}>Review Teams</Text>
            </Pressable>
          )}
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
        </View>
      );
    }

    // ── State: PENDING_CONFIRMATION ──────────────────────────────────────────
    if (status === 'COMPLETED' && result?.status === 'PENDING_CONFIRMATION') {
      const participants = s.participants ?? [];
      const teamAPlayers = participants.filter(p => p.team === 'TEAM_A');
      const teamBPlayers = participants.filter(p => p.team === 'TEAM_B');
      const winnerLabel =
        result.winnerTeam === 'DRAW' ? 'Draw' :
        result.winnerTeam === 'TEAM_A' ? 'Team A wins' : 'Team B wins';

      if (isReporter) {
        // Player A waiting for Player B to respond
        return (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#F0F0F3', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Your Reported Result
            </Text>
            <Text style={{ color: '#0D0D14', fontSize: 18, fontWeight: '700' }}>{winnerLabel}</Text>
            {result.scoreTeamA != null && result.scoreTeamB != null && (
              <Text style={{ color: '#6B7280', fontSize: 14 }}>Score: {result.scoreTeamA} – {result.scoreTeamB}</Text>
            )}
            <Text style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4 }}>
              Waiting for the other player to confirm or dispute.
            </Text>
          </View>
        );
      }

      // Non-reporter — can confirm, and only the opposing captain can dispute
      const reporterParticipant = participants.find(p => p.userId === result.reportedByUserId);
      const reporterName = reporterParticipant ? shortName(reporterParticipant.displayName) : 'A player';
      const myParticipant = participants.find(p => p.userId === user?.id);
      const reporterTeam = reporterParticipant?.team ?? 'TEAM_A';
      const opposingTeam = reporterTeam === 'TEAM_A' ? 'TEAM_B' : 'TEAM_A';
      const isOpposingCaptain = myParticipant?.team === opposingTeam && myParticipant?.isCapt === true;
      const opposingPlayers = opposingTeam === 'TEAM_B' ? teamBPlayers : teamAPlayers;
      const opposingCaptain = opposingPlayers.find(p => p.isCapt);

      return (
        <View style={{ gap: 12 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#F0F0F3', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Reported Result
            </Text>
            <Text style={{ color: '#6B7280', fontSize: 13 }}>Reported by {reporterName}</Text>
            <Text style={{ color: '#0D0D14', fontSize: 20, fontWeight: '700' }}>{winnerLabel}</Text>
            {result.scoreTeamA != null && result.scoreTeamB != null && (
              <Text style={{ color: '#6B7280', fontSize: 14 }}>Score: {result.scoreTeamA} – {result.scoreTeamB}</Text>
            )}
            {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#EDE9FF', borderRadius: 10, padding: 10 }}>
                  <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Team A</Text>
                  {teamAPlayers.length > 0
                    ? teamAPlayers.map(p => <Text key={p.participantId} style={{ color: '#0D0D14', fontSize: 12 }} numberOfLines={1}>{shortName(p.displayName)}</Text>)
                    : <Text style={{ color: '#9CA3AF', fontSize: 11 }}>No players</Text>
                  }
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFF1E6', borderRadius: 10, padding: 10 }}>
                  <Text style={{ color: '#FF6B35', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Team B</Text>
                  {teamBPlayers.length > 0
                    ? teamBPlayers.map(p => <Text key={p.participantId} style={{ color: '#0D0D14', fontSize: 12 }} numberOfLines={1}>{shortName(p.displayName)}</Text>)
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

          {isOpposingCaptain ? (
            <Pressable
              onPress={() => { setResultModalMode('dispute'); handleReportResultPressed(); }}
              disabled={isAutoAssigning}
              style={{ backgroundColor: '#FEE2E2', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}
            >
              {isAutoAssigning ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>Dispute with Counter-Score</Text>
              )}
            </Pressable>
          ) : (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 }}>
              <Text style={{ color: '#6B7280', fontSize: 13, lineHeight: 20 }}>
                Your captain can propose a different score if they disagree
                {opposingCaptain ? ` — ${shortName(opposingCaptain.displayName)}` : ''}.
              </Text>
            </View>
          )}
        </View>
      );
    }

    // ── State: COUNTER_PROPOSED ──────────────────────────────────────────────
    if (status === 'COMPLETED' && result?.status === 'COUNTER_PROPOSED') {
      const participants = s.participants ?? [];
      const teamAPlayers = participants.filter(p => p.team === 'TEAM_A');
      const teamBPlayers = participants.filter(p => p.team === 'TEAM_B');

      const isCounterReporter = result.counterReportedByUserId === user?.id;

      if (isCounterReporter) {
        // Player B — already submitted counter, waiting for Player A
        return (
          <View style={{ backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>Counter-score submitted</Text>
            <Text style={{ color: '#92400E', fontSize: 13, lineHeight: 20 }}>
              Waiting for the other player to accept or escalate to review.
            </Text>
          </View>
        );
      }

      if (isReporter) {
        // Player A — sees both scores side by side, can accept or escalate
        const origLabel =
          result.winnerTeam === 'DRAW' ? 'Draw' :
          result.winnerTeam === 'TEAM_A' ? 'Team A wins' : 'Team B wins';
        const counterLabel =
          result.counterWinnerTeam === 'DRAW' ? 'Draw' :
          result.counterWinnerTeam === 'TEAM_A' ? 'Team A wins' : 'Team B wins';

        return (
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FCA5A5', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
              <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Counter-Score Proposed
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                The other player disagrees with your result. Review both versions below.
              </Text>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#EDE9FF', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    Your Version
                  </Text>
                  <Text style={{ color: '#0D0D14', fontSize: 16, fontWeight: '700', marginBottom: 2 }}>{origLabel}</Text>
                  {result.scoreTeamA != null && result.scoreTeamB != null && (
                    <Text style={{ color: '#6B7280', fontSize: 13 }}>{result.scoreTeamA} – {result.scoreTeamB}</Text>
                  )}
                </View>
                <View style={{ flex: 1, backgroundColor: '#FFF1E6', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: '#FF6B35', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    Their Version
                  </Text>
                  <Text style={{ color: '#0D0D14', fontSize: 16, fontWeight: '700', marginBottom: 2 }}>{counterLabel}</Text>
                  {result.counterScoreTeamA != null && result.counterScoreTeamB != null && (
                    <Text style={{ color: '#6B7280', fontSize: 13 }}>{result.counterScoreTeamA} – {result.counterScoreTeamB}</Text>
                  )}
                </View>
              </View>

              {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, backgroundColor: '#F2F3F7', borderRadius: 10, padding: 10 }}>
                    <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Team A</Text>
                    {teamAPlayers.map(p => <Text key={p.participantId} style={{ color: '#0D0D14', fontSize: 12 }} numberOfLines={1}>{shortName(p.displayName)}</Text>)}
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#F2F3F7', borderRadius: 10, padding: 10 }}>
                    <Text style={{ color: '#FF6B35', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Team B</Text>
                    {teamBPlayers.map(p => <Text key={p.participantId} style={{ color: '#0D0D14', fontSize: 12 }} numberOfLines={1}>{shortName(p.displayName)}</Text>)}
                  </View>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => acceptCounter()}
              disabled={isAccepting}
              style={{ backgroundColor: isAccepting ? '#DCFCE7' : '#22C55E', borderRadius: 24, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                {isAccepting ? 'Accepting…' : 'Accept Counter-Score'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                hapticWarning();
                Alert.alert(
                  'Send for Review?',
                  "This will send the match for manual review. Neither player can take further action once submitted.",
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Send for Review', style: 'destructive', onPress: () => rejectEscalate() },
                  ]
                );
              }}
              disabled={isRejecting}
              style={{ backgroundColor: '#FEE2E2', borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' }}
            >
              {isRejecting ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '600' }}>Reject and Escalate</Text>
              )}
            </Pressable>
          </View>
        );
      }
    }

    // ── State: DISPUTED ──────────────────────────────────────────────────────
    if (status === 'COMPLETED' && result?.status === 'DISPUTED' && isParticipant) {
      const hoursRemaining = result.disputedAt
        ? Math.ceil((new Date(result.disputedAt).getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000))
        : null;

      return (
        <View style={{ backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FDE68A', gap: 6 }}>
          <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '700' }}>This result is under review</Text>
          <Text style={{ color: '#78350F', fontSize: 13, lineHeight: 20 }}>
            This result is under review by our team. If it is not resolved within 24 hours of the dispute, the original reported score will be applied automatically.
          </Text>
          {hoursRemaining != null && hoursRemaining > 0 && (
            <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
              Auto-resolves in approximately {hoursRemaining} hour{hoursRemaining === 1 ? '' : 's'}
            </Text>
          )}
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
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID="session-input-done">
          <View style={{ backgroundColor: '#F8F8F8', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', padding: 8, alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={Keyboard.dismiss}>
              <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
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

        {session.status === 'CANCELLED' && session.cancellationReasonInsufficientPlayers && (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 4, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
            <Text style={{ color: '#991B1B', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>
              Automatically cancelled
            </Text>
            <Text style={{ color: '#B91C1C', fontSize: 13, lineHeight: 19 }}>
              This session was cancelled because the minimum of {session.minPlayers} {session.minPlayers === 1 ? 'player' : 'players'} wasn't reached before the start time.
            </Text>
            <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 6, fontWeight: '600' }}>
              {session.participantCount} of {session.minPlayers} {session.minPlayers === 1 ? 'player' : 'players'} joined
            </Text>
          </View>
        )}

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
          {(session.ratingType === 'ELO_COMPETITIVE' || session.ratingType == null) && (
            <InfoRow Icon={TrendingUp} value={levelLabel} />
          )}
          {session.ratingType === 'GRADE_BASED' && session.gradeMin != null && (
            <InfoRow Icon={TrendingUp} value={session.gradeMax != null ? `${session.gradeMin} – ${session.gradeMax}` : `${session.gradeMin} and above`} />
          )}
          {session.ratingType === 'PERFORMANCE_BASED' && session.targetPace != null && (
            <InfoRow Icon={TrendingUp} value={`Target: ${session.targetPace}`} />
          )}
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
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="session-input-done">
              <View style={{ backgroundColor: '#F8F8F8', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', padding: 8, alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={Keyboard.dismiss}>
                  <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </InputAccessoryView>
          )}
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
              <Text style={{ color: '#0D0D14', fontSize: 20, fontWeight: '700', marginBottom: 2 }}>
                {resultModalMode === 'dispute' ? 'Your Counter-Result' : 'Report Result'}
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                {resultModalMode === 'dispute'
                  ? 'Enter what actually happened — this will be submitted alongside your dispute'
                  : 'Enter the final score — winner is determined automatically'}
              </Text>
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
                      backgroundColor: derivedWinner === 'TEAM_A' ? '#EDE9FF' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: derivedWinner === 'TEAM_A' ? '#6C47FF' : (scoreA ? '#6C47FF' : '#E5E7EB'),
                      borderRadius: 14, paddingVertical: 12, width: '100%',
                      textAlign: 'center', fontSize: 30, fontWeight: '700', color: '#0D0D14',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
                    }}
                    placeholder="—"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="number-pad"
                    maxLength={3}
                    value={scoreA}
                    onChangeText={(t) => setScoreA(t.replace(/[^0-9]/g, ''))}
                    inputAccessoryViewID={Platform.OS === 'ios' ? 'session-input-done' : undefined}
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
                      backgroundColor: derivedWinner === 'TEAM_B' ? '#FFF1E6' : '#FFFFFF',
                      borderWidth: 1.5,
                      borderColor: derivedWinner === 'TEAM_B' ? '#FF6B35' : (scoreB ? '#FF6B35' : '#E5E7EB'),
                      borderRadius: 14, paddingVertical: 12, width: '100%',
                      textAlign: 'center', fontSize: 30, fontWeight: '700', color: '#0D0D14',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
                    }}
                    placeholder="—"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="number-pad"
                    maxLength={3}
                    value={scoreB}
                    onChangeText={(t) => setScoreB(t.replace(/[^0-9]/g, ''))}
                    inputAccessoryViewID={Platform.OS === 'ios' ? 'session-input-done' : undefined}
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
                  if (!derivedWinner || isReporting || isDisputing) return;
                  const payload = {
                    winnerTeam: derivedWinner,
                    scoreTeamA: scoreA ? parseInt(scoreA, 10) : undefined,
                    scoreTeamB: scoreB ? parseInt(scoreB, 10) : undefined,
                  };
                  if (resultModalMode === 'dispute') {
                    disputeResult(payload);
                  } else {
                    reportResult(payload);
                  }
                }}
                disabled={!derivedWinner || isReporting || isDisputing}
                style={{
                  backgroundColor: !derivedWinner ? '#E5E7EB' : (isReporting || isDisputing) ? '#6C47FFAA' : '#6C47FF',
                  borderRadius: 24, padding: 16, alignItems: 'center', marginBottom: 4,
                }}
              >
                <Text style={{ color: !derivedWinner ? '#9CA3AF' : '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                  {(isReporting || isDisputing)
                    ? 'Submitting…'
                    : resultModalMode === 'dispute' ? 'Submit Counter-Result' : 'Submit Result'}
                </Text>
              </Pressable>
              <Pressable onPress={closeResultModal} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Review Teams Modal */}
      <Modal
        visible={showRebalanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRebalanceModal(false)}
      >
        <ScreenBackground>
          {/* Header */}
          <SafeAreaView style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
              <Text style={{ flex: 1, color: '#0D0D14', fontSize: 18, fontWeight: '700' }}>Review Teams</Text>
              <Pressable onPress={() => setShowRebalanceModal(false)} style={{ padding: 4 }}>
                <Text style={{ color: '#9CA3AF', fontSize: 15 }}>Cancel</Text>
              </Pressable>
            </View>
          </SafeAreaView>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
            <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
              Adjust team assignments to match who actually played. Use the arrows to move players between teams.
            </Text>

            {/* 3-column layout using local rebalanceParticipants state */}
            {(() => {
              const rTeamA = rebalanceParticipants.filter(p => p.team === 'TEAM_A');
              const rTeamB = rebalanceParticipants.filter(p => p.team === 'TEAM_B');
              const rUnassigned = rebalanceParticipants.filter(p => p.team == null);
              return (
                <View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                    <View style={{ flex: 1, backgroundColor: '#EDE9FF', borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
                      <Text style={{ color: '#6C47FF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Team A ({rTeamA.length})
                      </Text>
                    </View>
                    {rUnassigned.length > 0 && (
                      <View style={{ width: 78, backgroundColor: '#F2F3F7', borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
                        <Text style={{ color: '#6B7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                          Bench ({rUnassigned.length})
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1, backgroundColor: '#FFF1E6', borderRadius: 8, paddingVertical: 6, alignItems: 'center' }}>
                      <Text style={{ color: '#FF6B35', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Team B ({rTeamB.length})
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {/* Team A */}
                    <View style={{ flex: 1, gap: 4 }}>
                      {rTeamA.map(p => (
                        <View key={p.participantId} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#EDE9FF' }}>
                          <Text style={{ color: '#0D0D14', fontSize: 12, fontWeight: '600', marginBottom: 5 }} numberOfLines={1}>
                            {shortName(p.displayName)}{p.userId === user?.id ? ' (you)' : ''}
                          </Text>
                          <Pressable
                            onPress={() => rebalanceMovePlayer(p.userId, 'TEAM_B')}
                            style={{ backgroundColor: '#FFF1E6', borderRadius: 5, paddingVertical: 4, alignItems: 'center' }}
                          >
                            <ArrowRight size={11} color="#FF6B35" />
                          </Pressable>
                        </View>
                      ))}
                    </View>

                    {/* Unassigned (bench) */}
                    {rUnassigned.length > 0 && (
                      <View style={{ width: 78, gap: 4 }}>
                        {rUnassigned.map(p => (
                          <View key={p.participantId} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 5, borderWidth: 1, borderColor: '#E5E7EB' }}>
                            <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4 }} numberOfLines={1}>
                              {shortName(p.displayName).split(' ')[0]}{p.userId === user?.id ? '*' : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              <Pressable
                                onPress={() => rebalanceMovePlayer(p.userId, 'TEAM_A')}
                                style={{ flex: 1, backgroundColor: '#EDE9FF', borderRadius: 4, paddingVertical: 4, alignItems: 'center' }}
                              >
                                <ArrowLeft size={10} color="#6C47FF" />
                              </Pressable>
                              <Pressable
                                onPress={() => rebalanceMovePlayer(p.userId, 'TEAM_B')}
                                style={{ flex: 1, backgroundColor: '#FFF1E6', borderRadius: 4, paddingVertical: 4, alignItems: 'center' }}
                              >
                                <ArrowRight size={10} color="#FF6B35" />
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Team B */}
                    <View style={{ flex: 1, gap: 4 }}>
                      {rTeamB.map(p => (
                        <View key={p.participantId} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#FFF1E6' }}>
                          <Text style={{ color: '#0D0D14', fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 5 }} numberOfLines={1}>
                            {shortName(p.displayName)}{p.userId === user?.id ? ' (you)' : ''}
                          </Text>
                          <Pressable
                            onPress={() => rebalanceMovePlayer(p.userId, 'TEAM_A')}
                            style={{ backgroundColor: '#EDE9FF', borderRadius: 5, paddingVertical: 4, alignItems: 'center' }}
                          >
                            <ArrowLeft size={11} color="#6C47FF" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })()}
          </ScrollView>

          {/* Fixed footer */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB',
            padding: 16, paddingBottom: safeBottom > 0 ? safeBottom + 8 : 24, gap: 10,
          }}>
            <Pressable
              onPress={confirmRebalance}
              disabled={isSavingRebalance}
              style={{ backgroundColor: isSavingRebalance ? '#6C47FFAA' : '#6C47FF', borderRadius: 24, padding: 16, alignItems: 'center' }}
            >
              {isSavingRebalance ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Confirm Teams</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setShowRebalanceModal(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Cancel</Text>
            </Pressable>
          </View>
        </ScreenBackground>
      </Modal>

      {/* PB Update Sheet */}
      <Modal
        visible={showPbSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPbSheet(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          {Platform.OS === 'ios' && (
            <InputAccessoryView nativeID="session-input-done">
              <View style={{ backgroundColor: '#F8F8F8', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', padding: 8, alignItems: 'flex-end' }}>
                <TouchableOpacity onPress={Keyboard.dismiss}>
                  <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </InputAccessoryView>
          )}
          <TouchableWithoutFeedback onPress={() => setShowPbSheet(false)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>

          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08, shadowRadius: 20, elevation: 24,
            maxHeight: SCREEN_H * 0.85,
          }}>
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' }} />
            </View>
            <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 14 }}>
              <Text style={{ color: '#0D0D14', fontSize: 20, fontWeight: '700', marginBottom: 2 }}>Update Personal Bests</Text>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>Enter your results from this session. Leave blank to keep current values.</Text>
            </View>

            <ScrollView
              style={{ maxHeight: SCREEN_H * 0.45 }}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {pbSportMetrics.map(metric => {
                const current = currentPbValues[metric.metricKey];
                const draft = pbDraft[metric.metricKey] ?? '';
                const isImproved = (() => {
                  if (!draft.trim() || !current) return false;
                  if (metric.inputType === 'duration') {
                    const d = parseFloat(draft);
                    const c = parseFloat(current);
                    return !isNaN(d) && !isNaN(c) && d < c;
                  }
                  if (metric.inputType === 'number') {
                    const d = parseFloat(draft);
                    const c = parseFloat(current);
                    return !isNaN(d) && !isNaN(c) && d > c;
                  }
                  return false;
                })();

                const currentDisplay = (() => {
                  if (!current) return null;
                  if (metric.inputType === 'duration') {
                    const s = parseInt(current) || 0;
                    const hasHours = metric.unit === 'h:mm:ss';
                    if (hasHours) {
                      const h = Math.floor(s / 3600);
                      const m = Math.floor((s % 3600) / 60);
                      const sec = s % 60;
                      return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                    }
                    const m = Math.floor(s / 60);
                    const sec = s % 60;
                    return `${m}:${String(sec).padStart(2, '0')}`;
                  }
                  return current;
                })();

                return (
                  <View key={metric.metricKey} style={{ marginBottom: 16 }}>
                    <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                      {metric.label}{metric.unit ? ` (${metric.unit})` : ''}
                    </Text>
                    {metric.inputType === 'duration' ? (
                      <DurationInput
                        unit={metric.unit}
                        value={draft}
                        onChange={v => setPbDraft(prev => ({ ...prev, [metric.metricKey]: v }))}
                        borderColor={isImproved ? '#22C55E' : undefined}
                        backgroundColor={isImproved ? '#F0FDF4' : undefined}
                        inputAccessoryViewID={Platform.OS === 'ios' ? 'session-input-done' : undefined}
                      />
                    ) : (
                      <TextInput
                        style={{
                          backgroundColor: isImproved ? '#F0FDF4' : '#FFFFFF',
                          color: '#0D0D14',
                          borderRadius: 12, padding: 12,
                          borderWidth: 1.5,
                          borderColor: isImproved ? '#22C55E' : '#E5E7EB',
                          fontSize: 15,
                          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
                        }}
                        placeholder={current ?? 'Enter value'}
                        placeholderTextColor="#9CA3AF"
                        value={draft}
                        onChangeText={v => setPbDraft(prev => ({ ...prev, [metric.metricKey]: v }))}
                        keyboardType={metric.inputType === 'number' ? 'decimal-pad' : 'default'}
                        returnKeyType={metric.inputType === 'number' ? 'done' : 'default'}
                        onSubmitEditing={() => metric.inputType !== 'number' ? undefined : undefined}
                        inputAccessoryViewID={metric.inputType === 'number' && Platform.OS === 'ios' ? 'session-input-done' : undefined}
                      />
                    )}
                    {currentDisplay != null && (
                      <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 3 }}>Current: {currentDisplay}</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: safeBottom > 0 ? safeBottom + 8 : 24, gap: 8 }}>
              <Pressable
                onPress={() => savePbResults()}
                disabled={isSavingPb}
                style={{ backgroundColor: isSavingPb ? '#22C55EAA' : '#22C55E', borderRadius: 24, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                  {isSavingPb ? 'Saving…' : 'Save My Results'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => markPbSubmitted()}
                disabled={isMarkingPb}
                style={{ alignItems: 'center', paddingVertical: 10 }}
              >
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Nothing to update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConflictModal
        visible={conflictingSession !== null}
        conflictingSession={conflictingSession}
        onDismiss={() => setConflictingSession(null)}
      />
    </SafeAreaView>
    </ScreenBackground>
  );
}
