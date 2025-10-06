// src/components/CloudSyncPopup.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { cloudSyncService } from '@/services/cloudSyncService';
import { CustomButton } from '@/components/UI/CustomButton';
import { ScreenScrollView } from '@/components/UI/bottom-space';

interface CloudSyncPopupProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export default function CloudSyncPopup({
  visible,
  onClose,
  onSuccess,
  title = "Add Email & Sync",
  message = "Enter your email and password to sync your hair care data to the cloud."
}: CloudSyncPopupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSync = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('=== CLOUD SYNC USING EXISTING SERVICE ===');
      
      // Use the existing cloudSyncService which handles both email linking AND data sync
      const result = await cloudSyncService.syncToCloud(email.trim(), password.trim());
      
      if (result.success) {
        console.log('✅ Cloud sync successful');
        onSuccess();
        resetForm();
      } else {
        console.error('❌ Cloud sync failed:', result.error);
        Alert.alert('Sync Failed', result.error || 'Failed to sync data. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Cloud sync error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/dashboard.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      />
      <StatusBar style="light" />
      
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color="white" />
          </Pressable>
          
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Feather name="cloud" size={24} color="white" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{message}</Text>
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={styles.content}
          bottomExtra={20}
        >
          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={16} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Feather 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={16} 
                    color="rgba(255,255,255,0.6)" 
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Feather 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={16} 
                    color="rgba(255,255,255,0.6)" 
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Benefits */}
          <View style={styles.benefits}>
            <Text style={styles.benefitsTitle}>Why sync your data?</Text>
            <View style={styles.benefitItem}>
              <Feather name="shield" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.benefitText}>Secure cloud backup</Text>
            </View>
            <View style={styles.benefitItem}>
              <Feather name="smartphone" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.benefitText}>Access on any device</Text>
            </View>
            <View style={styles.benefitItem}>
              <Feather name="refresh-cw" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.benefitText}>Automatic sync</Text>
            </View>
            <View style={styles.benefitItem}>
              <Feather name="trending-up" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.benefitText}>Never lose progress</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <CustomButton
              onPress={handleSync}
              variant="wellness"
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <View style={styles.buttonContent}>
                  <Feather name="cloud" size={14} color="#1a1a1a" />
                  <Text style={styles.syncButtonText}>Add Email & Sync</Text>
                </View>
              )}
            </CustomButton>

            <Pressable
              onPress={handleClose}
              style={styles.cancelButton}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120d0a',
  },
  header: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  form: {
    marginBottom: 28,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: 'white',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  benefits: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginLeft: 10,
  },
  actions: {
    gap: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textDecorationLine: 'underline',
  },
});
