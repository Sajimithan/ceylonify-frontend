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

      const data = await gqlFetch<{ me: { role: string } | null }>(ME_QUERY);
      const role = data?.me?.role;

      if (role === 'HOST' || role === 'ADMIN') {
        await auth!.signOut();
        Alert.alert(
          'Web Dashboard Required',
          'Your account has host or admin access. Please sign in at the Ceylonify web dashboard to manage your listings.',
          [{ text: 'OK' }],
        );
        return;
      }

      router.replace('/(tabs)/home');
    } catch (e: any) {
      const code: string = e?.code ?? '';
      console.error('🔐 Login error code:', code, e?.message);
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError(`Invalid email or password. (${code})`);
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError(`Sign in failed: ${code || e?.message || 'unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
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
              <Text style={styles.label}>Email Address</Text>
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
              <Text style={styles.label}>Password</Text>
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
  label: { fontSize: 14, fontWeight: 'bold', color: '#0B1220', marginBottom: 8, marginLeft: 4 },
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
});
