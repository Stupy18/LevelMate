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
  const { login, isLoading, needsOnboarding } = useAuthStore();

  async function handleSignIn() {
    setError('');
    try {
      await login(email, password);
      router.replace(needsOnboarding ? '/onboarding/sports' : '/(tabs)/discover');
    } catch (err: any) {
      const code = err?.response?.data?.errorCode;
      if (err?.response?.status === 401 || code === 'INVALID_CREDENTIALS') {
        setError('Invalid email or password');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        {/* Wordmark */}
        <View className="items-center mb-12">
          <Text className="text-text-primary text-4xl font-bold tracking-tight">
            Level<Text className="text-primary">Mate</Text>
          </Text>
        </View>

        {/* Email */}
        <TextInput
          className="bg-surface text-text-primary rounded-xl px-4 py-4 mb-3 text-base"
          placeholder="Email"
          placeholderTextColor="#9B9BAE"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        {/* Password */}
        <TextInput
          className="bg-surface text-text-primary rounded-xl px-4 py-4 mb-4 text-base"
          placeholder="Password"
          placeholderTextColor="#9B9BAE"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {/* Inline error */}
        {error ? (
          <Text className="text-error text-sm mb-4">{error}</Text>
        ) : null}

        {/* Sign In button */}
        <Pressable
          onPress={handleSignIn}
          disabled={isLoading}
          className={`bg-primary rounded-xl py-4 items-center ${isLoading ? 'opacity-60' : ''}`}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-text-primary font-semibold text-base">Sign In</Text>
          )}
        </Pressable>

        {/* Register link */}
        <Pressable
          onPress={() => router.push('/(auth)/register')}
          className="mt-6 items-center"
        >
          <Text className="text-text-secondary text-sm">
            Don't have an account?{' '}
            <Text className="text-primary font-semibold">Register</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
