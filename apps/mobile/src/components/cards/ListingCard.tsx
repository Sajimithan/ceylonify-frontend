import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, MapPin, Lock, ShieldCheck } from 'lucide-react-native';
import { Listing } from '../../data/seedListings';
import { Badge } from '../common/Badge';
import { BlurView } from 'expo-blur';

interface ListingCardProps {
    listing: Listing;
    horizontal?: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, horizontal }) => {
    const router = useRouter();
    const isPremium = listing.isVisible === 'premium_only';

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            className={`bg-white rounded-card overflow-hidden shadow-sm mb-4 ${horizontal ? 'w-72 mr-4' : 'w-full'}`}
            onPress={() => router.push(`/listing/${listing.id}`)}
        >
            <View className="relative h-44">
                <Image
                    source={typeof listing.images[0] === 'string' ? { uri: listing.images[0] } : listing.images[0]}
                    className="w-full h-full"
                    resizeMode="cover"
                />

                {/* Badges */}
                <View className="absolute top-3 left-3 flex-row space-x-2">
                    {listing.isVerified && (
                        <View className="bg-status-success px-2 py-1 rounded-md flex-row items-center">
                            <ShieldCheck size={12} color="white" />
                            <Text className="text-white text-[10px] font-bold ml-1">VERIFIED</Text>
                        </View>
                    )}
                    {isPremium && (
                        <View className="bg-accent-orange px-2 py-1 rounded-md flex-row items-center">
                            <Lock size={12} color="white" />
                            <Text className="text-white text-[10px] font-bold ml-1">PREMIUM</Text>
                        </View>
                    )}
                </View>

                {/* Rating Badge */}
                <View className="absolute top-3 right-3 bg-white/90 px-2 py-1 rounded-md flex-row items-center">
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text className="text-text-primary text-[11px] font-bold ml-1">{listing.rating}</Text>
                </View>

                {/* Price Tag */}
                <View className="absolute bottom-3 right-3 bg-navy/80 px-3 py-1 rounded-pill">
                    <Text className="text-white text-[12px] font-bold">{listing.price}</Text>
                </View>
            </View>

            <View className="p-4">
                <View className="flex-row items-center mb-1">
                    <Text className="text-primary text-[11px] font-bold uppercase tracking-wider">{listing.category}</Text>
                    <Text className="text-text-muted text-[11px] mx-1">•</Text>
                    <Text className="text-text-muted text-[11px]">{listing.dateText || listing.duration}</Text>
                </View>

                <Text className="text-text-primary text-lg font-bold mb-1" numberOfLines={1}>
                    {listing.title}
                </Text>

                <View className="flex-row items-center">
                    <MapPin size={14} color="#667085" />
                    <Text className="text-text-muted text-sm ml-1" numberOfLines={1}>
                        {listing.venueName || listing.locationName}{listing.distance ? ` • ${listing.distance} away` : ''}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};
