import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Mail, Lock, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={28} color="#0B1220" />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue your Sri Lankan adventure</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Email Input */}
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

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <View style={styles.labelRow}>
                                <Text style={styles.label}>Password</Text>
                                <TouchableOpacity>
                                    <Text style={styles.forgotText}>Forgot?</Text>
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

                        {/* Sign In Button */}
                        <TouchableOpacity
                            onPress={() => router.replace('/(tabs)/home')}
                            style={styles.signInButton}
                        >
                            <Text style={styles.signInText}>Sign In</Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.orText}>OR CONTINUE WITH</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social / Guest Buttons */}
                        <View style={styles.socialContainer}>
                            <TouchableOpacity style={styles.socialButton}>
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

                    {/* Register Link */}
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
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 32,
        paddingTop: 60, // Safe area + spacing
        paddingBottom: 40,
    },
    backButton: {
        marginBottom: 32,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 30, // text-3xl
        fontWeight: '900', // font-black
        color: '#0B1220', // text-primary
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16, // text-base
        color: '#667085', // text-muted
        lineHeight: 24,
    },
    form: {
        // space-y-6 equivalent handled by margins in items
    },
    inputGroup: {
        marginBottom: 24,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0B1220', // text-primary
        marginBottom: 8,
        marginLeft: 4,
    },
    forgotText: {
        fontSize: 12, // text-xs
        fontWeight: 'bold',
        color: '#0EA5A4', // primary
        textTransform: 'uppercase',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFC', // background-light
        borderWidth: 1,
        borderColor: '#E5E7EB', // border
        borderRadius: 12, // rounded-input (made up, assumed 12)
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#0B1220', // text-primary
    },
    signInButton: {
        backgroundColor: '#0EA5A4', // primary
        paddingVertical: 16,
        borderRadius: 999, // rounded-pill
        shadowColor: '#0EA5A4',
        shadowOffset: { width: 0, height: 4 }, // reduced shadow
        shadowOpacity: 0.2, // reduced opacity
        shadowRadius: 8,
        elevation: 5,
        marginTop: 8,
        marginBottom: 32,
    },
    signInText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB', // border
    },
    orText: {
        marginHorizontal: 16,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#667085', // text-muted
        textTransform: 'uppercase',
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        gap: 16, // Requires newer React Native, but handy. Fallback: margin?
    },
    socialButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB', // border
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8, // gap fallback
    },
    googleIconBg: {
        backgroundColor: '#EF4444', // red-500
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    googleIconText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    socialButtonText: {
        fontWeight: 'bold',
        color: '#0B1220', // text-primary
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
    },
    registerText: {
        color: '#667085', // text-muted
        fontSize: 14,
    },
    registerLink: {
        color: '#0EA5A4', // primary
        fontWeight: 'bold',
        fontSize: 14,
    },
});
