import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { usePlacesAutocomplete } from '../../hooks/usePlacesAutocomplete';
import { type PlaceSuggestion } from '../../lib/googlePlaces';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (text: string) => void;
  onSelectSuggestion?: (suggestion: PlaceSuggestion) => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  dropdownMaxHeight?: number;
};

export function PlacesAutocompleteInput({
  value,
  onChangeText,
  onSelectSuggestion,
  containerStyle,
  inputStyle,
  dropdownMaxHeight = 220,
  onFocus,
  onBlur,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);
  const { suggestions, loading, clearSuggestions } = usePlacesAutocomplete(value, focused);

  const showDropdown = focused && value.trim().length >= 2 && (loading || suggestions.length > 0);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <TextInput
        {...inputProps}
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, inputStyle]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setTimeout(() => setFocused(false), 250);
          onBlur?.(event);
        }}
      />

      {showDropdown && (
        <View style={[styles.dropdown, { maxHeight: dropdownMaxHeight }]}>
          {loading && suggestions.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#0EA5A4" />
              <Text style={styles.loadingText}>Searching Sri Lanka…</Text>
            </View>
          ) : (
            suggestions.map((item) => (
              <Pressable
                key={item.placeId}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  pressed && styles.suggestionRowPressed,
                ]}
                onPressIn={() => {
                  const fullName = item.description.trim() || item.mainText.trim();
                  onChangeText(fullName);
                  clearSuggestions();
                  setFocused(false);
                  onSelectSuggestion?.(item);
                }}
              >
                <MapPin size={14} color="#0EA5A4" style={styles.suggestionIcon} />
                <View style={styles.suggestionTextWrap}>
                  <Text style={styles.suggestionMain} numberOfLines={1}>{item.mainText}</Text>
                  {item.secondaryText ? (
                    <Text style={styles.suggestionSecondary} numberOfLines={1}>{item.secondaryText}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: 'relative',
    zIndex: 20,
  },
  input: {
    fontSize: 15,
    color: '#0B1220',
    paddingVertical: 0,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
    zIndex: 30,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  loadingText: { fontSize: 12, color: '#667085', fontWeight: '600' },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionRowPressed: { backgroundColor: '#F0FDF9' },
  suggestionIcon: { marginRight: 10 },
  suggestionTextWrap: { flex: 1 },
  suggestionMain: { fontSize: 13, fontWeight: '700', color: '#0B1220' },
  suggestionSecondary: { fontSize: 11, color: '#667085', marginTop: 1 },
});
