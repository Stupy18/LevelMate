import { Text, View } from 'react-native';

export default function EloBadge({ delta, elo }: { delta?: number; elo?: number }) {
  if (delta !== undefined) {
    const positive = delta >= 0;
    const colour = delta === 0 ? '#9B9BAE' : positive ? '#22C55E' : '#EF4444';
    const label = delta === 0 ? '±0' : positive ? `+${delta}` : `${delta}`;
    return (
      <View style={{ backgroundColor: colour + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
        <Text style={{ color: colour, fontSize: 11, fontWeight: '700' }}>{label} ELO</Text>
      </View>
    );
  }
  if (elo !== undefined) {
    return (
      <View style={{ backgroundColor: '#6C47FF22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
        <Text style={{ color: '#6C47FF', fontSize: 11, fontWeight: '700' }}>{elo}</Text>
      </View>
    );
  }
  return null;
}
