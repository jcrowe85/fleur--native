// src/hooks/useCloudSyncPopup.ts
import { useState, useCallback } from 'react';
import { cloudSyncManager } from '@/services/cloudSyncManager';

export function useCloudSyncPopup() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('Sync Your Data');
  const [message, setMessage] = useState('Enter your email and password to sync your hair care data to the cloud.');

  const showPopup = useCallback((customTitle?: string, customMessage?: string) => {
    if (customTitle) setTitle(customTitle);
    if (customMessage) setMessage(customMessage);
    setVisible(true);
  }, []);

  const hidePopup = useCallback(() => {
    setVisible(false);
  }, []);

  const handleSyncSuccess = useCallback(async () => {
    setVisible(false);
    // Notify cloud sync manager that user has synced
    await cloudSyncManager.onUserSync();
  }, []);

  const showBackupPopup = useCallback(() => {
    showPopup(
      'Backup Your Hair Journey 📱',
      'Keep your routine progress safe! Backup your data to never lose your hair care achievements.'
    );
  }, [showPopup]);

  const showCrossDevicePopup = useCallback(() => {
    showPopup(
      'Access Your Data Anywhere 🌐',
      'Switch between devices seamlessly! Sync your routine and progress across all your devices.'
    );
  }, [showPopup]);

  const showNeverLoseDataPopup = useCallback(() => {
    showPopup(
      'Never Lose Your Progress 💾',
      'Your hair care journey is precious. Secure it in the cloud so you never lose your routine or points.'
    );
  }, [showPopup]);

  const showSyncProgressPopup = useCallback(() => {
    showPopup(
      'Sync Your Hair Care Progress 📊',
      'Keep your routine streak and points safe across all devices. Never miss a day of progress!'
    );
  }, [showPopup]);

  const showSecureBackupPopup = useCallback(() => {
    showPopup(
      'Secure Your Hair Care Data 🔒',
      'Your personalized routine and progress deserve protection. Backup securely to the cloud.'
    );
  }, [showPopup]);

  const showAccessAnywherePopup = useCallback(() => {
    showPopup(
      'Your Hair Care, Anywhere 📱💻',
      'Access your routine on your phone, tablet, or computer. Keep your hair care consistent everywhere.'
    );
  }, [showPopup]);

  return {
    visible,
    title,
    message,
    showPopup,
    hidePopup,
    handleSyncSuccess,
    showBackupPopup,
    showCrossDevicePopup,
    showNeverLoseDataPopup,
    showSyncProgressPopup,
    showSecureBackupPopup,
    showAccessAnywherePopup,
  };
}
