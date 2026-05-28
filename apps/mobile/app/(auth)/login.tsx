import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
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

    // FCM token registration — web only (firebase/messaging uses browser APIs not available in React Native)
    if (Platform.OS === 'web') {
      void (async () => {
        try {
          const { getMessaging, getToken } = await import('firebase/messaging');
          const token = await getToken(getMessaging());
          if (token) {
            await gqlFetch(`mutation RegisterDeviceToken($token: String!) { registerDeviceToken(token: $token) }`, { token });
          }
        } catch {
          // permission denied or unsupported — skip
        }
      })();
    }

    setLoading(false);
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={28} color="#0B1220" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your Sri Lankan adventure</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { marginBottom: 8 }]}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#667085" />
                <TextInput
                  placeholder="name@example.com"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#667085" />
                <TextInput
                  placeholder="••••••••"
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#9CA3AF"
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

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social / Guest Buttons */}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: { paddingHorizontal: 32, paddingTop: 60, paddingBottom: 40 },
  backButton: { marginBottom: 32 },
  header: { marginBottom: 40 },
  title: { fontSize: 30, fontWeight: '900', color: '#0B1220', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#667085', lineHeight: 24 },
  form: {},
  inputGroup: { marginBottom: 24 },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#0B1220', marginLeft: 4 },
  forgotLink: { fontSize: 12, fontWeight: 'bold', color: '#0EA5A4' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0B1220' },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  signInButton: {
    backgroundColor: '#0EA5A4', paddingVertical: 16, borderRadius: 999,
    shadowColor: '#0EA5A4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    marginTop: 8, marginBottom: 32, alignItems: 'center',
  },
  signInButtonDisabled: { opacity: 0.7 },
  signInText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
  registerText: { color: '#667085', fontSize: 14 },
  registerLink: { color: '#0EA5A4', fontWeight: 'bold', fontSize: 14 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orText: { marginHorizontal: 16, fontSize: 12, fontWeight: 'bold', color: '#667085', textTransform: 'uppercase' },
  socialContainer: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  socialButton: {
    flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 999,
    borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  googleIconBg: {
    backgroundColor: '#EF4444', width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  googleIconText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  socialButtonText: { fontWeight: 'bold', color: '#0B1220', fontSize: 14 },
});
