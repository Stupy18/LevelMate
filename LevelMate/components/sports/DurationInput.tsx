import { Keyboard, TextInput } from 'react-native';

interface Props {
  unit?: string | null;
  value: string;
  onChange: (v: string) => void;
  borderColor?: string;
  backgroundColor?: string;
  inputAccessoryViewID?: string;
}

export default function DurationInput({ unit, value, onChange, borderColor, backgroundColor, inputAccessoryViewID }: Props) {
  const hasHours = unit === 'h:mm:ss';
  const maxDigits = hasHours ? 6 : 4;

  function valueToDigits(v: string): string {
    const total = parseInt(v) || 0;
    if (total === 0) return '';
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const raw = hasHours
      ? String(h).padStart(2, '0') + String(m).padStart(2, '0') + String(s).padStart(2, '0')
      : String(m).padStart(2, '0') + String(s).padStart(2, '0');
    return raw.replace(/^0+/, '') || '';
  }

  function digitsToDisplay(digits: string): string {
    const padded = digits.padStart(maxDigits, '0');
    if (hasHours) {
      const h = parseInt(padded.slice(0, 2));
      return `${h}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
    }
    const m = parseInt(padded.slice(0, 2));
    return `${m}:${padded.slice(2, 4)}`;
  }

  function digitsToSeconds(digits: string): string {
    if (!digits) return '';
    const padded = digits.padStart(maxDigits, '0');
    if (hasHours) {
      const h = parseInt(padded.slice(0, 2)) || 0;
      const m = parseInt(padded.slice(2, 4)) || 0;
      const s = parseInt(padded.slice(4, 6)) || 0;
      return String(h * 3600 + m * 60 + s);
    }
    const m = parseInt(padded.slice(0, 2)) || 0;
    const s = parseInt(padded.slice(2, 4)) || 0;
    return String(m * 60 + s);
  }

  const digits = valueToDigits(value);
  const displayText = digits ? digitsToDisplay(digits) : '';

  function handleChange(text: string) {
    const newDigits = text.replace(/\D/g, '').slice(-maxDigits);
    onChange(digitsToSeconds(newDigits));
  }

  const computedBorderColor = borderColor ?? (value ? '#6C47FF' : '#E5E7EB');
  const computedBgColor = backgroundColor ?? '#F8F9FC';

  return (
    <TextInput
      style={{
        backgroundColor: computedBgColor,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 20,
        color: '#0D0D14',
        borderWidth: 1.5,
        borderColor: computedBorderColor,
        textAlign: 'center',
      }}
      value={displayText}
      onChangeText={handleChange}
      keyboardType="number-pad"
      returnKeyType="done"
      onSubmitEditing={() => Keyboard.dismiss()}
      inputAccessoryViewID={inputAccessoryViewID}
      placeholder={hasHours ? '0:00:00' : '0:00'}
      placeholderTextColor="#C4C4D0"
    />
  );
}
