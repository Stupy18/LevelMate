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
 * - useNativeDriver: false on translateY so we can clamp dy to ≥0 in JS.
 * - ctaScale uses useNativeDriver: true (transform only) for the press animation.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { format } from 'date-fns';
import type { PendingResult } from '../../types';

const { height: SCREEN_H } = Dimensions.get('window');
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
    case 'NOT_REPORTED':      return { label: 'Report',   color: '#6C47FF', bg: '#EDE9FF' };
    case 'REPORTED_BY_OTHER': return { label: 'Confirm',  color: '#D97706', bg: '#FEF3C7' };
    default:                  return { label: 'Disputed', color: '#EF4444', bg: '#FEE2E2' };
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

export default function PendingResultSheet({ visible, sessions, onDismiss, onNavigate }: Props) {
  const { bottom: safeBottom } = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const translateY  = useRef(new Animated.Value(SHEET_H)).current;
  const backdropOpa = useRef(new Animated.Value(0)).current;
  const ctaScale    = useRef(new Animated.Value(1)).current;

  // Keep onDismiss current inside PanResponder (created once via useRef)
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  // Open / close
  useEffect(() => {
    if (visible) {
      setActiveIndex(0);
      translateY.setValue(SHEET_H);
      backdropOpa.setValue(0);
      setModalVisible(true);
      Animated.parallel([
        Animated.spring(translateY,  { toValue: 0,   damping: 15, stiffness: 200, useNativeDriver: false }),
        Animated.spring(backdropOpa, { toValue: 0.5, damping: 15, stiffness: 200, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY,  { toValue: SHEET_H, damping: 15, stiffness: 200, useNativeDriver: false }),
        Animated.timing(backdropOpa, { toValue: 0, duration: 250, useNativeDriver: false }),
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
            Animated.spring(translateY,  { toValue: SHEET_H, damping: 15, stiffness: 200, useNativeDriver: false }),
            Animated.timing(backdropOpa, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]).start(() => onDismissRef.current());
        } else {
          Animated.spring(translateY, { toValue: 0, damping: 15, stiffness: 200, useNativeDriver: false }).start();
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

  const count  = Array.isArray(sessions) ? sessions.length : 0;
  const item   = count > 0 ? sessions[Math.min(activeIndex, count - 1)] : null;
  const colour = item ? sportColour(item.sportSlug) : '#6C47FF';
  const badge  = item ? badgeFor(item.pendingType) : null;
  const venue  = item?.locationName ?? null;

  if (!modalVisible && count === 0) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFillObject}>

        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onDismiss}>
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', opacity: backdropOpa }]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>

          {/* ── Drag handle — panHandlers ONLY here ── */}
          <View style={styles.handleRow} {...pan.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* Sport-coloured accent strip */}
          <View style={[styles.accentStrip, { backgroundColor: colour }]} />

          {/* Content */}
          <View style={[styles.content, { paddingBottom: safeBottom > 0 ? safeBottom + 8 : 20 }]}>

            {/* Header — icon halo + headline */}
            <View style={styles.headerSection}>
              <View style={styles.iconHalo}>
                <View style={styles.iconCircle}>
                  <TrophyIcon size={32} color="#F59E0B" />
                </View>
              </View>
              <Text style={styles.headline}>Time to report your result</Text>
              <Text style={styles.subtitle}>
                {count === 1 ? 'You have 1 game waiting' : `You have ${count} games waiting`}
              </Text>
            </View>

            {/* Session summary card */}
            {item && (
              <View style={[styles.card, { borderLeftColor: colour }]}>
                {/* Sport dot + name + pending badge */}
                <View style={styles.cardHeader}>
                  <View style={styles.sportRow}>
                    <View style={[styles.sportDot, { backgroundColor: colour }]} />
                    <Text style={[styles.sportLabel, { color: colour }]}>
                      {item.sportName.toUpperCase()}
                    </Text>
                  </View>
                  {badge && (
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  )}
                </View>

                {/* Session title */}
                <Text style={styles.sessionTitle} numberOfLines={2}>
                  {item.title ?? `${item.sportName} game`}
                </Text>

                {/* Player count */}
                {item.participantCount != null && (
                  <View style={styles.metaRow}>
                    <UsersIcon size={13} color="#9CA3AF" />
                    <Text style={styles.metaTextSmall}>
                      {item.participantCount === 1 ? '1 player' : `${item.participantCount} players`}
                    </Text>
                  </View>
                )}

                {/* Venue */}
                {venue ? (
                  <View style={styles.metaRow}>
                    <MapPinIcon size={13} color="#9CA3AF" />
                    <Text style={styles.metaText} numberOfLines={1}>{venue}</Text>
                  </View>
                ) : null}

                {/* Date */}
                <View style={styles.metaRow}>
                  <ClockIcon size={13} color="#9CA3AF" />
                  <Text style={styles.metaText} numberOfLines={1}>{relativeDate(item.scheduledAt)}</Text>
                </View>
              </View>
            )}

            {/* Pagination dots */}
            {count > 1 && (
              <View style={styles.dots}>
                {sessions.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    hitSlop={8}
                    activeOpacity={0.7}
                    onPress={() => setActiveIndex(i)}
                  >
                    <View style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* CTA — scale press animation */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={handleCtaPressIn}
              onPressOut={handleCtaPressOut}
              onPress={() => item && onNavigate(item.sessionId)}
            >
              <Animated.View style={[styles.ctaButton, { transform: [{ scale: ctaScale }] }]}>
                <Text style={styles.ctaText}>Go to game</Text>
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
    backgroundColor: '#E5E7EB',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#6C47FF',
  },
  dotInactive: {
    backgroundColor: '#D1D5DB',
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
