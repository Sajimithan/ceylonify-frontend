import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Mail, Lock, ChevronLeft, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
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

  async function handleRegister() {
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setError(null);
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth!, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await sendEmailVerification(credential.user).catch(() => {});
      router.replace({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
    } catch (e: any) {
      const code: string = e?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the companion for your Sri Lankan tour</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="rgba(255,255,255,0.6)" />
                <TextInput
                  placeholder="John Doe"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>
            </View>

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
              <Text style={styles.label}>Password</Text>
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
              onPress={handleRegister}
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.submitButtonText}>Create Account</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
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
  label: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginLeft: 2, marginBottom: 8, letterSpacing: 0.3 },

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

  submitButton: {
    backgroundColor: '#0EA5A4', paddingVertical: 17, borderRadius: 999,
    shadowColor: '#0EA5A4', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
    marginTop: 24, alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },

  loginContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, marginBottom: 20 },
  loginText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  loginLink: { color: '#0EA5A4', fontWeight: 'bold', fontSize: 14 },
});
