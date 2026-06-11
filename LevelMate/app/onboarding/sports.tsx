import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import api from '../../lib/api';
import { getSportColour } from '../../lib/sportColors';
import { useAuthStore } from '../../stores/authStore';
import type { Sport } from '../../types';

interface SelectedSport {
  sport: Sport;
  level: number;
  grade?: string;
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
      return { ...prev, [sport.id]: { sport, level: 1 } };
    });
  }

  function changeLevel(sportId: string, delta: number) {
    setSelected((prev) => {
      if (!prev[sportId]) return prev;
      const newLevel = Math.min(4, Math.max(1, prev[sportId].level + delta));
      return { ...prev, [sportId]: { ...prev[sportId], level: newLevel } };
    });
  }

  function changeGrade(sportId: string, grade: string) {
    setSelected((prev) => {
      if (!prev[sportId]) return prev;
      return { ...prev, [sportId]: { ...prev[sportId], grade } };
    });
  }

  async function handleContinue() {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        Object.values(selected).map(({ sport, level, grade }) => {
          const metrics: { metricKey: string; value: string }[] = [];
          if (sport.ratingType === 'ELO_COMPETITIVE') {
            metrics.push({ metricKey: 'self_reported_level', value: String(level) });
          } else if (sport.ratingType === 'GRADE_BASED' && grade?.trim()) {
            metrics.push({ metricKey: 'current_grade', value: grade.trim() });
          }
          return api.post(`/api/v1/users/${user.id}/sports`, { sportId: sport.id, metrics });
        }),
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
        <Text style={{ color: '#0D0D14', fontSize: 28, fontWeight: '700', marginBottom: 4 }}>
          What sports do you play?
        </Text>
        <Text style={{ color: '#6B7280', fontSize: 15, marginBottom: 24 }}>
          You can always add more and set your stats later
        </Text>

        {error ? <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</Text> : null}

        <FlatList
          data={sports}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const sel = selected[item.id];
            const colour = getSportColour(item.slug);
            return (
              <Pressable
                onPress={() => toggleSport(item)}
                style={{
                  flex: 1, borderRadius: 16, padding: 16,
                  backgroundColor: sel ? '#EDE9FF' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: sel ? '#6C47FF' : '#E5E7EB',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: sel ? 0 : 0.05, shadowRadius: 2, elevation: sel ? 0 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colour }} />
                  {sel && <Check size={16} color="#6C47FF" />}
                </View>
                <Text style={{ color: sel ? '#6C47FF' : '#0D0D14', fontWeight: '600', fontSize: 14, marginBottom: sel ? 8 : 0 }}>
                  {item.name}
                </Text>

                {sel && (
                  <View style={{ marginTop: 4 }}>
                    {item.ratingType === 'GRADE_BASED' ? (
                      <View onStartShouldSetResponder={() => true}>
                        <TextInput
                          style={{
                            backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
                            fontSize: 13, color: '#0D0D14', borderWidth: 1, borderColor: '#E5E7EB', marginTop: 2,
                          }}
                          placeholder="Grade (e.g. V5, 6a)"
                          placeholderTextColor="#9CA3AF"
                          value={sel.grade ?? ''}
                          onChangeText={(t) => changeGrade(item.id, t)}
                          autoCapitalize="none"
                        />
                      </View>
                    ) : item.ratingType === 'ELO_COMPETITIVE' ? (
                      <>
                        <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 6 }}>
                          Level: <Text style={{ color: '#6C47FF', fontWeight: '700' }}>{sel.level}</Text>
                          <Text style={{ color: '#9CA3AF', fontSize: 11 }}>/4</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                          <Pressable
                            onPress={(e) => { e.stopPropagation?.(); changeLevel(item.id, -1); }}
                            style={{ backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#E5E7EB' }}
                          >
                            <Text style={{ color: '#0D0D14', fontWeight: '700' }}>−</Text>
                          </Pressable>
                          <Pressable
                            onPress={(e) => { e.stopPropagation?.(); changeLevel(item.id, +1); }}
                            style={{ backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: '#E5E7EB' }}
                          >
                            <Text style={{ color: '#0D0D14', fontWeight: '700' }}>+</Text>
                          </Pressable>
                        </View>
                        <Text style={{ color: '#9CA3AF', fontSize: 10, lineHeight: 13 }}>
                          Levels 5–10 unlock through match results
                        </Text>
                      </>
                    ) : (
                      <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
                        Add performance data from your profile
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      </View>

      {/* Bottom actions */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}>
        <Pressable
          onPress={handleContinue}
          disabled={selectedCount === 0 || saving}
          style={{
            backgroundColor: '#6C47FF', borderRadius: 24, paddingVertical: 16, alignItems: 'center',
            opacity: selectedCount === 0 || saving ? 0.4 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
              Continue ({selectedCount} selected)
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(tabs)/discover')}
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <Text style={{ color: '#6B7280', fontSize: 14 }}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
