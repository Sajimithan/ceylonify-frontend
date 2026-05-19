import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft, Bell, Calendar, Info, ShieldCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
    const router = useRouter();

    const notifications = [
        {
            id: '1',
            title: 'Trip Starting Soon!',
            body: 'Your journey to Galle Fort starts in 2 hours. Don\'t forget your camera!',
            time: '1h ago',
            icon: <Calendar size={20} color="#0EA5A4" />,
            read: false
        },
        {
            id: '2',
            title: 'New Content Unlocked',
            body: 'As a premium member, you now have access to "Secret Sunset in Hikkaduwa".',
            time: '3h ago',
            icon: <ShieldCheck size={20} color="#22C55E" />,
            read: true
        },
        {
            id: '3',
            title: 'Weather Update',
            body: 'Rain expected in Kandy today. We recommend indoor activities.',
            time: '5h ago',
            icon: <Info size={20} color="#F59E0B" />,
            read: true
        },
    ];

    return (
        <View className="flex-1 bg-white">
            <View className="px-6 py-4 flex-row items-center border-b border-border">
                <TouchableOpacity onPress={() => router.back()}>
                    <ChevronLeft size={24} color="#0B1220" />
                </TouchableOpacity>
                <Text className="text-text-primary text-xl font-bold ml-4">Notifications</Text>
            </View>

            <ScrollView className="flex-1">
                {notifications.length > 0 ? (
                    notifications.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            className={`px-6 py-5 border-b border-border flex-row ${item.read ? 'opacity-60' : 'bg-primary/5'}`}
                        >
                            <View className="bg-white p-3 rounded-2xl border border-border self-start shadow-sm">
                                {item.icon}
                            </View>
                            <View className="flex-1 ml-4">
                                <View className="flex-row justify-between items-start">
                                    <Text className={`text-text-primary text-base ${item.read ? 'font-medium' : 'font-bold'}`}>{item.title}</Text>
                                    <Text className="text-text-muted text-[10px] mt-1">{item.time}</Text>
                                </View>
                                <Text className="text-text-muted text-sm mt-1 leading-5">{item.body}</Text>
                            </View>
                            {!item.read && <View className="w-2 h-2 bg-primary rounded-full ml-2 mt-2" />}
                        </TouchableOpacity>
                    ))
                ) : (
                    <View className="flex-1 items-center justify-center pt-40">
                        <Bell size={48} color="#E5E7EB" />
                        <Text className="text-text-muted mt-4 font-bold">Inbox is empty</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
