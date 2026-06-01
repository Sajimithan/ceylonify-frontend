import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width, height } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Hero background */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1544413647-79753c52958d?q=80&w=900' }}
        style={styles.bg}
        contentFit="cover"
      />
      <View style={styles.overlay} />

      {/* Brand */}
      <View style={styles.brandArea}>
        <Text style={styles.brandTag}>DISCOVER SRI LANKA</Text>
        <Text style={styles.brandName}>Ceylonify</Text>
        <Text style={styles.brandSub}>
          Authentic experiences, hidden gems, and unforgettable moments — all in one app.
        </Text>
      </View>

      {/* CTA */}
      <View style={styles.ctaArea}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>© {new Date().getFullYear()} Ceylonify</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  bg: { ...StyleSheet.absoluteFillObject },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,32,0.62)',
  },
  brandArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  brandTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0EA5A4',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  brandName: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 56,
    marginBottom: 16,
  },
  brandSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 24,
  },
  ctaArea: {
    paddingHorizontal: 32,
    paddingBottom: 52,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0EA5A4',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: '#0EA5A4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  secondaryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 8,
  },
});
