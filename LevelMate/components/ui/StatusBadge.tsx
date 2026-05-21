import { Text, View } from 'react-native';

type Status = 'OPEN' | 'FULL' | 'CANCELLED' | 'COMPLETED';

const CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  OPEN:      { label: 'Open',      bg: '#16a34a22', text: '#22C55E' },
  FULL:      { label: 'Full',      bg: '#ea580c22', text: '#FF6B35' },
  CANCELLED: { label: 'Cancelled', bg: '#6b728022', text: '#9B9BAE' },
  COMPLETED: { label: 'Completed', bg: '#7c3aed22', text: '#6C47FF' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, bg, text } = CONFIG[status] ?? CONFIG.OPEN;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: text, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
