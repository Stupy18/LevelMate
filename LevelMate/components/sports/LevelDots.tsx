import { View } from 'react-native';

export default function LevelDots({ level, total = 10 }: { level: number; total?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: i < level ? '#6C47FF' : '#2A2A3A',
          }}
        />
      ))}
    </View>
  );
}
