import { router } from 'expo-router';
import { useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();

  async function handleSignIn() {
    setError('');
    try {
      await login(email, password);
      // _layout.tsx effect handles redirect when isAuthenticated flips
    } catch {
      setPassword('');
      setError('No account found with these credentials. Check your email and password.');
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
    marginBottom: 12,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FC' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
      >
        {/* Wordmark */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: '#0D0D14', letterSpacing: -0.5 }}>
            Level<Text style={{ color: '#6C47FF' }}>Mate</Text>
          </Text>
        </View>

        {/* Email */}
        <TextInput
          style={inputStyle}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(''); }}
        />

        {/* Password */}
        <TextInput
          style={inputStyle}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={(v) => { setPassword(v); setError(''); }}
        />

        {/* Inline error */}
        {error ? (
          <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</Text>
        ) : null}

        {/* Sign In button */}
        <Pressable
          onPress={handleSignIn}
          disabled={isLoading}
          style={{ backgroundColor: '#6C47FF', borderRadius: 24, paddingVertical: 16, alignItems: 'center', opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Sign In</Text>
          )}
        </Pressable>

        {/* Register link */}
        <Pressable
          onPress={() => router.push('/(auth)/register')}
          style={{ marginTop: 24, alignItems: 'center' }}
        >
          <Text style={{ color: '#6B7280', fontSize: 14 }}>
            Don't have an account?{' '}
            <Text style={{ color: '#6C47FF', fontWeight: '600' }}>Register</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
