import { Image, View } from 'react-native';
import AvatarInitials from './AvatarInitials';

interface Props {
  displayName: string;
  userId: string;
  avatarData?: string | null;
  size?: number;
}

export default function Avatar({ displayName, userId, avatarData, size = 36 }: Props) {
  if (avatarData) {
    const uri = avatarData.startsWith('data:')
      ? avatarData
      : `data:image/jpeg;base64,${avatarData}`;
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }
  return <AvatarInitials displayName={displayName} userId={userId} size={size} />;
}
