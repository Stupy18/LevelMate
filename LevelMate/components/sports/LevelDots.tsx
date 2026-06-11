import { View } from 'react-native';

export default function LevelDots({ level, total = 10, newPlayer = false }: { level: number; total?: number; newPlayer?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: i < level ? '#6C47FF' : '#E5E7EB',
            opacity: newPlayer && i >= 4 ? 0.3 : 1,
          }}
        />
      ))}
    </View>
  );
}
