import { Pressable, Text } from 'react-native';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function SportChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: selected ? '#6C47FF' : '#2A2A3A',
        backgroundColor: selected ? '#6C47FF22' : '#1A1A24',
        marginRight: 8,
      }}
    >
      <Text style={{ color: selected ? '#6C47FF' : '#9B9BAE', fontSize: 13, fontWeight: selected ? '600' : '400' }}>
        {label}
      </Text>
    </Pressable>
  );
}
