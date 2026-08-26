import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Search } from 'lucide-react-native';
import ScreenBackground from '../../components/ui/ScreenBackground';
import api from '../../lib/api';
import { hapticLight } from '../../lib/haptics';
import { getSportColour } from '../../lib/sportColors';
import { useAuthStore } from '../../stores/authStore';
import type { Sport } from '../../types';

interface SelectedSport {
  sport: Sport;
  level: number;
  grade?: string;
}

const RATING_TYPE_ORDER: Sport['ratingType'][] = ['ELO_COMPETITIVE', 'GRADE_BASED', 'PERFORMANCE_BASED'];
const RATING_TYPE_SECTION_HEADER: Record<Sport['ratingType'], string> = {
  ELO_COMPETITIVE: 'Competitive',
  GRADE_BASED: 'Grade-Based',
  PERFORMANCE_BASED: 'Performance-Based',
};

export default function SportsOnboardingScreen() {
  const { user } = useAuthStore();
  const [sports, setSports] = useState<Sport[]>([]);
  const [selected, setSelected] = useState<Record<string, SelectedSport>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query ? sports.filter((s) => s.name.toLowerCase().includes(query)) : sports;
    return RATING_TYPE_ORDER
      .map((ratingType) => ({
        ratingType,
        sports: filtered.filter((s) => s.ratingType === ratingType).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.sports.length > 0);
  }, [sports, search]);

  useEffect(() => {
    api.get('/api/v1/sports')
      .then(({ data }) => setSports(data))
      .catch(() => setError('Failed to load sports'))
      .finally(() => setLoading(false));
  }, []);

  function toggleSport(sport: Sport) {
    hapticLight();
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
      <ScreenBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID="onboarding-sport-search-done">
          <View style={{ backgroundColor: '#F8F8F8', borderTopWidth: 0.5, borderTopColor: '#E0E0E0', padding: 8, alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={Keyboard.dismiss}>
              <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 24 }}>
        <Text style={{ color: '#0D0D14', fontSize: 28, fontWeight: '700', marginBottom: 4 }}>
          What sports do you play?
        </Text>
        <Text style={{ color: '#6B7280', fontSize: 15, marginBottom: 24 }}>
          You can always add more and set your stats later
        </Text>

        {error ? <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{error}</Text> : null}

        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
            borderColor: searchFocused ? '#6C47FF' : '#E5E7EB',
            paddingHorizontal: 14, height: 48, marginBottom: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: searchFocused ? 0.1 : 0.04, shadowRadius: searchFocused ? 6 : 3, elevation: searchFocused ? 2 : 1,
          }}
        >
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#0D0D14' }}
            placeholder="Search sports..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="done"
            inputAccessoryViewID={Platform.OS === 'ios' ? 'onboarding-sport-search-done' : undefined}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          {groups.length === 0 ? (
            <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 20 }}>
              No sports found
            </Text>
          ) : (
            groups.map((group) => (
              <View key={group.ratingType} style={{ marginBottom: 12 }}>
                <Text style={{
                  color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: 0.6, marginBottom: 8,
                }}>
                  {RATING_TYPE_SECTION_HEADER[group.ratingType]}
                </Text>
                {group.sports.map((item) => {
                  const sel = selected[item.id];
                  const colour = getSportColour(item.slug);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleSport(item)}
                      style={{
                        borderRadius: 16, padding: 16, marginBottom: 10,
                        backgroundColor: sel ? '#EDE9FF' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: sel ? '#6C47FF' : '#E5E7EB',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: sel ? 0 : 0.05, shadowRadius: 2, elevation: sel ? 0 : 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: sel ? 8 : 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colour }} />
                          <Text style={{ color: sel ? '#6C47FF' : '#0D0D14', fontWeight: '600', fontSize: 14 }}>
                            {item.name}
                          </Text>
                        </View>
                        {sel && <Check size={16} color="#6C47FF" />}
                      </View>

                      {sel && (
                        <View>
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
                                inputAccessoryViewID={Platform.OS === 'ios' ? 'onboarding-sport-search-done' : undefined}
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
                })}
              </View>
            ))
          )}
        </ScrollView>
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
    </ScreenBackground>
  );
}
