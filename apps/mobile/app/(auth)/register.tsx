import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Mail, Lock, ChevronLeft, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
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
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join the companion for your Sri Lankan tour</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Name Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={styles.inputContainer}>
                                <User size={20} color="#667085" />
                                <TextInput
                                    placeholder="John Doe"
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

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

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={() => router.replace('/(tabs)/home')}
                            style={styles.submitButton}
                        >
                            <Text style={styles.submitButtonText}>Create Account</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Login Link */}
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
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 32,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        marginBottom: 32,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 30,
        fontWeight: '900',
        color: '#0B1220', // text-primary
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#667085', // text-muted
        lineHeight: 24,
    },
    form: {
        // space-y-5 equivalent
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0B1220',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFC', // background-light
        borderWidth: 1,
        borderColor: '#E5E7EB', // border
        borderRadius: 12, // rounded-input
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#0B1220',
    },
    submitButton: {
        backgroundColor: '#0EA5A4', // primary
        paddingVertical: 16,
        borderRadius: 999, // rounded-pill
        shadowColor: '#0EA5A4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        marginTop: 24,
    },
    submitButtonText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 18,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 48,
        marginBottom: 40,
    },
    loginText: {
        color: '#667085',
        fontSize: 14,
    },
    loginLink: {
        color: '#0EA5A4',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
