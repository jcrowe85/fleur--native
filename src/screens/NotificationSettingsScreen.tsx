// src/screens/NotificationSettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useNotificationStore } from '@/state/notificationStore';
import { notificationService } from '@/services/notificationService';
import { ScreenScrollView } from '@/components/UI/bottom-space';

export default function NotificationSettingsScreen() {
  const { 
    preferences, 
    hasRequestedPermissions,
    updatePreferences,
    setHasRequestedPermissions 
  } = useNotificationStore();
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize notification service when component mounts
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize();
      setHasRequestedPermissions(true);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  const handlePreferenceChange = async (key: keyof typeof preferences, value: boolean) => {
    setIsLoading(true);
    try {
      updatePreferences({ [key]: value });
      await notificationService.updatePreferences({ [key]: value });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuietHoursChange = async (start: string, end: string) => {
    setIsLoading(true);
    try {
      updatePreferences({ 
        quietHoursStart: start,
        quietHoursEnd: end 
      });
      await notificationService.updatePreferences({ 
        quietHoursStart: start,
        quietHoursEnd: end 
      });
    } catch (error) {
      console.error('Failed to update quiet hours:', error);
    } finally {
      setIsLoading(false);
    }
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
        <View style={styles.headerWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, position: 'relative' }}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.backButton, { padding: 8, borderRadius: 20 }]}>
              <Feather name="arrow-left" size={18} color="#fff" />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <Text style={styles.headerSub}>Manage your notification preferences</Text>
            </View>
          </View>
        </View>

        <ScreenScrollView
          contentContainerStyle={{ paddingHorizontal: 20 }}
          bottomExtra={20}
          showsVerticalScrollIndicator={false}
        >
          {/* Routine Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Feather name="clock" size={20} color="white" />
                <Text style={styles.sectionTitle}>Routine Reminders</Text>
              </View>
              <Switch
                value={preferences.routineNotifications}
                onValueChange={(value) => handlePreferenceChange('routineNotifications', value)}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.3)' }}
                thumbColor={preferences.routineNotifications ? 'white' : 'rgba(255,255,255,0.5)'}
                disabled={isLoading}
              />
            </View>
            <Text style={styles.sectionDescription}>
              Get reminded about your morning and evening hair care routines
            </Text>
          </View>

          {/* Promotional Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Feather name="tag" size={20} color="white" />
                <Text style={styles.sectionTitle}>Promotions & Offers</Text>
              </View>
              <Switch
                value={preferences.promotionalNotifications}
                onValueChange={(value) => handlePreferenceChange('promotionalNotifications', value)}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.3)' }}
                thumbColor={preferences.promotionalNotifications ? 'white' : 'rgba(255,255,255,0.5)'}
                disabled={isLoading}
              />
            </View>
            <Text style={styles.sectionDescription}>
              Receive notifications about sales, new products, and special offers
            </Text>
          </View>

          {/* Educational Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Feather name="book-open" size={20} color="white" />
                <Text style={styles.sectionTitle}>Hair Care Tips</Text>
              </View>
              <Switch
                value={preferences.educationalNotifications}
                onValueChange={(value) => handlePreferenceChange('educationalNotifications', value)}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.3)' }}
                thumbColor={preferences.educationalNotifications ? 'white' : 'rgba(255,255,255,0.5)'}
                disabled={isLoading}
              />
            </View>
            <Text style={styles.sectionDescription}>
              Get weekly tips and advice for better hair care
            </Text>
          </View>

          {/* Community Notifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Feather name="users" size={20} color="white" />
                <Text style={styles.sectionTitle}>Community</Text>
              </View>
              <Switch
                value={preferences.communityNotifications}
                onValueChange={(value) => handlePreferenceChange('communityNotifications', value)}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.3)' }}
                thumbColor={preferences.communityNotifications ? 'white' : 'rgba(255,255,255,0.5)'}
                disabled={isLoading}
              />
            </View>
            <Text style={styles.sectionDescription}>
              Get notified about new community posts and friend invitations
            </Text>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Feather name="info" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.infoTitle}>About Notifications</Text>
            </View>
            <Text style={styles.infoText}>
              • Routine reminders are sent 30 minutes before your scheduled routine time{'\n'}
              • Promotional notifications are limited to 1-2 per week{'\n'}
              • Educational tips are sent weekly{'\n'}
              • You can change these settings anytime
            </Text>
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
  headerWrap: {
    paddingTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 18,
  },
});
