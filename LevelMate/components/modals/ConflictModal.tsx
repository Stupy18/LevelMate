import { AlertCircle, Clock, MapPin } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import type { ConflictingSession } from '../../types';
import { formatSessionDate } from '../../lib/format';

interface Props {
  visible: boolean;
  conflictingSession: ConflictingSession | null;
  onDismiss: () => void;
}

export default function ConflictModal({ visible, conflictingSession, onDismiss }: Props) {
  if (!conflictingSession) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>

          {/* Warning icon */}
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <AlertCircle size={24} color="#F59E0B" />
          </View>

          {/* Title */}
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0D0D14', marginBottom: 6 }}>
            You already have a game
          </Text>

          {/* Subtitle */}
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            This game overlaps with another one you've joined:
          </Text>

          {/* Conflicting session info card */}
          <View style={{ backgroundColor: '#F8F9FC', borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#0D0D14', marginBottom: 6 }}>
              {conflictingSession.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Clock size={13} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: '#6B7280' }}>
                {formatSessionDate(conflictingSession.scheduledAt)}
              </Text>
            </View>
            {conflictingSession.locationName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} color="#9CA3AF" />
                <Text style={{ fontSize: 13, color: '#6B7280' }}>{conflictingSession.locationName}</Text>
              </View>
            ) : null}
          </View>

          {/* Instruction */}
          <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>
            To join this game, cancel your existing one from its game page first.
          </Text>

          {/* Dismiss button */}
          <Pressable
            onPress={onDismiss}
            style={{ backgroundColor: '#F2F3F7', borderRadius: 24, paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#0D0D14' }}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
