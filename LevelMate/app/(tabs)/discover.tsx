import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, ChevronRight, Compass, MapPin, TrendingUp } from 'lucide-react-native';
import SessionCard from '../../components/sessions/SessionCard';
import SportChip from '../../components/sports/SportChip';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { GameSession, UserProfile } from '../../types';

const PAGE_SIZE = 20;
const CARD_W = Dimensions.get('window').width - 32;

interface SessionPage {
  content: GameSession[];
  totalPages: number;
  number: number;
}

function SkeletonSessionCard({
  featured,
  shimmerX,
}: {
  featured?: boolean;
  shimmerX: Animated.AnimatedInterpolation<string | number>;
}) {
  const h = featured ? 260 : 220;
  return (
    <View style={{
      marginBottom: 16,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    }}>
      <View style={{ height: h, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E2E4EA' }}>
        {/* Shimmer sweep */}
        <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX: shimmerX }] }}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.5)',
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0)',
            ]}
            locations={[0, 0.35, 0.5, 0.65, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Bottom darkening — mirrors the real card gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.28)']}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {/* Top: sport pill + status pill */}
        <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: 78, height: 24, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12 }} />
          <View style={{ width: 54, height: 24, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12 }} />
        </View>

        {/* Bottom: title + meta rows */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
          <View style={{ width: '68%', height: 17, backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 5, marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' }}>
            <View style={{ width: '40%', height: 11, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 4 }} />
            <View style={{ width: '26%', height: 11, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ width: 56, height: 20, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10 }} />
            <View style={{ width: 90, height: 11, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 4 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

function SkeletonList() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const shimmerX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-CARD_W, CARD_W],
  });

  return (
    <>
      <SkeletonSessionCard featured shimmerX={shimmerX} />
      <SkeletonSessionCard shimmerX={shimmerX} />
      <SkeletonSessionCard shimmerX={shimmerX} />
    </>
  );
}

function useMinLoadingTime(loading: boolean, minMs = 700) {
  const [show, setShow] = useState(loading);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (loading) {
      startRef.current = Date.now();
      setShow(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      const remaining = Math.max(0, minMs - (Date.now() - startRef.current));
      timerRef.current = setTimeout(() => setShow(false), remaining);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [loading]);

  return show;
}

export default function DiscoverScreen() {
  const { user } = useAuthStore();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [selectedSportIds, setSelectedSportIds] = useState<string[]>([]);
  const [myLevelActive, setMyLevelActive] = useState(false);
  const chipScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationDenied(true);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        setLocationDenied(true);
      }
    })();
  }, []);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${user!.id}/profile`);
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const userSports = profile?.sports ?? [];
  const userSportIds = userSports.map((s) => s.sportId);

  const queryKey = ['sessions', selectedSportIds.join(','), myLevelActive, coords?.lat, coords?.lng, userSportIds.join(',')];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery<SessionPage>({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const urlParams = new URLSearchParams();
      urlParams.append('page', String(pageParam));
      urlParams.append('size', String(PAGE_SIZE));
      urlParams.append('status', 'OPEN');
      if (coords) {
        urlParams.append('lat', String(coords.lat));
        urlParams.append('lng', String(coords.lng));
        urlParams.append('radiusKm', '10');
      }
      const activeSportIds = selectedSportIds.length > 0
        ? selectedSportIds
        : userSportIds;
      activeSportIds.forEach((id) => urlParams.append('sportIds', id));
      const { data } = await api.get(`/api/v1/game-sessions?${urlParams.toString()}`);
      return data;
    },
    getNextPageParam: (last: SessionPage) =>
      last.number + 1 < last.totalPages ? last.number + 1 : undefined,
    initialPageParam: 0,
    refetchInterval: 60_000,
  });

  const sessions = data?.pages.flatMap((p) => p.content ?? []) ?? [];
  const showSkeleton = useMinLoadingTime(isLoading);

  const handleSportChipPress = useCallback((sportId: string) => {
    setSelectedSportIds((prev) => {
      const next = prev.includes(sportId)
        ? prev.filter((id) => id !== sportId)
        : [...prev, sportId];
      return next;
    });
    chipScrollRef.current?.scrollTo({ x: 0, animated: true });
  }, []);

  const selectedSports = userSports.filter((s) => selectedSportIds.includes(s.sportId));
  const unselectedSports = userSports.filter((s) => !selectedSportIds.includes(s.sportId));

  const ListHeader = (
    <View>
      {locationDenied && (
        <Pressable
          style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
            borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
            marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
          }}
        >
          <MapPin size={16} color="#FF6B35" />
          <Text style={{ fontSize: 14, color: '#6B7280', flex: 1 }}>Enable location for nearby games</Text>
          <ChevronRight size={16} color="#9CA3AF" />
        </Pressable>
      )}

      <Text style={{ fontSize: 16, fontWeight: '600', color: '#0D0D14', marginBottom: 8 }}>
        Games near you
      </Text>

      <ScrollView
        ref={chipScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 0, paddingBottom: 12 }}
      >
        <SportChip
          label="All My Sports"
          selected={selectedSportIds.length === 0}
          onPress={() => { setSelectedSportIds([]); chipScrollRef.current?.scrollTo({ x: 0, animated: true }); }}
        />
        <SportChip
          label="My Level"
          selected={myLevelActive}
          onPress={() => setMyLevelActive((v) => !v)}
          icon={<TrendingUp size={12} color={myLevelActive ? '#6C47FF' : '#9CA3AF'} />}
        />
        {selectedSports.map((s) => (
          <SportChip
            key={s.sportId}
            label={s.sportName}
            selected
            onPress={() => handleSportChipPress(s.sportId)}
          />
        ))}
        {unselectedSports.map((s) => (
          <SportChip
            key={s.sportId}
            label={s.sportName}
            selected={false}
            onPress={() => handleSportChipPress(s.sportId)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <Text style={{ color: '#0D0D14', fontSize: 28, fontWeight: '700' }}>Discover</Text>
        <Pressable style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} color="#6B7280" />
        </Pressable>
      </View>

      {showSkeleton ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          {ListHeader}
          <SkeletonList />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              tintColor="#6C47FF"
            />
          }
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Compass size={52} color="#D1D5DB" />
              <Text style={{ color: '#0D0D14', fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 16 }}>
                No games nearby
              </Text>
              <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', marginTop: 4 }}>
                Be the first to create one!
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/create')}
                style={{ backgroundColor: '#6C47FF', borderRadius: 24, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>Create Game</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item, index }) => (
            <SessionCard
              session={item}
              onPress={() => router.push(`/session/${item.id}`)}
              hostDisplayName={item.hostDisplayName}
              hostUserId={item.hostUserId}
              featured={index === 0}
            />
          )}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#6C47FF" style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}
