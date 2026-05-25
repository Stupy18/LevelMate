import { Text, View } from 'react-native';

function formatDelta(delta: number): string {
  const rounded = Number(delta.toFixed(1));
  if (rounded === 0) return '±0';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export default function EloBadge({ delta, elo }: { delta?: number; elo?: number }) {
  if (delta !== undefined) {
    const rounded = Number(delta.toFixed(1));
    const positive = rounded >= 0;
    const colour = rounded === 0 ? '#6B7280' : positive ? '#16A34A' : '#EF4444';
    const bg = rounded === 0 ? '#F3F4F6' : positive ? '#DCFCE7' : '#FEE2E2';
    return (
      <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 }}>
        <Text style={{ color: colour, fontSize: 11, fontWeight: '700' }}>{formatDelta(delta)} ELO</Text>
      </View>
    );
  }
  if (elo !== undefined) {
    return (
      <View style={{ backgroundColor: '#EDE9FF', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 }}>
        <Text style={{ color: '#6C47FF', fontSize: 11, fontWeight: '700' }}>{Math.round(elo)}</Text>
      </View>
    );
  }
  return null;
}
