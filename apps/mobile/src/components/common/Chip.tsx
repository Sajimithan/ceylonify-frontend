import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({ label, selected, onPress, icon }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={0.7}
            className={`flex-row items-center px-4 py-2 mr-2 mb-2 rounded-pill border ${selected
                    ? 'bg-primary border-primary'
                    : 'bg-white border-border'
                }`}
        >
            {icon && <View className="mr-2">{icon}</View>}
            <Text className={`font-medium ${selected ? 'text-white' : 'text-text-primary'}`}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};
