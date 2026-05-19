import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
    label: string;
    variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'muted';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary' }) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'success': return 'bg-status-success/10 text-status-success';
            case 'warning': return 'bg-status-warning/10 text-status-warning';
            case 'error': return 'bg-status-error/10 text-status-error';
            case 'info': return 'bg-status-info/10 text-status-info';
            case 'accent': return 'bg-accent-orange/10 text-accent-orange';
            case 'muted': return 'bg-text-muted/10 text-text-muted';
            default: return 'bg-primary/10 text-primary';
        }
    };

    return (
        <View className={`px-2 py-1 rounded-md ${getVariantStyles().split(' ')[0]}`}>
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${getVariantStyles().split(' ')[1]}`}>
                {label}
            </Text>
        </View>
    );
};
