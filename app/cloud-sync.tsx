// app/cloud-sync.tsx
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
import { emailVerificationService } from '@/services/emailVerificationService';
import { CustomButton } from '@/components/UI/CustomButton';
import { ScreenScrollView } from '@/components/UI/bottom-space';
import { useAuthStore } from '@/state/authStore';
import VerificationCodeInput from '@/components/VerificationCodeInput';

export default function CloudSyncScreen() {
  const { signOut } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Verification state
  const [step, setStep] = useState<'email' | 'verification'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleEmailSubmit = async () => {
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
      // Send verification code
      const result = await emailVerificationService.sendVerificationCode(email.trim());
      
      if (result.success) {
        console.log('✅ Verification code sent');
        setStep('verification');
        setResendCooldown(60); // 60 second cooldown
        startResendCooldown();
      } else {
        console.error('❌ Failed to send verification code:', result.error);
        Alert.alert('Error', result.error || 'Failed to send verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error sending verification code:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationCodeChange = (code: string) => {
    setVerificationCode(code);
    setVerificationError('');
  };

  const handleVerificationComplete = async (code: string) => {
    if (code.length !== 6) return;

    setIsVerifying(true);
    setVerificationError('');

    try {
      // Verify the code
      const verifyResult = await emailVerificationService.verifyCode(email.trim(), code);
      
      if (verifyResult.success) {
        console.log('✅ Verification code verified');
        
        // Now proceed with cloud sync
        const syncResult = await cloudSyncService.syncToCloud(email.trim(), password.trim());
        
        if (syncResult.success) {
          console.log('✅ Cloud sync successful');
          handleSyncSuccess();
          resetForm();
        } else {
          console.error('❌ Cloud sync failed:', syncResult.error);
          Alert.alert('Sync Failed', syncResult.error || 'Failed to sync data. Please try again.');
        }
      } else {
        console.error('❌ Verification failed:', verifyResult.error);
        setVerificationError(verifyResult.error || 'Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error during verification:', error);
      setVerificationError('An unexpected error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);

    try {
      const result = await emailVerificationService.sendVerificationCode(email.trim());
      
      if (result.success) {
        console.log('✅ Verification code resent');
        setResendCooldown(60);
        startResendCooldown();
        setVerificationError('');
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Error resending verification code:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startResendCooldown = () => {
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSyncSuccess = async () => {
    // Show success message with clear explanation
    Alert.alert(
      "Account Synced! 🎉", 
      "Your email has been successfully linked and your data is backed up!\n\nPlease check your spam/junk folder if you don't see the verification email.\n\nYour session will now end so you can sign in with your new email and password. This is normal and expected.",
      [
        {
          text: "Sign In with New Email",
          onPress: async () => {
            // Sign out and redirect to welcome screen
            // This is necessary because the session becomes invalid after email update
            await signOut();
            router.replace("/");
          }
        }
      ]
    );
    
    console.log('Email linked successfully - user signed out to use new credentials');
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setStep('email');
    setVerificationCode('');
    setVerificationError('');
    setResendCooldown(0);
    setIsVerifying(false);
  };

  const handleClose = () => {
    resetForm();
    router.push('/(app)/profile');
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/dashboard.png')}
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
            <Text style={styles.title}>
              {step === 'email' ? 'Add Email & Sync' : 'Verify Your Email'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email' 
                ? 'Enter your email and password to sync your hair care data to the cloud.'
                : `We've sent a 6-digit verification code to ${email}. Please enter it below to complete the sync.`
              }
            </Text>
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={styles.content}
          bottomExtra={20}
        >
          {step === 'email' ? (
            /* Email/Password Form */
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
          ) : (
            /* Verification Code Form */
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <VerificationCodeInput
                  onCodeChange={handleVerificationCodeChange}
                  onComplete={handleVerificationComplete}
                  error={verificationError}
                  disabled={isVerifying}
                />
              </View>
            </View>
          )}

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
            {step === 'email' ? (
              /* Email Step Actions */
              <>
                <CustomButton
                  onPress={handleEmailSubmit}
                  variant="wellness"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#1a1a1a" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Feather name="mail" size={14} color="#1a1a1a" />
                      <Text style={styles.syncButtonText}>Send Verification Code</Text>
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
              </>
            ) : (
              /* Verification Step Actions */
              <>
                <View style={styles.verificationActions}>
                  <Pressable
                    onPress={handleResendCode}
                    style={[
                      styles.resendButton,
                      resendCooldown > 0 && styles.resendButtonDisabled
                    ]}
                    disabled={resendCooldown > 0 || isLoading}
                  >
                    <Feather name="refresh-cw" size={16} color="white" />
                    <Text style={styles.resendButtonText}>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setStep('email')}
                    style={styles.backToEmailButton}
                    disabled={isVerifying}
                  >
                    <Text style={styles.backToEmailText}>Change Email</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleClose}
                  style={styles.cancelButton}
                  disabled={isVerifying}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </>
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
  verificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  backToEmailButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backToEmailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textDecorationLine: 'underline',
  },
});
