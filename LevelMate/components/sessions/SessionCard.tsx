import { Pressable, Text, View } from 'react-native';
import AvatarInitials from '../ui/AvatarInitials';
import EloBadge from '../ui/EloBadge';
import StatusBadge from '../ui/StatusBadge';
import { formatSessionDate } from '../../lib/format';
import type { GameSession } from '../../types';

interface Props {
  session: GameSession;
  onPress: () => void;
  showHostBadge?: boolean;
  eloDelta?: number;
  hostDisplayName?: string;
  hostUserId?: string;
}

export default function SessionCard({
  session,
  onPress,
  showHostBadge,
  eloDelta,
  hostDisplayName = 'Host',
  hostUserId = 'unknown',
}: Props) {
  const title = session.title ?? `${session.sportName} game`;
  const levelLabel =
    session.minLevel != null && session.maxLevel != null
      ? `Lvl ${session.minLevel}–${session.maxLevel}`
      : 'All levels';
  const spotsLabel =
    session.spotsRemaining === 0
      ? 'Full'
      : `${session.spotsRemaining} spot${session.spotsRemaining === 1 ? '' : 's'} left`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: '#1A1A24',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        opacity: pressed ? 0.85 : 1,
        borderWidth: 1,
        borderColor: '#2A2A3A',
      })}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: '#9B9BAE', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {session.sportName}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {showHostBadge && (
            <View style={{ backgroundColor: '#6C47FF33', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color: '#6C47FF', fontSize: 10, fontWeight: '700' }}>HOST</Text>
            </View>
          )}
          <StatusBadge status={session.status as any} />
        </View>
      </View>

      {/* Title */}
      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 }} numberOfLines={1}>
        {title}
      </Text>

      {/* Location */}
      {session.locationName ? (
        <Text style={{ color: '#9B9BAE', fontSize: 13, marginBottom: 6 }} numberOfLines={1}>
          📍 {session.locationName}
        </Text>
      ) : null}

      {/* Date + level */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <Text style={{ color: '#9B9BAE', fontSize: 13 }}>
          🗓 {formatSessionDate(session.scheduledAt)}
        </Text>
        <Text style={{ color: '#9B9BAE', fontSize: 13 }}>
          {levelLabel}
        </Text>
      </View>

      {/* Bottom row: spots + host + ELO */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: session.spotsRemaining === 0 ? '#FF6B35' : '#22C55E', fontSize: 13, fontWeight: '600' }}>
          {spotsLabel}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {eloDelta !== undefined && <EloBadge delta={eloDelta} />}
          <AvatarInitials displayName={hostDisplayName} userId={hostUserId} size={24} />
          <Text style={{ color: '#9B9BAE', fontSize: 12 }}>{hostDisplayName}</Text>
        </View>
      </View>
    </Pressable>
  );
}
