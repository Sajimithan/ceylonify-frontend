import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MapPin, Trash2 } from 'lucide-react-native';
import { formatPlannedDateLabel, getPlannedDateKey } from '../lib/routePlan';

export type RoutePlanStopView = {
  id: string;
  stopKey: string;
  kind: 'event' | 'custom';
  title: string;
  placeName?: string | null;
  plannedDate: string;
  imageUrl?: string | null;
  lat?: number;
  lng?: number;
  itineraryItemId?: string;
  customId?: string;
};

type Props = {
  stops: RoutePlanStopView[];
  onRemoveEvent: (itemId: string) => void;
  onRemoveCustom: (customId: string) => void;
  fixImageUrl: (url?: string | null) => string | null;
};

export function RoutePlanStopList({
  stops,
  onRemoveEvent,
  onRemoveCustom,
  fixImageUrl,
}: Props) {
  return (
    <View style={styles.list}>
      {stops.map((stop, idx) => {
        const isCustom = stop.kind === 'custom';
        const imageUrl = stop.imageUrl ? fixImageUrl(stop.imageUrl) : null;

        return (
          <View key={stop.stopKey} style={styles.itemWrap}>
            <View style={styles.banner}>
              <View style={[
                styles.orderBadge,
                isCustom && styles.orderBadgeDestination,
              ]}>
                <Text style={styles.orderBadgeText}>{idx + 1}</Text>
              </View>

              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  {isCustom && stop.lat === 0 && stop.lng === 0 ? (
                    <ActivityIndicator size="small" color="#0EA5A4" />
                  ) : (
                    <MapPin size={22} color="#0EA5A4" />
                  )}
                </View>
              )}

              <View style={styles.content}>
                <View style={[
                  styles.kindBadge,
                  isCustom ? styles.kindBadgeDestination : styles.kindBadgeEvent,
                ]}>
                  <Text style={[
                    styles.kindBadgeText,
                    isCustom ? styles.kindBadgeTextDestination : styles.kindBadgeTextEvent,
                  ]}>
                    {isCustom ? 'DESTINATION' : 'EVENT'}
                  </Text>
                </View>
                <Text style={styles.title} numberOfLines={1}>{stop.title}</Text>
                {stop.placeName ? (
                  <Text style={styles.meta} numberOfLines={1}>📍 {stop.placeName}</Text>
                ) : null}
                <Text style={styles.date}>
                  {formatPlannedDateLabel(getPlannedDateKey(stop.plannedDate))}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (isCustom && stop.customId) {
                    onRemoveCustom(stop.customId);
                  } else if (stop.itineraryItemId) {
                    onRemoveEvent(stop.itineraryItemId);
                  }
                }}
                style={styles.removeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 0, marginBottom: 12 },
  itemWrap: { marginBottom: 12 },
  banner: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0EA5A4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  orderBadgeDestination: { backgroundColor: '#F59E0B' },
  orderBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    flexShrink: 0,
  },
  thumbPlaceholder: {
    backgroundColor: '#E0F6F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, marginLeft: 12, paddingTop: 2, minHeight: 56 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#0B1220', marginBottom: 2, paddingRight: 76 },
  meta: { fontSize: 11, color: '#667085', marginBottom: 2 },
  date: { fontSize: 10, color: '#0EA5A4', fontWeight: '600' },
  kindBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    zIndex: 2,
  },
  kindBadgeEvent: { backgroundColor: 'rgba(14,165,164,0.15)' },
  kindBadgeDestination: { backgroundColor: 'rgba(245,158,11,0.18)' },
  kindBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  kindBadgeTextEvent: { color: '#0EA5A4' },
  kindBadgeTextDestination: { color: '#B45309' },
  removeBtn: { padding: 6, marginLeft: 4 },
});
