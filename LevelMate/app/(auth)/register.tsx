import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { register, isLoading } = useAuthStore();

  async function handleCreate() {
    const errors = validate(firstName, lastName, email, password, confirmPassword);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    try {
      await register(firstName.trim(), lastName.trim(), email, password);
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back arrow */}
          <Pressable onPress={() => router.back()} className="mb-8">
            <Text className="text-primary text-lg">← Back</Text>
          </Pressable>

          <Text className="text-text-primary text-3xl font-bold mb-8">Create Account</Text>

          {/* First name */}
          <TextInput
            className="bg-surface text-text-primary rounded-xl px-4 py-4 mb-1 text-base"
            placeholder="First name"
            placeholderTextColor="#9B9BAE"
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
          />
          {fieldErrors.firstName ? (
            <Text className="text-error text-xs mb-3 ml-1">{fieldErrors.firstName}</Text>
          ) : <View className="mb-3" />}

          {/* Last name */}
          <TextInput
            className="bg-surface text-text-primary rounded-xl px-4 py-4 mb-1 text-base"
            placeholder="Last name"
            placeholderTextColor="#9B9BAE"
            autoCapitalize="words"
            value={lastName}
            onChangeText={setLastName}
          />
          {fieldErrors.lastName ? (
            <Text className="text-error text-xs mb-3 ml-1">{fieldErrors.lastName}</Text>
          ) : <View className="mb-3" />}

          {/* Email */}
          <TextInput
            className="bg-surface text-text-primary rounded-xl px-4 py-4 mb-1 text-base"
            placeholder="Email"
            placeholderTextColor="#9B9BAE"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          {fieldErrors.email ? (
            <Text className="text-error text-xs mb-3 ml-1">{fieldErrors.email}</Text>
          ) : <View className="mb-3" />}

          {/* Password */}
          <TextInput
            className="bg-surface text-text-primary rounded-xl px-4 py-4 mb-1 text-base"
            placeholder="Password"
            placeholderTextColor="#9B9BAE"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {fieldErrors.password ? (
            <Text className="text-error text-xs mb-3 ml-1">{fieldErrors.password}</Text>
          ) : <View className="mb-3" />}

          {/* Confirm password */}
          <TextInput
            className="bg-surface text-text-primary rounded-xl px-4 py-4 mb-1 text-base"
            placeholder="Confirm password"
            placeholderTextColor="#9B9BAE"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {fieldErrors.confirmPassword ? (
            <Text className="text-error text-xs mb-4 ml-1">{fieldErrors.confirmPassword}</Text>
          ) : <View className="mb-4" />}

          {/* Create Account button */}
          <Pressable
            onPress={handleCreate}
            disabled={isLoading}
            className={`bg-primary rounded-xl py-4 items-center ${isLoading ? 'opacity-60' : ''}`}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-text-primary font-semibold text-base">Create Account</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
