import { Pressable, Text, View } from 'react-native';
import { hapticLight } from '../../lib/haptics';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}

export default function SportChip({ label, selected, onPress, icon }: Props) {
  return (
    <Pressable
      onPress={() => { hapticLight(); onPress(); }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: selected ? '#6C47FF' : '#E5E7EB',
        backgroundColor: selected ? '#EDE9FF' : '#FFFFFF',
        marginRight: 8,
      }}
    >
      {icon ? <View>{icon}</View> : null}
      <Text style={{ color: selected ? '#6C47FF' : '#6B7280', fontSize: 13, fontWeight: selected ? '600' : '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}
