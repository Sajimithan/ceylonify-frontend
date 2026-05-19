import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShieldAlert, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ForbiddenScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white items-center justify-center px-10">
            <View className="bg-status-error/10 p-6 rounded-full mb-6">
                <ShieldAlert size={64} color="#EF4444" />
            </View>
            <Text className="text-text-primary text-2xl font-black text-center mb-4">Access Denied</Text>
            <Text className="text-text-muted text-center text-lg leading-6 mb-10">
                You don't have permission to access this area. This section is reserved for verified providers and administrators.
            </Text>
            <TouchableOpacity
                onPress={() => router.replace('/(tabs)/home')}
                className="bg-navy px-10 py-4 rounded-pill flex-row items-center"
            >
                <ChevronLeft size={20} color="white" />
                <Text className="text-white font-bold ml-2">Back to Safety</Text>
            </TouchableOpacity>
        </View>
    );
}
