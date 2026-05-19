import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { X, Crown, Shield, Map, Star, Zap, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function PremiumScreen() {
    const router = useRouter();

    const benefits = [
        { icon: <Crown size={24} color="#FF6B35" />, title: 'Exclusive Content', desc: 'Unlock private events & secret locations' },
        { icon: <Map size={24} color="#0EA5A4" />, title: 'Advanced Itineraries', desc: 'Plan complex multi-day island trips' },
        { icon: <Shield size={24} color="#22C55E" />, title: 'Verified Only', desc: 'Access verified-only listings filter' },
        { icon: <Star size={24} color="#F59E0B" />, title: 'Premium Support', desc: '24/7 dedicated traveler assistance' },
        { icon: <Zap size={24} color="#8B5CF6" />, title: 'Priority Booking', desc: 'Skip the queue for popular experiences' },
    ];

    const features = [
        'Unlimited saved listings',
        'Offline maps & guides',
        'Exclusive discounts up to 30%',
        'Early access to new features',
        'Remove all advertisements',
    ];

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.hero}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1544413647-79753c52958d?q=80&w=800' }}
                        style={styles.heroImage}
                    />
                    <View style={styles.heroOverlay}>
                        <Crown size={56} color="#FF6B35" />
                        <Text style={styles.heroTitle}>Ceylonify Premium</Text>
                        <Text style={styles.heroSubtitle}>
                            Elevate your Sri Lankan experience to elite levels
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.closeButton}
                    >
                        <X size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Benefits Section */}
                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Premium Benefits</Text>
                    
                    {benefits.map((item, idx) => (
                        <View key={idx} style={styles.benefitItem}>
                            <View style={styles.benefitIcon}>
                                {item.icon}
                            </View>
                            <View style={styles.benefitContent}>
                                <Text style={styles.benefitTitle}>{item.title}</Text>
                                <Text style={styles.benefitDesc}>{item.desc}</Text>
                            </View>
                        </View>
                    ))}

                    {/* Features List */}
                    <View style={styles.featuresContainer}>
                        <Text style={styles.featuresTitle}>What's Included</Text>
                        {features.map((feature, idx) => (
                            <View key={idx} style={styles.featureItem}>
                                <Check size={20} color="#22C55E" />
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Pricing Cards */}
                    <View style={styles.pricingSection}>
                        {/* Yearly Plan - Featured */}
                        <View style={styles.pricingCardFeatured}>
                            <View style={styles.bestValueBadge}>
                                <Text style={styles.bestValueText}>BEST VALUE</Text>
                            </View>
                            <View style={styles.pricingHeader}>
                                <View>
                                    <Text style={styles.planName}>Yearly Access</Text>
                                    <Text style={styles.planSavings}>Save 17% vs monthly</Text>
                                </View>
                                <View style={styles.priceContainer}>
                                    <Text style={styles.price}>LKR 9,900</Text>
                                    <Text style={styles.pricePeriod}>per year</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.ctaButton}>
                                <Text style={styles.ctaButtonText}>Start 7-Day Free Trial</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Monthly Plan */}
                        <TouchableOpacity style={styles.pricingCardSecondary}>
                            <View style={styles.secondaryPlanContent}>
                                <Text style={styles.secondaryPlanText}>
                                    Try Monthly for LKR 1,200
                                </Text>
                                <Text style={styles.secondaryPlanSubtext}>
                                    Billed monthly • Cancel anytime
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Footer Text */}
                    <Text style={styles.footerText}>
                        Recurring billing. Cancel anytime. By upgrading, you agree to our Terms of Service and Privacy Policy.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    hero: {
        height: 280,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        opacity: 0.6,
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 18, 32, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        marginTop: 16,
    },
    heroSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 24,
    },
    closeButton: {
        position: 'absolute',
        top: 48,
        left: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 8,
        borderRadius: 999,
    },
    content: {
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0B1220',
        marginBottom: 24,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    benefitIcon: {
        backgroundColor: '#F7FAFC',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    benefitContent: {
        flex: 1,
        marginLeft: 16,
    },
    benefitTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0B1220',
        marginBottom: 4,
    },
    benefitDesc: {
        fontSize: 14,
        color: '#667085',
        lineHeight: 20,
    },
    featuresContainer: {
        backgroundColor: '#F7FAFC',
        padding: 20,
        borderRadius: 16,
        marginTop: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    featuresTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0B1220',
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    featureText: {
        fontSize: 14,
        color: '#0B1220',
        flex: 1,
    },
    pricingSection: {
        marginBottom: 32,
    },
    pricingCardFeatured: {
        backgroundColor: '#F7FAFC',
        padding: 24,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#0EA5A4',
        marginBottom: 16,
        shadowColor: '#0EA5A4',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    bestValueBadge: {
        backgroundColor: '#0EA5A4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    bestValueText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    pricingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    planName: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0B1220',
    },
    planSavings: {
        fontSize: 12,
        color: '#22C55E',
        fontWeight: '600',
        marginTop: 4,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 28,
        fontWeight: '900',
        color: '#0B1220',
    },
    pricePeriod: {
        fontSize: 12,
        color: '#667085',
    },
    ctaButton: {
        backgroundColor: '#0EA5A4',
        paddingVertical: 16,
        borderRadius: 999,
        shadowColor: '#0EA5A4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    ctaButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    pricingCardSecondary: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    secondaryPlanContent: {
        alignItems: 'center',
    },
    secondaryPlanText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0B1220',
    },
    secondaryPlanSubtext: {
        fontSize: 12,
        color: '#667085',
        marginTop: 4,
    },
    footerText: {
        fontSize: 12,
        color: '#667085',
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 16,
    },
});
