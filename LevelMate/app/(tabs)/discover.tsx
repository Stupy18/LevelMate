import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
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

interface SessionPage {
  content: GameSession[];
  totalPages: number;
  number: number;
}

function SkeletonCard({ height = 220 }: { height?: number }) {
  return (
    <View style={{
      height,
      backgroundColor: '#E5E7EB',
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: 80, height: 24, backgroundColor: '#D1D5DB', borderRadius: 12 }} />
        <View style={{ width: 48, height: 24, backgroundColor: '#D1D5DB', borderRadius: 12 }} />
      </View>
      <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
        <View style={{ width: '70%', height: 18, backgroundColor: '#D1D5DB', borderRadius: 5, marginBottom: 8 }} />
        <View style={{ width: '50%', height: 12, backgroundColor: '#D1D5DB', borderRadius: 5 }} />
      </View>
    </View>
  );
}

export default function DiscoverScreen() {
  const { user } = useAuthStore();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [sportFilter, setSportFilter] = useState<string | null>(null); // null = "All My Sports"
  const [myLevelActive, setMyLevelActive] = useState(false);

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

  const queryKey = ['sessions', sportFilter, myLevelActive, coords?.lat, coords?.lng, userSportIds.join(',')];

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
      const activeSportIds = sportFilter !== null
        ? [sportFilter]
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
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 0, paddingBottom: 12 }}
      >
        <SportChip
          label="All My Sports"
          selected={sportFilter === null}
          onPress={() => setSportFilter(null)}
        />
        {userSports.map((s) => (
          <SportChip
            key={s.sportId}
            label={s.sportName}
            selected={sportFilter === s.sportId}
            onPress={() => setSportFilter(s.sportId)}
          />
        ))}
        <SportChip
          label="My Level"
          selected={myLevelActive}
          onPress={() => setMyLevelActive((v) => !v)}
          icon={<TrendingUp size={12} color={myLevelActive ? '#6C47FF' : '#9CA3AF'} />}
        />
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

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          {ListHeader}
          <SkeletonCard height={260} />
          <SkeletonCard />
          <SkeletonCard />
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
