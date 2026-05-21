import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import type { Sport } from '../../types';

interface SelectedSport {
  sport: Sport;
  level: number;
}

export default function SportsOnboardingScreen() {
  const { user } = useAuthStore();
  const [sports, setSports] = useState<Sport[]>([]);
  const [selected, setSelected] = useState<Record<string, SelectedSport>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/v1/sports')
      .then(({ data }) => setSports(data))
      .catch(() => setError('Failed to load sports'))
      .finally(() => setLoading(false));
  }, []);

  function toggleSport(sport: Sport) {
    setSelected((prev) => {
      if (prev[sport.id]) {
        const next = { ...prev };
        delete next[sport.id];
        return next;
      }
      return { ...prev, [sport.id]: { sport, level: 5 } };
    });
  }

  function changeLevel(sportId: string, delta: number) {
    setSelected((prev) => {
      if (!prev[sportId]) return prev;
      const newLevel = Math.min(10, Math.max(1, prev[sportId].level + delta));
      return { ...prev, [sportId]: { ...prev[sportId], level: newLevel } };
    });
  }

  async function handleContinue() {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        Object.values(selected).map(({ sport, level }) =>
          api.post(`/api/v1/users/${user.id}/sports`, {
            sportId: sport.id,
            level,
          }),
        ),
      );
      router.replace('/(tabs)/discover');
    } catch {
      setError('Failed to save sports. Please try again.');
      setSaving(false);
    }
  }

  const selectedCount = Object.keys(selected).length;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-5 pt-6">
        <Text className="text-text-primary text-3xl font-bold mb-1">
          What sports do you play?
        </Text>
        <Text className="text-text-secondary text-base mb-6">
          You can always add more later
        </Text>

        {error ? <Text className="text-error text-sm mb-4">{error}</Text> : null}

        <FlatList
          data={sports}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const sel = selected[item.id];
            return (
              <Pressable
                onPress={() => toggleSport(item)}
                className={`flex-1 rounded-2xl p-4 border ${
                  sel
                    ? 'bg-primary/20 border-primary'
                    : 'bg-surface border-border'
                }`}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-2xl">🏃</Text>
                  {sel && <Text className="text-success text-lg">✓</Text>}
                </View>
                <Text className="text-text-primary font-semibold text-sm mb-1">{item.name}</Text>

                {sel && (
                  <View className="mt-2">
                    <Text className="text-text-secondary text-xs mb-1">
                      Level: <Text className="text-primary font-bold">{sel.level}</Text>
                    </Text>
                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={(e) => { e.stopPropagation?.(); changeLevel(item.id, -1); }}
                        className="bg-surface rounded-lg px-3 py-1 border border-border"
                      >
                        <Text className="text-text-primary font-bold">−</Text>
                      </Pressable>
                      <Pressable
                        onPress={(e) => { e.stopPropagation?.(); changeLevel(item.id, +1); }}
                        className="bg-surface rounded-lg px-3 py-1 border border-border"
                      >
                        <Text className="text-text-primary font-bold">+</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {/* Bottom actions */}
      <View className="px-5 pb-6 gap-3">
        <Pressable
          onPress={handleContinue}
          disabled={selectedCount === 0 || saving}
          className={`bg-primary rounded-xl py-4 items-center ${
            selectedCount === 0 || saving ? 'opacity-40' : ''
          }`}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-text-primary font-semibold text-base">
              Continue ({selectedCount} selected)
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(tabs)/discover')}
          className="items-center py-2"
        >
          <Text className="text-text-secondary text-sm">Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
