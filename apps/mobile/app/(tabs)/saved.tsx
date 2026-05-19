import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Bookmark, Calendar, MoreVertical, Plus, MapPin, Heart } from 'lucide-react-native';

export default function SavedScreen() {
    const [activeTab, setActiveTab] = useState<'saved' | 'itinerary'>('saved');

    // Mock saved items - in production, fetch from AsyncStorage or backend
    const savedListings: any[] = [];

    const itineraryItems = [
        { 
            date: 'Oct 24, 2025', 
            items: [
                { id: '1', title: 'Sigiriya Rock Fortress', location: 'Sigiriya', time: '9:00 AM' }
            ] 
        },
        { 
            date: 'Oct 25, 2025', 
            items: [
                { id: '2', title: 'Temple of the Tooth', location: 'Kandy', time: '10:00 AM' }
            ] 
        },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Your Trips</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    onPress={() => setActiveTab('saved')}
                    style={[
                        styles.tab,
                        activeTab === 'saved' && styles.activeTab
                    ]}
                >
                    <View style={styles.tabContent}>
                        <Bookmark size={16} color={activeTab === 'saved' ? '#0EA5A4' : '#667085'} />
                        <Text style={[
                            styles.tabText,
                            activeTab === 'saved' && styles.activeTabText
                        ]}>Saved</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('itinerary')}
                    style={[
                        styles.tab,
                        activeTab === 'itinerary' && styles.activeTab
                    ]}
                >
                    <View style={styles.tabContent}>
                        <Calendar size={16} color={activeTab === 'itinerary' ? '#0EA5A4' : '#667085'} />
                        <Text style={[
                            styles.tabText,
                            activeTab === 'itinerary' && styles.activeTabText
                        ]}>Itinerary</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {activeTab === 'saved' ? (
                <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
                    {savedListings.length > 0 ? (
                        savedListings.map((listing: any) => (
                            <View key={listing.id} style={styles.listingCard}>
                                <Text>{listing.title}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Heart size={64} color="#E5E7EB" />
                            <Text style={styles.emptyTitle}>No saved experiences yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Tap the heart icon on listings to save them here
                            </Text>
                        </View>
                    )}
                </ScrollView>
            ) : (
                <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
                    {itineraryItems.length > 0 ? (
                        itineraryItems.map((day, idx) => (
                            <View key={idx} style={styles.daySection}>
                                <View style={styles.dayHeader}>
                                    <Text style={styles.dayDate}>{day.date}</Text>
                                    <TouchableOpacity>
                                        <MoreVertical size={20} color="#667085" />
                                    </TouchableOpacity>
                                </View>
                                {day.items.map((item: any, iIdx) => (
                                    <View key={iIdx} style={styles.itineraryItem}>
                                        <View style={styles.itineraryIcon}>
                                            <MapPin size={24} color="#0EA5A4" />
                                        </View>
                                        <View style={styles.itineraryContent}>
                                            <Text style={styles.itineraryTitle} numberOfLines={1}>
                                                {item.title}
                                            </Text>
                                            <Text style={styles.itineraryMeta}>
                                                {item.location} • {item.time}
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={styles.addButton}>
                                            <Plus size={16} color="#0EA5A4" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Calendar size={64} color="#E5E7EB" />
                            <Text style={styles.emptyTitle}>Your itinerary is empty</Text>
                            <TouchableOpacity style={styles.planButton}>
                                <Text style={styles.planButtonText}>Plan a Trip</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFC',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0B1220',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginTop: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#0EA5A4',
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#667085',
    },
    activeTabText: {
        color: '#0EA5A4',
    },
    content: {
        flex: 1,
    },
    contentPadding: {
        padding: 24,
    },
    listingCard: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 12,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0B1220',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#667085',
        marginTop: 8,
        textAlign: 'center',
    },
    daySection: {
        marginBottom: 32,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dayDate: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0B1220',
    },
    itineraryItem: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    itineraryIcon: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#E0F6F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itineraryContent: {
        flex: 1,
        marginLeft: 16,
    },
    itineraryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0B1220',
    },
    itineraryMeta: {
        fontSize: 12,
        color: '#667085',
        marginTop: 4,
    },
    addButton: {
        backgroundColor: '#F7FAFC',
        padding: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    planButton: {
        marginTop: 16,
        backgroundColor: '#0EA5A4',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 999,
    },
    planButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
