import { Search, Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { hapticLight } from '../../lib/haptics';
import { getSportColour } from '../../lib/sportColors';
import type { Sport } from '../../types';

const RATING_TYPE_ORDER: Sport['ratingType'][] = ['ELO_COMPETITIVE', 'GRADE_BASED', 'PERFORMANCE_BASED'];

const RATING_TYPE_LABEL: Record<Sport['ratingType'], string> = {
  ELO_COMPETITIVE: 'Competitive',
  GRADE_BASED: 'Grade-based',
  PERFORMANCE_BASED: 'Performance',
};

const RATING_TYPE_SECTION_HEADER: Record<Sport['ratingType'], string> = {
  ELO_COMPETITIVE: 'Competitive',
  GRADE_BASED: 'Grade-Based',
  PERFORMANCE_BASED: 'Performance-Based',
};

interface Props {
  sports: Sport[];
  isSelected: (sportId: string) => boolean;
  onSelect: (sport: Sport) => void;
  inputAccessoryViewID?: string;
  listHeight?: number;
}

export default function SportSearchPicker({ sports, isSelected, onSelect, inputAccessoryViewID, listHeight = 340 }: Props) {
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? sports.filter((s) => s.name.toLowerCase().includes(query))
      : sports;

    return RATING_TYPE_ORDER
      .map((ratingType) => ({
        ratingType,
        sports: filtered
          .filter((s) => s.ratingType === ratingType)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.sports.length > 0);
  }, [sports, search]);

  const hasAnyResults = groups.length > 0;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1,
          borderColor: focused ? '#6C47FF' : '#E5E7EB',
          paddingHorizontal: 14, height: 48, marginBottom: 12,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: focused ? 0.1 : 0.04, shadowRadius: focused ? 6 : 3, elevation: focused ? 2 : 1,
        }}
      >
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={{ flex: 1, fontSize: 15, color: '#0D0D14' }}
          placeholder="Search sports..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="done"
          inputAccessoryViewID={Platform.OS === 'ios' ? inputAccessoryViewID : undefined}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ height: listHeight }}>
        {!hasAnyResults ? (
          <Text style={{ color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 20 }}>
            No sports found
          </Text>
        ) : (
          groups.map((group) => (
            <View key={group.ratingType} style={{ marginBottom: 12 }}>
              <Text style={{
                color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
                letterSpacing: 0.6, marginBottom: 6,
              }}>
                {RATING_TYPE_SECTION_HEADER[group.ratingType]}
              </Text>
              {group.sports.map((sport) => {
                const selected = isSelected(sport.id);
                const colour = getSportColour(sport.slug);
                return (
                  <Pressable
                    key={sport.id}
                    onPress={() => { hapticLight(); onSelect(sport); }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingVertical: 12, paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: selected ? '#EDE9FF' : '#FFFFFF',
                      marginBottom: 4,
                    }}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colour, flexShrink: 0 }} />
                    <Text style={{ flex: 1, color: selected ? '#6C47FF' : '#0D0D14', fontSize: 15, fontWeight: selected ? '600' : '500' }}>
                      {sport.name}
                    </Text>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>
                      {RATING_TYPE_LABEL[sport.ratingType]}
                    </Text>
                    {selected && (
                      <View style={{ marginLeft: 4 }}>
                        <Check size={16} color="#6C47FF" />
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
  );
}
