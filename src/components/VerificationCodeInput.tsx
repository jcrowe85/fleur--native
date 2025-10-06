// src/components/VerificationCodeInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface VerificationCodeInputProps {
  onCodeChange: (code: string) => void;
  onComplete: (code: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function VerificationCodeInput({
  onCodeChange,
  onComplete,
  error,
  disabled = false
}: VerificationCodeInputProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleCodeChange = (value: string, index: number) => {
    if (disabled) return;

    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // Handle paste - split the pasted value
      const pastedCode = digit.slice(0, 6).split('');
      const newCode = [...code];
      
      pastedCode.forEach((char, i) => {
        if (i < 6) {
          newCode[i] = char;
        }
      });
      
      setCode(newCode);
      onCodeChange(newCode.join(''));
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedCode.length, 5);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }
      
      // Check if complete
      if (newCode.join('').length === 6) {
        onComplete(newCode.join(''));
      }
      
      return;
    }

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    onCodeChange(newCode.join(''));

    // Auto-focus next input if digit entered
    if (digit && index < 5) {
      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    }

    // Check if complete
    if (newCode.join('').length === 6) {
      onComplete(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input if current is empty
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const clearCode = () => {
    setCode(['', '', '', '', '', '']);
    onCodeChange('');
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputsContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.input,
              error && styles.inputError,
              digit && styles.inputFilled
            ]}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="numeric"
            maxLength={6} // Allow paste
            selectTextOnFocus
            editable={!disabled}
            textAlign="center"
            fontSize={24}
            fontWeight="600"
            color="white"
          />
        ))}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={16} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <Pressable
        style={styles.clearButton}
        onPress={clearCode}
        disabled={disabled}
      >
        <Feather name="x-circle" size={20} color="rgba(255,255,255,0.6)" />
        <Text style={styles.clearButtonText}>Clear</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  input: {
    width: 45,
    height: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
  },
  inputFilled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  inputError: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255,107,107,0.1)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
