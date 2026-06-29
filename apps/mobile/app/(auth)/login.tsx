import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Mail, Lock, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';
import { gqlFetch } from '../../src/hooks/useGraphQL';

const ME_QUERY = `query Me { me { role } }`;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/landing');
    }
  }

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth!, email.trim(), password);
    } catch (e: any) {
      const code: string = e?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError(`Sign in failed: ${code || e?.message || 'unknown error'}`);
      }
      setLoading(false);
      return;
    }

    // Firebase auth succeeded. Check role best-effort — don't block login if backend is down.
    try {
      const data = await gqlFetch<{ me: { role: string } | null }>(ME_QUERY);
      const role = data?.me?.role;
      if (role === 'HOST' || role === 'ADMIN') {
        await auth!.signOut();
        setLoading(false);
        Alert.alert(
          'Web Dashboard Required',
          'Your account has host or admin access. Please sign in at the Ceylonify web dashboard to manage your listings.',
          [{ text: 'OK' }],
        );
        return;
      }
    } catch {
      // Backend unreachable — proceed as TRAVELER
    }

    if (Platform.OS === 'web') {
      void (async () => {
        try {
          const { getMessaging, getToken } = await import('firebase/messaging');
          const token = await getToken(getMessaging());
          if (token) {
            await gqlFetch(`mutation RegisterDeviceToken($token: String!) { registerDeviceToken(token: $token) }`, { token });
          }
        } catch { }
      })();
    } else {
      void (async () => {
        try {
          const Constants = (await import('expo-constants')).default;
          if (Constants.appOwnership === 'expo') return;
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const pushEnabled = await AsyncStorage.getItem('pushNotificationsEnabled');
          if (pushEnabled === 'false') return;
          const Notifications = await import('expo-notifications');
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') return;
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
          if (token) {
            await gqlFetch(
              `mutation RegisterDeviceToken($token: String!) { registerDeviceToken(token: $token) }`,
              { token },
            );
          }
        } catch { }
      })();
    }

    setLoading(false);
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image
        source={require('../../assets/images/landing_bg.png')}
        style={styles.bg}
        contentFit="cover"
      />
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your Sri Lankan adventure</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="rgba(255,255,255,0.6)" />
                <TextInput
                  placeholder="name@example.com"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  onPress={() => router.push({
                    pathname: '/(auth)/forgot-password',
                    params: email.trim() ? { email: email.trim() } : {},
                  })}
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Lock size={20} color="rgba(255,255,255,0.6)" />
                <TextInput
                  placeholder="••••••••"
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSignIn}
              style={[styles.signInButton, loading && styles.signInButtonDisabled]}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.signInText}>Sign In</Text>
              }
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Alert.alert('Coming Soon', 'Google sign-in will be available in a future update.')}
              >
                <View style={styles.googleIconBg}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.replace('/(tabs)/home')}
                style={styles.socialButton}
              >
                <Text style={styles.socialButtonText}>Guest Access</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  bg: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.72)',
  },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },

  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },

  header: { marginBottom: 36 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },

  form: {},
  inputGroup: { marginBottom: 20 },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginLeft: 2, marginBottom: 8, letterSpacing: 0.3 },
  forgotLink: { fontSize: 12, fontWeight: '700', color: '#0EA5A4' },

  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#FFFFFF' },

  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.25)',
    borderWidth: 1, borderColor: 'rgba(252,165,165,0.4)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  errorText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600' },

  signInButton: {
    backgroundColor: '#0EA5A4', paddingVertical: 17, borderRadius: 999,
    shadowColor: '#0EA5A4', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
    marginTop: 8, marginBottom: 32, alignItems: 'center',
  },
  signInButtonDisabled: { opacity: 0.7 },
  signInText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },

  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  orText: { marginHorizontal: 14, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 1 },

  socialContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  socialButton: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  googleIconBg: {
    backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  googleIconText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  socialButtonText: { fontWeight: '700', color: '#FFFFFF', fontSize: 14 },

  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  registerText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  registerLink: { color: '#0EA5A4', fontWeight: 'bold', fontSize: 14 },
});
