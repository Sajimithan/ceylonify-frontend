import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, MapPin } from 'lucide-react-native';
import { PlacesAutocompleteInput } from './common/PlacesAutocompleteInput';
import { fetchPlaceDetails, type PlaceSuggestion } from '../lib/googlePlaces';
import { useUserLocation } from '../context/UserLocationContext';
import { gqlFetch } from '../hooks/useGraphQL';
import { useTheme } from '../context/ThemeContext';

const UPDATE_LOCATION_MUTATION = `
  mutation UpdateUserLocation($lat: Float!, $lng: Float!) {
    updateUserLocation(lat: $lat, lng: $lng)
  }
`;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SetMyLocationModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { savedLocation, setSavedLocation, clearSavedLocation } = useUserLocation();
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<PlaceSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setPending(null);
      setError(null);
    }
  }, [visible]);

  function handleSelectSuggestion(suggestion: PlaceSuggestion) {
    setPending(suggestion);
    setError(null);
  }

  async function handleSave() {
    if (!pending) {
      setError('Select a location from the suggestions.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fullName = pending.description.trim() || pending.mainText.trim();
      const details = await fetchPlaceDetails(pending.placeId);
      if (!details?.lat || !details?.lng) {
        throw new Error('Could not load coordinates for that place.');
      }

      const location = {
        label: details.formattedAddress || fullName,
        placeId: pending.placeId,
        lat: details.lat,
        lng: details.lng,
        updatedAt: Date.now(),
      };

      await setSavedLocation(location);
      void gqlFetch(UPDATE_LOCATION_MUTATION, { lat: details.lat, lng: details.lng }).catch(() => {});
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save location.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    setError(null);
    try {
      await clearSavedLocation();
      setQuery('');
      setPending(null);
    } catch {
      setError('Could not clear saved location.');
    } finally {
      setClearing(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Set My Location</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Choose where you are now. Map features will use this instead of GPS when set.
            </Text>

            {savedLocation ? (
              <View style={styles.currentBox}>
                <View style={styles.currentRow}>
                  <MapPin size={16} color="#0EA5A4" />
                  <Text style={[styles.currentLabel, { color: colors.text }]} numberOfLines={2}>
                    {savedLocation.label}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClear}
                  disabled={clearing || saving}
                  style={styles.clearBtn}
                >
                  {clearing
                    ? <ActivityIndicator size="small" color="#EF4444" />
                    : <Text style={styles.clearBtnText}>Clear saved location</Text>}
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Search location</Text>
            <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
              <PlacesAutocompleteInput
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setPending(null);
                  setError(null);
                }}
                onSelectSuggestion={handleSelectSuggestion}
                placeholder="Colombo, Kandy, your hotel…"
                placeholderTextColor={colors.textMuted}
                inputStyle={[styles.searchInput, { color: colors.text }]}
                dropdownMaxHeight={180}
              />
            </View>

            {pending ? (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingLabel}>Selected</Text>
                <Text style={[styles.pendingText, { color: colors.text }]} numberOfLines={2}>
                  {pending.description || pending.mainText}
                </Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.saveBtn, (!pending || saving) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!pending || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>Save as my location</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  currentBox: {
    backgroundColor: '#F0FDF9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 16,
  },
  currentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  currentLabel: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  clearBtn: { alignSelf: 'flex-start' },
  clearBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  searchWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    zIndex: 10,
  },
  searchInput: { fontSize: 15, paddingVertical: 10 },
  pendingBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  pendingLabel: { fontSize: 10, fontWeight: '800', color: '#B45309', marginBottom: 4 },
  pendingText: { fontSize: 13, lineHeight: 18 },
  errorText: { fontSize: 12, color: '#EF4444', marginBottom: 12 },
  saveBtn: {
    backgroundColor: '#0EA5A4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
