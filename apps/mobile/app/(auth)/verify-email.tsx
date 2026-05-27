import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Mail } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../src/lib/firebase';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function handleResend() {
    if (!auth?.currentUser) return;
    setResendLoading(true);
    setResendMsg(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setResendMsg('Verification email sent!');
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Mail size={40} color="#0EA5A4" />
        </View>

        <Text style={styles.title}>Check your inbox</Text>

        <Text style={styles.body}>
          We sent a verification link to{'\n'}
          <Text style={styles.emailHighlight}>{email ?? 'your email address'}</Text>
          {'\n\n'}
          Tap the link in the email to verify your account. Check your spam folder if you don't see it.
        </Text>

        {/* Resend */}
        <TouchableOpacity
          onPress={handleResend}
          disabled={resendLoading}
          style={styles.resendButton}
        >
          {resendLoading
            ? <ActivityIndicator size="small" color="#0EA5A4" />
            : <Text style={styles.resendButtonText}>Resend Email</Text>
          }
        </TouchableOpacity>

        {resendMsg && (
          <Text style={[
            styles.resendMsg,
            resendMsg.includes('Failed') ? styles.resendMsgError : styles.resendMsgOk,
          ]}>
            {resendMsg}
          </Text>
        )}

        {/* Continue anyway */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text style={styles.continueButtonText}>Continue anyway</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          You can always verify later from your profile.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    flex: 1, paddingHorizontal: 32,
    alignItems: 'center', justifyContent: 'center',
    paddingBottom: 40,
  },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#E0F6F6',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28, fontWeight: '900', color: '#0B1220',
    marginBottom: 16, textAlign: 'center',
  },
  body: {
    fontSize: 15, color: '#667085', lineHeight: 24,
    textAlign: 'center', marginBottom: 32,
  },
  emailHighlight: { color: '#0B1220', fontWeight: 'bold' },
  resendButton: {
    borderWidth: 1.5, borderColor: '#0EA5A4',
    paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 999, alignItems: 'center', marginBottom: 12,
    minWidth: 160,
  },
  resendButtonText: { color: '#0EA5A4', fontWeight: 'bold', fontSize: 15 },
  resendMsg: { fontSize: 13, fontWeight: '600', marginBottom: 24 },
  resendMsgOk: { color: '#059669' },
  resendMsgError: { color: '#DC2626' },
  continueButton: {
    backgroundColor: '#0EA5A4', paddingVertical: 16, paddingHorizontal: 48,
    borderRadius: 999, alignItems: 'center', marginBottom: 16,
    shadowColor: '#0EA5A4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
  },
  continueButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
  footerNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
});
