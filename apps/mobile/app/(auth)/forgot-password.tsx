import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Mail, ChevronLeft, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/login');
    }
  }

  async function handleSend() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth!, email.trim());
      setSent(true);
    } catch (e: any) {
      const code: string = e?.code ?? '';
      if (code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIconCircle}>
            <CheckCircle size={40} color="#0EA5A4" />
          </View>
          <Text style={styles.successTitle}>Check your inbox</Text>
          <Text style={styles.successBody}>
            We've sent a password reset link to{'\n'}
            <Text style={styles.emailHighlight}>{email.trim()}</Text>
            {'\n\n'}Follow the link in the email to set a new password. Check your spam folder if you don't see it.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.signInText}>Back to Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setSent(false); setEmail(''); }}
            style={styles.retryLink}
          >
            <Text style={styles.retryLinkText}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={28} color="#0B1220" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your registered email and we'll send you a link to reset your password.
            </Text>
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
                  autoFocus
                />
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.sendButtonText}>Send Reset Link</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardView: { flex: 1 },
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
  sendButton: {
    backgroundColor: '#0EA5A4', paddingVertical: 16, borderRadius: 999,
    alignItems: 'center', shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    marginTop: 8, marginBottom: 32,
  },
  sendButtonDisabled: { opacity: 0.7 },
  sendButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: '#667085', fontSize: 14 },
  loginLink: { color: '#0EA5A4', fontWeight: 'bold', fontSize: 14 },
  // Success state
  successContent: { flex: 1, paddingHorizontal: 32, paddingTop: 100, alignItems: 'center' },
  successIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#E0F6F6', alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  successTitle: { fontSize: 28, fontWeight: '900', color: '#0B1220', marginBottom: 16, textAlign: 'center' },
  successBody: { fontSize: 15, color: '#667085', lineHeight: 24, textAlign: 'center', marginBottom: 40 },
  emailHighlight: { color: '#0B1220', fontWeight: 'bold' },
  signInButton: {
    backgroundColor: '#0EA5A4', paddingVertical: 16, paddingHorizontal: 48,
    borderRadius: 999, alignItems: 'center', marginBottom: 16,
    shadowColor: '#0EA5A4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  signInText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
  retryLink: { paddingVertical: 8 },
  retryLinkText: { color: '#667085', fontSize: 14, fontWeight: '600' },
});
