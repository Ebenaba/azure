import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * CustomButton
 * @param {'primary'|'secondary'|'outline'|'ghost'} variant
 * @param {string} title
 * @param {function} onPress
 * @param {boolean} loading
 * @param {boolean} disabled
 * @param {object} style
 * @param {object} textStyle
 * @param {string} leftIcon  - emoji or text icon
 */
const CustomButton = ({
  variant = 'primary',
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  leftIcon,
}) => {
  const { colors } = useTheme();

  const isDisabled = disabled || loading;

  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          opacity: isDisabled ? 0.5 : 1,
        };
      case 'outline':
        return {
          backgroundColor: colors.transparent,
          borderWidth: 2,
          borderColor: isDisabled ? colors.textDisabled : colors.primary,
          opacity: isDisabled ? 0.5 : 1,
        };
      case 'ghost':
        return {
          backgroundColor: colors.transparent,
          opacity: isDisabled ? 0.4 : 1,
        };
      default: // primary
        return {
          backgroundColor: isDisabled ? colors.primaryLighter : colors.primary,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDisabled ? 0 : 0.3,
          shadowRadius: 8,
          elevation: isDisabled ? 0 : 4,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'outline':
        return isDisabled ? colors.textDisabled : colors.primary;
      case 'ghost':
        return isDisabled ? colors.textDisabled : colors.primary;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getContainerStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <Text style={styles.leftIcon}>{leftIcon}</Text>}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leftIcon: { fontSize: 18 },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default CustomButton;
