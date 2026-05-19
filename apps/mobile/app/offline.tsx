import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCcw } from 'lucide-react-native';

export default function OfflineScreen() {
    return (
        <View className="flex-1 bg-background-light items-center justify-center px-10">
            <View className="bg-navy/10 p-6 rounded-full mb-6">
                <WifiOff size={64} color="#0B1220" />
            </View>
            <Text className="text-text-primary text-2xl font-black text-center mb-4">No Internet Connection</Text>
            <Text className="text-text-muted text-center text-lg leading-6 mb-10">
                It looks like you're offline. Don't worry, you can still view your saved experiences and upcoming itineraries.
            </Text>
            <TouchableOpacity
                className="bg-primary px-10 py-4 rounded-pill flex-row items-center shadow-lg shadow-primary/30"
            >
                <RefreshCcw size={20} color="white" />
                <Text className="text-white font-bold ml-2">Try Reconnecting</Text>
            </TouchableOpacity>

            <TouchableOpacity className="mt-6">
                <Text className="text-primary font-bold">View Saved Content</Text>
            </TouchableOpacity>
        </View>
    );
}
