import { Text, View } from 'react-native';

type Status = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED';

const CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  OPEN:        { label: 'Open',        bg: '#DCFCE7', text: '#16A34A' },
  FULL:        { label: 'Full',        bg: '#FEF3C7', text: '#D97706' },
  IN_PROGRESS: { label: 'Live',        bg: '#FFF1F0', text: '#EF4444' },
  CANCELLED:   { label: 'Cancelled',   bg: '#F3F4F6', text: '#6B7280' },
  COMPLETED:   { label: 'Completed',   bg: '#EDE9FF', text: '#6C47FF' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, bg, text } = CONFIG[status] ?? CONFIG.OPEN;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: text, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
