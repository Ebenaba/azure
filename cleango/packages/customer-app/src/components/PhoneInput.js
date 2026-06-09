import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const COUNTRY_CODE = '+234';

/**
 * PhoneInput
 * Nigerian phone input with flag + prefix.
 * Strips leading 0 automatically.
 */
const PhoneInput = ({
  value,
  onChangeText,
  placeholder = '0801 234 5678',
  autoFocus = false,
  style,
}) => {
  const { colors } = useTheme();
  const inputRef = useRef(null);

  const handleChange = (text) => {
    // Only digits
    let digits = text.replace(/\D/g, '');
    // Remove leading 234 if user types the country code
    if (digits.startsWith('234')) {
      digits = digits.slice(3);
    }
    // Remove leading 0
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    // Max 10 digits (after stripping)
    digits = digits.slice(0, 10);

    // Format: XXX XXX XXXX
    let formatted = digits;
    if (digits.length > 7) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3)}`;
    }

    onChangeText?.(formatted);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderColor: colors.border, backgroundColor: colors.surface },
        style,
      ]}
      onPress={() => inputRef.current?.focus()}
      activeOpacity={1}
    >
      {/* Flag + Code */}
      <View style={[styles.prefix, { borderRightColor: colors.border }]}>
        <Text style={styles.flag}>🇳🇬</Text>
        <Text style={[styles.code, { color: colors.textPrimary }]}>{COUNTRY_CODE}</Text>
      </View>

      {/* Input */}
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.textPrimary }]}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textHint}
        keyboardType="phone-pad"
        autoFocus={autoFocus}
        maxLength={12} // 10 digits + 2 spaces
        returnKeyType="done"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: '100%',
    borderRightWidth: 1,
    gap: 6,
  },
  flag: { fontSize: 22 },
  code: { fontSize: 15, fontWeight: '700' },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 17,
    letterSpacing: 1,
  },
});

export default PhoneInput;
