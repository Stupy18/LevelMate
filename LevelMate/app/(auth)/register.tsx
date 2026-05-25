import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validate(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};
  if (firstName.trim().length < 2) errors.firstName = 'First name must be at least 2 characters';
  if (lastName.trim().length < 1) errors.lastName = 'Last name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const { register, isLoading } = useAuthStore();

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setAvatarData(result.assets[0].base64);
    }
  }

  async function handleCreate() {
    const errors = validate(firstName, lastName, email, password, confirmPassword);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    try {
      await register(firstName.trim(), lastName.trim(), email, password, avatarData ?? undefined);
      router.replace('/onboarding/sports');
    } catch (err: any) {
      const code = err?.response?.data?.errorCode;
      if (code === 'EMAIL_ALREADY_IN_USE') {
        setFieldErrors({ email: 'An account with this email already exists' });
      } else {
        setFieldErrors({ email: 'Something went wrong. Please try again.' });
      }
    }
  }

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    color: '#0D0D14',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 4,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back arrow */}
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
            <ChevronLeft size={22} color="#6C47FF" />
            <Text style={{ color: '#6C47FF', fontWeight: '600', fontSize: 15 }}>Back</Text>
          </Pressable>

          <Text style={{ color: '#0D0D14', fontSize: 28, fontWeight: '700', marginBottom: 24 }}>Create Account</Text>

          {/* Avatar picker */}
          <Pressable onPress={pickAvatar} style={{ alignItems: 'center', marginBottom: 28 }}>
            {avatarData ? (
              <View>
                <View style={{ width: 80, height: 80, borderRadius: 40, overflow: 'hidden' }}>
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${avatarData}` }}
                    style={{ width: 80, height: 80 }}
                    resizeMode="cover"
                  />
                </View>
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); setAvatarData(null); }}
                  hitSlop={8}
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: '#EF4444',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: '#F8F9FC',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, lineHeight: 14, fontWeight: '700' }}>×</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: '#E5E7EB',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed',
              }}>
                <Text style={{ fontSize: 26, color: '#9CA3AF' }}>+</Text>
              </View>
            )}
            <Text style={{ color: '#6C47FF', fontSize: 13, fontWeight: '500', marginTop: 8 }}>
              Add photo (optional)
            </Text>
          </Pressable>

          {/* First name */}
          <TextInput
            style={inputStyle}
            placeholder="First name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
          />
          {fieldErrors.firstName ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 10, marginLeft: 4 }}>{fieldErrors.firstName}</Text>
          ) : <View style={{ marginBottom: 10 }} />}

          {/* Last name */}
          <TextInput
            style={inputStyle}
            placeholder="Last name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            value={lastName}
            onChangeText={setLastName}
          />
          {fieldErrors.lastName ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 10, marginLeft: 4 }}>{fieldErrors.lastName}</Text>
          ) : <View style={{ marginBottom: 10 }} />}

          {/* Email */}
          <TextInput
            style={inputStyle}
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          {fieldErrors.email ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 10, marginLeft: 4 }}>{fieldErrors.email}</Text>
          ) : <View style={{ marginBottom: 10 }} />}

          {/* Password */}
          <TextInput
            style={inputStyle}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {fieldErrors.password ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 10, marginLeft: 4 }}>{fieldErrors.password}</Text>
          ) : <View style={{ marginBottom: 10 }} />}

          {/* Confirm password */}
          <TextInput
            style={inputStyle}
            placeholder="Confirm password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {fieldErrors.confirmPassword ? (
            <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 16, marginLeft: 4 }}>{fieldErrors.confirmPassword}</Text>
          ) : <View style={{ marginBottom: 16 }} />}

          {/* Create Account button */}
          <Pressable
            onPress={handleCreate}
            disabled={isLoading}
            style={{ backgroundColor: '#6C47FF', borderRadius: 24, paddingVertical: 16, alignItems: 'center', opacity: isLoading ? 0.7 : 1 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Create Account</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
