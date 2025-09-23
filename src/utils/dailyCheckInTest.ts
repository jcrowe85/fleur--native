// src/utils/dailyCheckInTest.ts
import dayjs from 'dayjs';
import { useCheckInStore } from '@/state/checkinStore';

/**
 * Test utility for daily check-in popup behavior
 * This can be used for debugging and testing the popup logic
 */
export function testDailyCheckInLogic() {
  const { shouldShowDailyPopup, markPopupShown, hasCheckedInToday, clearTodaysCheckIn } = useCheckInStore.getState();
  
  const now = dayjs();
  const currentHour = now.hour();
  const today = now.format('YYYY-MM-DD');
  
  console.log('=== Daily Check-in Logic Test ===');
  console.log('Current time:', now.format('YYYY-MM-DD HH:mm:ss'));
  console.log('Current hour:', currentHour);
  console.log('Today date:', today);
  console.log('Has checked in today:', hasCheckedInToday());
  console.log('Should show popup:', shouldShowDailyPopup());
  
  // Test different scenarios
  console.log('\n=== Test Scenarios ===');
  
  // Scenario 1: Early morning (before 4am)
  if (currentHour < 4) {
    console.log('✅ Early morning test: Popup should NOT show (before 4am)');
  } else {
    console.log('✅ After 4am: Popup logic can be tested');
  }
  
  // Scenario 2: Already checked in
  if (hasCheckedInToday()) {
    console.log('✅ Already checked in: Popup should NOT show');
  } else {
    console.log('✅ Not checked in: Popup can show (if other conditions met)');
  }
  
  return {
    currentTime: now.format('YYYY-MM-DD HH:mm:ss'),
    currentHour,
    shouldShow: shouldShowDailyPopup(),
    hasCheckedIn: hasCheckedInToday(),
  };
}

/**
 * Helper function to simulate different times for testing
 */
export function simulateTimeForTesting(hour: number) {
  const originalHour = dayjs().hour();
  console.log(`Simulating time: ${hour}:00 (original: ${originalHour}:00)`);
  
  // Note: This is just for logging - actual time simulation would require
  // mocking dayjs or using a different approach in tests
  const mockNow = dayjs().hour(hour);
  const shouldShow = hour >= 4; // Basic logic check
  
  console.log(`At ${hour}:00, popup should ${shouldShow ? 'SHOW' : 'NOT SHOW'}`);
  
  return {
    simulatedHour: hour,
    shouldShow,
    mockTime: mockNow.format('YYYY-MM-DD HH:mm:ss'),
  };
}

/**
 * Reset test data
 */
export function resetDailyCheckInTest() {
  const { clearTodaysCheckIn, resetAll } = useCheckInStore.getState();
  
  console.log('Resetting daily check-in test data...');
  clearTodaysCheckIn();
  // Note: resetAll() would clear everything, use with caution
  console.log('Test data reset complete');
}
