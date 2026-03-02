import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

// ---------------------------------------------------------------------------
// PromptInput – A premium, auto-growing multiline text input with character
// counter. Used on the Create Podcast screen to capture the user's concept.
// ---------------------------------------------------------------------------

interface PromptInputProps {
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  placeholder?: string;
  editable?: boolean;
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 200;

export default function PromptInput({
  value,
  onChangeText,
  maxLength,
  placeholder = 'A deep dive into the history of space exploration, covering key missions from Apollo to Mars rovers...',
  editable = true,
}: PromptInputProps) {
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);

  const handleContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const contentHeight = e.nativeEvent.contentSize.height;
      const clamped = Math.max(MIN_HEIGHT, Math.min(contentHeight + Spacing.lg, MAX_HEIGHT));
      setInputHeight(clamped);
    },
    [],
  );

  const charCount = value.length;
  const isNearLimit = charCount >= maxLength * 0.9;
  const isAtLimit = charCount >= maxLength;

  return (
    <View style={styles.container}>
      <TextInput
        style={[styles.input, { height: inputHeight }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        maxLength={maxLength}
        multiline
        textAlignVertical="top"
        editable={editable}
        onContentSizeChange={handleContentSizeChange}
        scrollEnabled={inputHeight >= MAX_HEIGHT}
        autoCorrect
        autoCapitalize="sentences"
      />
      <View style={styles.counterRow}>
        <Text
          style={[
            styles.counter,
            isNearLimit && styles.counterWarning,
            isAtLimit && styles.counterLimit,
          ]}
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  input: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    minHeight: MIN_HEIGHT,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  counter: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  counterWarning: {
    color: Colors.warning,
  },
  counterLimit: {
    color: Colors.error,
  },
});
