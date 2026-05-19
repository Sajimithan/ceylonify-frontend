import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const STEPS = [
    {
        title: 'Explore the Soul of Sri Lanka',
        desc: 'Discover hidden gems from golden beaches to lush tea hills with real-time experience updates.',
        image: 'https://images.unsplash.com/photo-1544413647-79753c52958d?q=80&w=800'
    },
    {
        title: 'Curate Your Journey',
        desc: 'Plan your itinerary with ease. Save experiences and organize your trip date by date.',
        image: 'https://images.unsplash.com/photo-1502680333229-3e3473cd99e7?q=80&w=800'
    },
    {
        title: 'Unlock Exclusive Experiences',
        desc: 'Go premium to access high-end events and private guide services for an elite island experience.',
        image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=800'
    }
];

export default function OnboardingScreen() {
    const [step, setStep] = useState(0);
    const router = useRouter();

    const goToLogin = async () => {
        await AsyncStorage.setItem('onboarding_done', 'true');
        router.push('/(auth)/login');
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            goToLogin();
        }
    };

    return (
        <View style={styles.container}>
            {/* Background Image Area */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: STEPS[step].image }}
                    style={styles.image}
                    contentFit="cover"
                    transition={500}
                />
                {/* Fallback color while loading */}
                <View style={[styles.imageOverlay, { backgroundColor: '#f0f0f0', zIndex: -1 }]} />
            </View>

            {/* Content Sheet */}
            <View style={styles.contentContainer}>
                <View style={styles.paginationContainer}>
                    {STEPS.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.paginationDot,
                                idx === step ? styles.paginationDotActive : styles.paginationDotInactive
                            ]}
                        />
                    ))}
                </View>

                <Text style={styles.title}>{STEPS[step].title}</Text>
                <Text style={styles.description}>{STEPS[step].desc}</Text>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={goToLogin}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleNext}
                        style={styles.nextButton}
                    >
                        <ChevronRight size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    imageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60%', // Image takes top 60%
        backgroundColor: '#f0f0f0', // Placeholder color
    },
    image: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    contentContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%', // Content sheet covers bottom 50% (slightly overlapping image)
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40, // Ensure specific bottom padding for footer
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    paginationContainer: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    paginationDot: {
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    paginationDotActive: {
        width: 40,
        backgroundColor: '#0EA5A4', // primary
    },
    paginationDotInactive: {
        width: 16,
        backgroundColor: '#E5E7EB', // border
    },
    title: {
        fontSize: 30, // text-3xl
        fontWeight: '900', // font-black
        color: '#0B1220', // text-primary
        marginBottom: 16,
    },
    description: {
        fontSize: 18, // text-lg
        lineHeight: 28, // leading-7
        color: '#667085', // text-muted
        marginBottom: 20, // Reduced margin to ensure footer fits
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto', // Push to bottom of content container
    },
    skipText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#667085', // text-muted
        padding: 10, // Easier to hit
    },
    nextButton: {
        backgroundColor: '#0EA5A4', // primary
        padding: 20,
        borderRadius: 999,
        shadowColor: '#0EA5A4',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
});
