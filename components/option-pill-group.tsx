import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '@/lib/theme';

type Option = {
  label: string;
  value: string;
};

type OptionPillGroupProps = {
  options: Option[];
  selectedValue: string;
  onChange: (value: string) => void;
};

export function OptionPillGroup({ options, selectedValue, onChange }: OptionPillGroupProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = selectedValue === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.pill, selected && styles.selectedPill]}>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedPill: {
    backgroundColor: palette.primary,
  },
  label: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  selectedLabel: {
    color: '#FFFFFF',
  },
});
