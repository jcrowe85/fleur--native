# Daily Check-in Popup Scheduling Rules

## 🎯 **When the Check-in Popup Shows**

The check-in popup is scheduled to show when **ALL** of the following conditions are met:

### **Rule 1: Time Restriction**
- ✅ **Show**: After 4:00 AM
- ❌ **Hide**: Before 4:00 AM (0:00 - 3:59 AM)

**Purpose**: Avoids interrupting users during late night hours

### **Rule 2: Check-in Status**
- ✅ **Show**: User has NOT checked in today
- ❌ **Hide**: User has already checked in today

**Purpose**: Prevents duplicate check-ins

### **Rule 3: Popup History**
- ✅ **Show**: Popup has NOT been shown today
- ❌ **Hide**: Popup has already been shown today

**Purpose**: Prevents popup spam

### **Rule 4: Store Hydration**
- ✅ **Show**: All stores are properly loaded
- ❌ **Hide**: Stores are still hydrating

**Purpose**: Ensures accurate state evaluation

## 📅 **Detailed Logic**

```typescript
shouldShowDailyPopup: () => {
  const now = dayjs();
  const currentHour = now.hour();
  const today = now.format("YYYY-MM-DD");
  
  // Rule 1: Only show after 4am
  if (currentHour < 4) {
    return false;
  }
  
  // Rule 2: Don't show if already checked in today
  if (get().hasCheckedInToday()) {
    return false;
  }
  
  // Rule 3: Don't show if popup was already shown today
  if (get().lastPopupShownDate === today) {
    return false;
  }
  
  return true; // All conditions met
}
```

## 🕐 **Time-Based Examples**

### **Morning (4:00 AM - 11:59 AM)**
- ✅ **4:00 AM**: Popup can show
- ✅ **8:00 AM**: Popup can show
- ✅ **11:30 AM**: Popup can show

### **Afternoon (12:00 PM - 11:59 PM)**
- ✅ **12:00 PM**: Popup can show
- ✅ **6:00 PM**: Popup can show
- ✅ **11:59 PM**: Popup can show

### **Late Night (12:00 AM - 3:59 AM)**
- ❌ **12:00 AM**: Popup blocked (too early)
- ❌ **2:30 AM**: Popup blocked (too early)
- ❌ **3:59 AM**: Popup blocked (too early)

## 🎭 **User Scenarios**

### **Scenario 1: First Time User (Morning)**
- **Time**: 9:00 AM
- **Status**: Never checked in
- **Popup History**: None
- **Result**: ✅ **Popup Shows**

### **Scenario 2: Returning User (Morning)**
- **Time**: 8:00 AM
- **Status**: Haven't checked in today
- **Popup History**: Not shown today
- **Result**: ✅ **Popup Shows**

### **Scenario 3: Already Checked In**
- **Time**: 10:00 AM
- **Status**: Already checked in today
- **Popup History**: Any
- **Result**: ❌ **No Popup**

### **Scenario 4: Late Night User**
- **Time**: 2:00 AM
- **Status**: Haven't checked in
- **Popup History**: None
- **Result**: ❌ **No Popup** (too early)

### **Scenario 5: Popup Already Shown**
- **Time**: 6:00 PM
- **Status**: Haven't checked in
- **Popup History**: Shown earlier today
- **Result**: ❌ **No Popup** (already shown)

## 🔄 **Popup Triggers**

The popup can be triggered in these situations:

### **1. Dashboard Load**
- User opens app and navigates to dashboard
- Automatic check after 1-second delay
- Only if all conditions are met

### **2. After Signup Bonus**
- New user completes onboarding
- Signup bonus popup closes
- Check-in popup shows after 5-second delay
- Only if all conditions are met

### **3. Manual Trigger**
- User taps "Check In" button in rewards screen
- Opens popup directly (bypasses scheduling rules)

## ⚙️ **State Management**

### **Popup Tracking**
- `lastPopupShownDate`: Stores date when popup was last shown
- Format: "YYYY-MM-DD" (e.g., "2025-01-30")
- Reset daily at midnight

### **Check-in Tracking**
- `checkIns`: Array of completed check-ins
- Each check-in has date, timestamp, and responses
- `hasCheckedInToday()` checks if today's date exists in array

## 🎯 **Summary**

**The check-in popup shows when:**
1. ⏰ It's after 4:00 AM
2. 📝 User hasn't checked in today
3. 🚫 Popup hasn't been shown today
4. 🔄 All stores are hydrated

**The popup is blocked when:**
1. 🌙 It's before 4:00 AM
2. ✅ User already checked in today
3. 👁️ Popup was already shown today
4. ⏳ Stores are still loading

This ensures users get a consistent, non-intrusive check-in experience once per day during appropriate hours.
