/**
 * PendingResultSheet — transparent Modal + manual Animated spring.
 *
 * Key design decisions:
 * - Uses <Modal transparent animationType="none"> so we control animation ourselves.
 * - Internal `modalVisible` state delays Modal unmount until close animation finishes.
 * - PanResponder is attached ONLY to the drag-handle row — nothing else — so button
 *   taps always reach their handlers unintercepted.
 * - Navigation is done via `onNavigate` callback; the parent calls router.push()
 *   outside the Modal to avoid Android navigation-context issues.
 * - translateY, backdropOpa and ctaScale all use useNativeDriver: true — they only
 *   ever drive transform/opacity, so the animations run on the native thread and
 *   stay smooth even while the JS thread is busy with query refetches. Direct
 *   `.setValue()` calls from PanResponder (JS thread, to clamp dy ≥ 0) still work
 *   fine on a natively-driven value.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { format } from 'date-fns';
import { hapticMedium } from '../../lib/haptics';
import type { PendingResult } from '../../types';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const SHEET_H = Math.round(SCREEN_H * 0.8);

const SPORT_COLOURS: Record<string, string> = {
  basketball: '#FF6B35',
  football:   '#22C55E',
  soccer:     '#22C55E',
  tennis:     '#F59E0B',
  volleyball: '#6C47FF',
  padel:      '#06B6D4',
  bouldering: '#8B5CF6',
  running:    '#EC4899',
  cycling:    '#3B82F6',
  swimming:   '#0EA5E9',
};

function sportColour(slug: string): string {
  return SPORT_COLOURS[slug] ?? '#6C47FF';
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const t = `${hh}:${mm}`;
  if (d.toDateString() === now.toDateString()) return `Today at ${t}`;
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return `Yesterday at ${t}`;
  return format(d, 'EEE d MMM · HH:mm');
}

function badgeFor(pt: PendingResult['pendingType']) {
  switch (pt) {
    case 'NOT_REPORTED':      return { label: 'Report',      color: '#6C47FF', bg: '#EDE9FF' };
    case 'REPORTED_BY_OTHER': return { label: 'Confirm',     color: '#D97706', bg: '#FEF3C7' };
    case 'COUNTER_PROPOSED':  return { label: 'Respond',     color: '#EF4444', bg: '#FEE2E2' };
    case 'PB_UPDATE':          return { label: 'Log PBs',     color: '#FFFFFF',  bg: '#22C55E' };
    case 'SESSION_LOG':        return { label: 'Log session', color: '#FFFFFF',  bg: '#3B82F6' };
    case 'CANCELLED_SESSION':  return { label: 'Cancelled',   color: '#FFFFFF',  bg: '#EF4444' };
    default:                   return { label: 'Disputed',    color: '#EF4444', bg: '#FEE2E2' };
  }
}

function headlineFor(pt: PendingResult['pendingType'], sportName: string): { headline: string; subtitle: string } {
  switch (pt) {
    case 'PB_UPDATE':
      return { headline: 'Did you set any new records?', subtitle: `Log your personal bests from your ${sportName} session` };
    case 'SESSION_LOG':
      return { headline: 'How was your session?', subtitle: `Let your ${sportName} group know how it went` };
    case 'CANCELLED_SESSION':
      return { headline: "Session didn't have enough players", subtitle: `Your ${sportName} session was cancelled — not enough people joined before it started` };
    default:
      return { headline: 'Time to report your result', subtitle: '' };
  }
}

function ctaLabelFor(pt: PendingResult['pendingType']): string {
  switch (pt) {
    case 'PB_UPDATE':          return 'Update My PBs';
    case 'SESSION_LOG':        return 'Log This Session';
    case 'CANCELLED_SESSION':  return 'View Session';
    default:                   return 'Go to game';
  }
}

// ─── SVG icons ───────────────────────────────────────────────────

function TrophyIcon({ size = 32, color = '#F59E0B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M12 17v5M8 22h8M12 17a7 7 0 0 0 7-7V4H5v6a7 7 0 0 0 7 7z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon({ size = 13, color = '#9CA3AF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ClockIcon({ size = 13, color = '#9CA3AF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UsersIcon({ size = 13, color = '#9CA3AF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={2} />
      <Path
        d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Component ───────────────────────────────────────────────────

interface Props {
  visible: boolean;
  sessions: PendingResult[];
  onDismiss: () => void;
  onNavigate: (sessionId: string) => void;
}

function PendingResultSheet({ visible, sessions, onDismiss, onNavigate }: Props) {
  const { bottom: safeBottom } = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const translateY  = useRef(new Animated.Value(SHEET_H)).current;
  const backdropOpa = useRef(new Animated.Value(0)).current;
  const ctaScale    = useRef(new Animated.Value(1)).current;
  const scrollX     = useRef(new Animated.Value(0)).current;

  // Keep onDismiss current inside PanResponder (created once via useRef)
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  // Open / close
  useEffect(() => {
    if (visible) {
      setActiveIndex(0);
      scrollX.setValue(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
      translateY.setValue(SHEET_H);
      backdropOpa.setValue(0);
      setModalVisible(true);
      // Defer one frame so the modal finishes its layout pass before animating
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(backdropOpa, {
            toValue: 0.5,
            duration: 240,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_H,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpa, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [visible]);

  // PanResponder — drag handle ONLY
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        dy > 2 && Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        translateY.setValue(Math.max(0, dy));
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 80 || vy > 0.5) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SHEET_H,
              duration: 260,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpa, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => onDismissRef.current());
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleCtaPressIn = () => {
    Animated.spring(ctaScale, { toValue: 0.97, damping: 10, stiffness: 300, useNativeDriver: true }).start();
  };
  const handleCtaPressOut = () => {
    Animated.spring(ctaScale, { toValue: 1, damping: 10, stiffness: 300, useNativeDriver: true }).start();
  };

  // translateY/backdropOpa/ctaScale are stable refs, so these composed styles
  // never need to be recreated — avoids new array/object literals every render.
  const sheetStyle = useMemo(() => [styles.sheet, { transform: [{ translateY }] }], []);
  const backdropStyle = useMemo(
    () => [StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpa }],
    []
  );
  const ctaStyle = useMemo(() => [styles.ctaButton, { transform: [{ scale: ctaScale }] }], []);

  const count  = Array.isArray(sessions) ? sessions.length : 0;
  const item   = count > 0 ? sessions[Math.min(activeIndex, count - 1)] : null;
  const colour = item ? sportColour(item.sportSlug) : '#6C47FF';

  // DOT_STEP = dot diameter (6) + gap (8) = 14px
  // Pill starts left:-7 so it centres on dot 0; translateX adds 14px per page.
  const pillX = scrollX.interpolate({
    inputRange: count > 1 ? sessions.map((_, i) => i * SCREEN_W) : [0, SCREEN_W],
    outputRange: count > 1 ? sessions.map((_, i) => i * 14)      : [0, 14],
    extrapolate: 'clamp',
  });

  if (!modalVisible && count === 0) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>

        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onDismiss}>
          <Animated.View style={backdropStyle} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View style={sheetStyle}>

          {/* ── Drag handle — panHandlers ONLY here ── */}
          <View style={styles.handleRow} {...pan.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* Sport-coloured accent strip */}
          <View style={[styles.accentStrip, { backgroundColor: colour }]} />

          {/* Content */}
          <View style={[styles.content, { paddingBottom: safeBottom > 0 ? safeBottom + 8 : 20 }]}>

            {/* Header — icon halo + headline */}
            {(() => {
              const { headline, subtitle: typeSubtitle } = item
                ? headlineFor(item.pendingType, item.sportName)
                : { headline: 'Time to report your result', subtitle: '' };
              const countSubtitle = count === 1 ? 'You have 1 session waiting' : `You have ${count} sessions waiting`;
              return (
                <View style={styles.headerSection}>
                  <View style={styles.iconHalo}>
                    <View style={styles.iconCircle}>
                      <TrophyIcon size={32} color="#F59E0B" />
                    </View>
                  </View>
                  <Text style={styles.headline}>{headline}</Text>
                  <Text style={styles.subtitle}>
                    {typeSubtitle || countSubtitle}
                  </Text>
                </View>
              );
            })()}

            {/* Swipeable card carousel — negative margin breaks out of content padding */}
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              decelerationRate="fast"
              bounces={false}
              style={{ marginHorizontal: -24 }}
              onScroll={(e) => scrollX.setValue(e.nativeEvent.contentOffset.x)}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                setActiveIndex(Math.max(0, Math.min(count - 1, idx)));
              }}
            >
              {sessions.map((s) => {
                const c = sportColour(s.sportSlug);
                const b = badgeFor(s.pendingType);
                return (
                  <View key={s.sessionId} style={{ width: SCREEN_W, paddingHorizontal: 24 }}>
                    <View style={[styles.card, { borderLeftColor: c }]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.sportRow}>
                          <View style={[styles.sportDot, { backgroundColor: c }]} />
                          <Text style={[styles.sportLabel, { color: c }]}>
                            {s.sportName.toUpperCase()}
                          </Text>
                        </View>
                        {b && (
                          <View style={[styles.badge, { backgroundColor: b.bg }]}>
                            <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.sessionTitle} numberOfLines={2}>
                        {s.title ?? `${s.sportName} game`}
                      </Text>
                      {s.participantCount != null && (
                        <View style={styles.metaRow}>
                          <UsersIcon size={13} color="#9CA3AF" />
                          <Text style={styles.metaTextSmall}>
                            {s.participantCount === 1 ? '1 player' : `${s.participantCount} players`}
                          </Text>
                        </View>
                      )}
                      {s.locationName ? (
                        <View style={styles.metaRow}>
                          <MapPinIcon size={13} color="#9CA3AF" />
                          <Text style={styles.metaText} numberOfLines={1}>{s.locationName}</Text>
                        </View>
                      ) : null}
                      <View style={styles.metaRow}>
                        <ClockIcon size={13} color="#9CA3AF" />
                        <Text style={styles.metaText} numberOfLines={1}>{relativeDate(s.scheduledAt)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Pagination — sliding pill tracks scroll 1-to-1 */}
            {count > 1 && (
              <View style={styles.dots}>
                {/* Tight inner wrapper so the absolute pill positions relative to the dots */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {sessions.map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      hitSlop={12}
                      activeOpacity={0.7}
                      onPress={() => {
                        scrollRef.current?.scrollTo({ x: i * SCREEN_W, animated: true });
                        setActiveIndex(i);
                      }}
                    >
                      <View style={styles.dotBg} />
                    </TouchableOpacity>
                  ))}
                  {/* Pill: left:-7 centres it on the first 6px dot; translateX slides 14px per page */}
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.dotPill, { transform: [{ translateX: pillX }] }]}
                  />
                </View>
              </View>
            )}

            {/* CTA — scale press animation */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPressIn={handleCtaPressIn}
              onPressOut={handleCtaPressOut}
              onPress={() => { if (item) { hapticMedium(); onNavigate(item.sessionId); } }}
            >
              <Animated.View style={ctaStyle}>
                <Text style={styles.ctaText}>{item ? ctaLabelFor(item.pendingType) : 'Go to game'}</Text>
              </Animated.View>
            </TouchableOpacity>

            {/* Swipe hint + dismiss */}
            <TouchableOpacity
              style={styles.remindButton}
              activeOpacity={0.6}
              onPress={onDismiss}
            >
              <Text style={styles.swipeHint}>swipe down to dismiss</Text>
              <Text style={styles.remindText}>Remind me later</Text>
            </TouchableOpacity>

          </View>
        </Animated.View>

      </View>
    </Modal>
  );
}

// The pending-results query polls every 60s and refetches on mutation invalidation;
// most of those refetches return the same sessions. Skip re-rendering (and re-running
// the SVG/carousel tree) unless something the sheet actually displays changed.
function areEqual(prev: Props, next: Props): boolean {
  if (prev.visible !== next.visible) return false;
  if (prev.onDismiss !== next.onDismiss) return false;
  if (prev.onNavigate !== next.onNavigate) return false;
  if (prev.sessions.length !== next.sessions.length) return false;
  return prev.sessions.every((s, i) => {
    const o = next.sessions[i];
    return s.sessionId === o.sessionId && s.pendingType === o.pendingType;
  });
}

export default memo(PendingResultSheet, areEqual);

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SHEET_H,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  handleRow: {
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  accentStrip: {
    height: 4,
    width: '100%',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconHalo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEF9EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0D0D14',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sportDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sportLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badge: {
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0D0D14',
    lineHeight: 24,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  metaTextSmall: {
    fontSize: 12,
    color: '#6B7280',
  },
  dots: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dotBg: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotPill: {
    position: 'absolute',
    left: -7,
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C47FF',
  },
  ctaButton: {
    backgroundColor: '#6C47FF',
    borderRadius: 50,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  remindButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  swipeHint: {
    fontSize: 11,
    color: '#C4C4C4',
    marginBottom: 6,
  },
  remindText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
