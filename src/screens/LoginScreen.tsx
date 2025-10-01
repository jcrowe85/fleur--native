// src/screens/LoginScreen.tsx
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
import { router } from 'expo-router';
import { ImageBackground } from 'react-native';

import { cloudSyncService } from '@/services/cloudSyncService';
import { CustomButton } from '@/components/UI/CustomButton';
import { ScreenScrollView } from '@/components/UI/bottom-space';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 1;
    if (pwd.length >= 12) strength += 1;
    if (/[a-z]/.test(pwd)) strength += 1;
    if (/[A-Z]/.test(pwd)) strength += 1;
    if (/[0-9]/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
    return strength;
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (isSignUp) {
      setPasswordStrength(calculatePasswordStrength(text));
    }
  };

  const handleAuth = async () => {
    // Enhanced validation
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password.');
      return;
    }

    // Password strength validation for sign up
    if (isSignUp && passwordStrength < 3) {
      Alert.alert('Weak Password', 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await cloudSyncService.syncToCloud(email.trim(), password);
      
      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          isSignUp 
            ? 'Account created successfully! Your data has been synced to the cloud.'
            : 'Welcome back! Your data has been synced from the cloud.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/dashboard')
            }
          ]
        );
      } else {
        Alert.alert('Authentication Failed', result.error || 'Failed to authenticate. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Password reset functionality will be available soon. For now, please contact support if you need assistance.',
      [{ text: 'OK' }]
    );
  };

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
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color="white" />
          </Pressable>
          
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Feather name="cloud" size={24} color="white" />
            </View>
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp 
                ? 'Sync your hair care data to the cloud'
                : 'Sign in to access your synced data'
              }
            </Text>
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
                  onChangeText={handlePasswordChange}
                  placeholder={isSignUp ? "Create a password" : "Enter your password"}
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
              
              {/* Password Strength Indicator (only for sign up) */}
              {isSignUp && password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <Text style={styles.passwordStrengthLabel}>Password Strength:</Text>
                  <View style={styles.passwordStrengthBar}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.passwordStrengthSegment,
                          {
                            backgroundColor: passwordStrength >= level 
                              ? passwordStrength < 3 
                                ? '#ff4444' 
                                : passwordStrength < 5 
                                  ? '#ffaa00' 
                                  : '#44ff44'
                              : 'rgba(255,255,255,0.1)'
                          }
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[
                    styles.passwordStrengthText,
                    {
                      color: passwordStrength < 3 
                        ? '#ff4444' 
                        : passwordStrength < 5 
                          ? '#ffaa00' 
                          : '#44ff44'
                    }
                  ]}>
                    {passwordStrength < 3 
                      ? 'Weak' 
                      : passwordStrength < 5 
                        ? 'Good' 
                        : 'Strong'
                    }
                  </Text>
                </View>
              )}
            </View>

            {/* Forgot Password */}
            {!isSignUp && (
              <Pressable onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </Pressable>
            )}
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
              onPress={handleAuth}
              variant="wellness"
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <View style={styles.buttonContent}>
                  <Feather name="cloud" size={14} color="#1a1a1a" />
                  <Text style={styles.authButtonText}>
                    {isSignUp ? 'Create Account & Sync' : 'Sign In & Sync'}
                  </Text>
                </View>
              )}
            </CustomButton>

            <Pressable
              onPress={() => setIsSignUp(!isSignUp)}
              style={styles.switchMode}
            >
              <Text style={styles.switchModeText}>
                {isSignUp 
                  ? 'Already have an account? Sign In'
                  : 'Don\'t have an account? Sign Up'
                }
              </Text>
            </Pressable>

            {!isSignUp && (
              <Pressable
                onPress={() => router.push('/forgot-password')}
                style={styles.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>
                  Forgot password?
                </Text>
              </Pressable>
            )}
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textDecorationLine: 'underline',
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
  authButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchModeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textDecorationLine: 'underline',
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'underline',
  },
  passwordStrengthContainer: {
    marginTop: 6,
  },
  passwordStrengthLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 3,
  },
  passwordStrengthBar: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 3,
  },
  passwordStrengthSegment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },
  passwordStrengthText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
