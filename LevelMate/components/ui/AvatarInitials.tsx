import { Text, View } from 'react-native';

const COLOURS = [
  '#6C47FF', '#FF6B35', '#22C55E', '#F59E0B',
  '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6',
];

function colourFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return COLOURS[hash % COLOURS.length];
}

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  displayName: string;
  userId: string;
  size?: number;
}

export default function AvatarInitials({ displayName, userId, size = 36 }: Props) {
  const bg = colourFromId(userId);
  const fontSize = Math.round(size * 0.38);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize, fontWeight: '700' }}>
        {initials(displayName)}
      </Text>
    </View>
  );
}
