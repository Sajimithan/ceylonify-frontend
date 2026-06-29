import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { X, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
  EmailAuthProvider, reauthenticateWithCredential, updatePassword,
} from 'firebase/auth';
import { auth } from '../src/lib/firebase';
import { useTheme } from '../src/context/ThemeContext';

function hasPasswordProvider(): boolean {
  const user = auth?.currentUser;
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === 'password');
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = auth?.currentUser;
  const email = user?.email ?? '';
  const canChangePassword = hasPasswordProvider();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!currentPassword.trim()) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }
    if (!user || !email) {
      setError('You must be signed in to change your password.');
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      const code: string = e?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else if (code === 'auth/weak-password') {
        setError('New password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/requires-recent-login') {
        setError('For security, please log out and sign in again, or use Forgot password to reset via email.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Check your connection.');
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    router.push(`/(auth)/forgot-password${params}` as any);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {!canChangePassword ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Social sign-in account</Text>
              <Text style={styles.infoBody}>
                You signed in with Google or another provider. Password changes are managed through that account, not in Ceylonify.
              </Text>
            </View>
          ) : success ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Password updated</Text>
              <Text style={styles.successBody}>
                Your password has been changed successfully. Use your new password the next time you sign in.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Enter your current password, then choose a new one.
              </Text>

              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                show={showCurrent}
                onToggleShow={() => setShowCurrent(!showCurrent)}
                colors={colors}
                styles={styles}
              />
              <PasswordField
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew(!showNew)}
                colors={colors}
                styles={styles}
              />
              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                show={showConfirm}
                onToggleShow={() => setShowConfirm(!showConfirm)}
                colors={colors}
                styles={styles}
              />

              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.primaryButtonText}>Update Password</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PasswordField({
  label, value, onChangeText, show, onToggleShow, colors, styles,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Lock size={18} color={colors.iconMuted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity onPress={onToggleShow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          {show ? <EyeOff size={18} color={colors.iconMuted} /> : <Eye size={18} color={colors.iconMuted} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16,
      backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    scrollContent: { padding: 24, paddingBottom: 40 },
    subtitle: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginBottom: 24 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 8, marginLeft: 4 },
    inputContainer: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    },
    input: { flex: 1, marginLeft: 10, fontSize: 16, color: colors.text },
    errorBox: {
      backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    },
    errorText: { color: colors.error, fontSize: 13, fontWeight: '600' },
    primaryButton: {
      backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 999,
      alignItems: 'center', marginTop: 8,
    },
    primaryButtonDisabled: { opacity: 0.7 },
    primaryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
    forgotLink: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
    forgotLinkText: { color: colors.primary, fontWeight: 'bold', fontSize: 14 },
    infoBox: {
      backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
      borderColor: colors.border, padding: 20,
    },
    infoTitle: { fontSize: 17, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
    infoBody: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
    successBox: {
      backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
      borderColor: colors.border, padding: 24, alignItems: 'center',
    },
    successTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
    successBody: { fontSize: 14, color: colors.textMuted, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  });
}
