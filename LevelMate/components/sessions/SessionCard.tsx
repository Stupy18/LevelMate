import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Clock, MapPin, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatSessionDate } from '../../lib/format';
import { hapticMedium } from '../../lib/haptics';
import { getSessionPhotoUrl } from '../../lib/places';
import type { GameSession } from '../../types';

export const SPORT_COLOURS: Record<string, string> = {
  basketball: '#FF6B35',
  football: '#22C55E',
  soccer: '#22C55E',
  tennis: '#F59E0B',
  volleyball: '#6C47FF',
  padel: '#06B6D4',
  bouldering: '#8B5CF6',
  running: '#EC4899',
  cycling: '#3B82F6',
  swimming: '#0EA5E9',
};

function sportDotColour(name: string): string {
  const key = name.toLowerCase().trim();
  if (SPORT_COLOURS[key]) return SPORT_COLOURS[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const fallbacks = ['#6C47FF', '#FF6B35', '#22C55E', '#F59E0B', '#3B82F6', '#EC4899'];
  return fallbacks[h % fallbacks.length];
}

interface Props {
  session: GameSession;
  onPress: () => void;
  showHostBadge?: boolean;
  eloDelta?: number;
  hostDisplayName?: string;
  hostUserId?: string;
  featured?: boolean;
}

export default function SessionCard({
  session,
  onPress,
  showHostBadge,
  hostDisplayName = 'Host',
  featured = false,
}: Props) {
  const [photoError, setPhotoError] = useState(false);

  const cardHeight = featured ? 260 : 220;
  const sportColour = sportDotColour(session.sportName);
  const spotsLabel = session.spotsRemaining === 0 ? 'Full' : `${session.spotsRemaining} left`;
  const title = session.title ?? `${session.sportName} · ${session.locationName ?? 'game'}`;
  const hostInitial = (hostDisplayName?.[0] ?? '?').toUpperCase();
  const photoUrl = !photoError ? getSessionPhotoUrl(session.googlePhotoReference) : null;

  return (
    // Outer View: shadow only — no overflow clipping (elevation + overflow:hidden breaks Android rendering)
    <View style={{
      marginBottom: 16,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    }}>
      {/* Inner Pressable: clipping only — no elevation */}
      <Pressable
        onPress={() => { hapticMedium(); onPress(); }}
        style={({ pressed }) => ({
          height: cardHeight,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: sportColour,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        {photoUrl && (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: '100%', height: cardHeight }}
            contentFit="cover"
            priority="high"
            onError={() => setPhotoError(true)}
          />
        )}

        {/* Gradient — explicit rgba transparent avoids Android opaque-black bug */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']}
          locations={[0.2, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top row */}
        <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF' }} />
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {session.sportName}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {showHostBadge && (
              <View style={{ backgroundColor: 'rgba(108,71,255,0.9)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>HOST</Text>
              </View>
            )}
            <View style={{
              paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20,
              backgroundColor: session.status === 'OPEN' ? 'rgba(34,197,94,0.9)'
                : session.status === 'FULL' ? 'rgba(245,158,11,0.9)'
                : session.status === 'IN_PROGRESS' ? 'rgba(239,68,68,0.9)'
                : session.status === 'CANCELLED' ? 'rgba(107,114,128,0.9)'
                : 'rgba(108,71,255,0.9)',
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                {session.status === 'IN_PROGRESS' ? '● LIVE' : session.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom content */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 6 }} numberOfLines={1}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              {session.locationName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 }}>
                  <MapPin size={11} color="rgba(255,255,255,0.8)" />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }} numberOfLines={1}>{session.locationName}</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Clock size={11} color="rgba(255,255,255,0.8)" />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{formatSessionDate(session.scheduledAt)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginLeft: 8 }}>
              <Users size={11} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '500' }}>{spotsLabel}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {session.ratingType === 'GRADE_BASED' ? (
              session.gradeMin != null ? (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '500' }}>
                    {session.gradeMax != null ? `${session.gradeMin}–${session.gradeMax}` : `${session.gradeMin}+`}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>All grades</Text>
              )
            ) : session.ratingType === 'PERFORMANCE_BASED' ? (
              session.targetPace != null ? (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '500' }}>{session.targetPace}</Text>
                </View>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>Group training</Text>
              )
            ) : (
              session.minLevel != null && session.maxLevel != null ? (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '500' }}>Lvl {session.minLevel}–{session.maxLevel}</Text>
                </View>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>All levels</Text>
              )
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>{hostInitial}</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{hostDisplayName}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
