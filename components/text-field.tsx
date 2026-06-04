import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { palette } from '@/lib/theme';

type TextFieldProps = {
  label: string;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'off';
  keyboardType?: 'default' | 'email-address';
  returnKeyType?: 'done' | 'go' | 'next' | 'search';
  placeholder: string;
  value: string;
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  rightActionLabel?: string;
  onRightActionPress?: () => void;
};

export function TextField({
  label,
  error,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  keyboardType = 'default',
  returnKeyType = 'done',
  placeholder,
  value,
  onBlur,
  onChangeText,
  onSubmitEditing,
  rightActionLabel,
  onRightActionPress,
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputError]}>
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          onBlur={onBlur}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={palette.mutedText}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
        />
        {rightActionLabel && onRightActionPress ? (
          <Pressable onPress={onRightActionPress} style={styles.rightAction}>
            <Text style={styles.rightActionLabel}>{rightActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputShell: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    color: palette.text,
    flex: 1,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: palette.danger,
  },
  rightAction: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rightActionLabel: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    color: palette.danger,
    fontSize: 13,
    marginTop: 6,
  },
});
