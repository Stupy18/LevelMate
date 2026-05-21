import { useInfiniteQuery } from '@tanstack/react-query';
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
import SessionCard from '../../components/sessions/SessionCard';
import SportChip from '../../components/sports/SportChip';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { GameSession } from '../../types';

const PAGE_SIZE = 20;

interface SessionPage {
  content: GameSession[];
  totalPages: number;
  number: number;
}

function SkeletonCard() {
  return (
    <View style={{ backgroundColor: '#1A1A24', borderRadius: 16, padding: 16, marginBottom: 12, height: 130, borderWidth: 1, borderColor: '#2A2A3A' }}>
      <View style={{ width: '40%', height: 12, backgroundColor: '#2A2A3A', borderRadius: 6, marginBottom: 10 }} />
      <View style={{ width: '70%', height: 18, backgroundColor: '#2A2A3A', borderRadius: 6, marginBottom: 8 }} />
      <View style={{ width: '55%', height: 12, backgroundColor: '#2A2A3A', borderRadius: 6 }} />
    </View>
  );
}

export default function DiscoverScreen() {
  const { user } = useAuthStore();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [myLevelActive, setMyLevelActive] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  const queryKey = ['sessions', sportFilter, myLevelActive, coords?.lat, coords?.lng];

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
      const params: Record<string, any> = { page: pageParam, size: PAGE_SIZE, status: 'OPEN' };
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.radiusKm = 10;
      }
      if (sportFilter) params.sportId = sportFilter;
      // level filter: pass user's sport level ±2 if available
      const { data } = await api.get('/api/v1/game-sessions', { params });
      return data;
    },
    getNextPageParam: (last: SessionPage) =>
      last.number + 1 < last.totalPages ? last.number + 1 : undefined,
    initialPageParam: 0,
  });

  const sessions = data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0F14' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>Discover</Text>
      </View>

      {/* Location denied banner */}
      {locationDenied && (
        <View style={{ backgroundColor: '#F59E0B22', marginHorizontal: 20, marginBottom: 8, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#F59E0B44' }}>
          <Text style={{ color: '#F59E0B', fontSize: 13 }}>Enable location for nearby games</Text>
        </View>
      )}

      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 }}
      >
        <SportChip label="All Sports" selected={sportFilter === null} onPress={() => setSportFilter(null)} />
        <SportChip
          label="My Level"
          selected={myLevelActive}
          onPress={() => setMyLevelActive((v) => !v)}
        />
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, flexGrow: 1 }}
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
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Text style={{ color: '#9B9BAE', fontSize: 40, marginBottom: 16 }}>🏃</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                No games nearby
              </Text>
              <Text style={{ color: '#9B9BAE', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                Be the first to create one!
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/create')}
                style={{ backgroundColor: '#6C47FF', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Create Game</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => router.push(`/session/${item.id}`)}
              hostDisplayName={item.hostUserId}
              hostUserId={item.hostUserId}
            />
          )}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#6C47FF" style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}
