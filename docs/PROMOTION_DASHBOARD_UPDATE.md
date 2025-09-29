# Promotion Dashboard - App Aesthetic Update

## 🎨 **Updated Design to Match Fleur App**

The promotion dashboard has been completely redesigned to match the Fleur app's aesthetic with:

### **🌙 Dark Theme**
- **Background**: `#120d0a` (Fleur's signature dark brown)
- **Text**: White with various opacity levels for hierarchy
- **Glass Morphism**: Translucent elements with backdrop blur effects

### **✨ Glass Morphism Effects**
- **Container**: `rgba(255, 255, 255, 0.05)` with `backdrop-filter: blur(20px)`
- **Cards**: `rgba(255, 255, 255, 0.05)` with subtle borders
- **Buttons**: `rgba(255, 255, 255, 0.1)` with hover effects
- **Form Inputs**: `rgba(255, 255, 255, 0.05)` backgrounds

### **🎯 Color Palette**
- **Primary Text**: `rgba(255, 255, 255, 0.9)`
- **Secondary Text**: `rgba(255, 255, 255, 0.7)`
- **Borders**: `rgba(255, 255, 255, 0.1)` to `rgba(255, 255, 255, 0.3)`
- **Success**: `rgba(76, 175, 80, 0.2)` backgrounds with green accents
- **Error**: `rgba(244, 67, 54, 0.2)` backgrounds with red accents

### **🔧 Enhanced Features**

#### **📍 Destination Route Selector**
- **New Field**: Choose where users go when they click notifications
- **Available Routes**:
  - Dashboard (`/(app)/dashboard`)
  - Routine (`/(app)/routine`)
  - Shop (`/(app)/shop`)
  - Rewards (`/(app)/rewards`)
  - Cart (`/(app)/cart`)
  - Profile (`/(app)/profile`)
  - Login (`/(app)/login`)
  - Notification Settings (`/(app)/notification-settings`)
  - Schedule Routine (`/(app)/schedule-routine`)
  - Schedule Intro (`/(app)/schedule-intro`)

#### **🎛️ Form Improvements**
- **Glass Input Fields**: Translucent backgrounds with subtle borders
- **Focus States**: Enhanced visibility on focus
- **Placeholder Text**: Properly styled for dark theme
- **Select Options**: Dark background for dropdown options

#### **📊 Visual Elements**
- **Status Badges**: Glass morphism with colored accents
- **Analytics Cards**: Translucent metrics with blur effects
- **Buttons**: Hover animations with enhanced feedback
- **Loading States**: Properly styled for dark theme

### **🚀 Technical Implementation**

#### **Database Schema Updates**
```sql
-- Added destination_route field to promotion_templates
destination_route TEXT DEFAULT '/(app)/dashboard' CHECK (destination_route IN (
  '/(app)/dashboard',
  '/(app)/routine', 
  '/(app)/shop',
  '/(app)/rewards',
  '/(app)/cart',
  '/(app)/profile',
  '/(app)/login',
  '/(app)/notification-settings',
  '/(app)/schedule-routine',
  '/(app)/schedule-intro'
))
```

#### **Backend API Updates**
- **POST `/api/promotions/template`**: Now accepts `destinationRoute` parameter
- **POST `/api/promotions/send`**: Includes destination route in notification data
- **Database Storage**: Destination routes stored with each promotion

#### **Frontend Navigation**
- **Notification Service**: Reads `destinationRoute` from notification data
- **Smart Routing**: Uses custom route if provided, falls back to type-based routing
- **Cloud Sync Promotions**: Special handling for popup triggers

### **🎯 User Experience**

#### **Creating Promotions**
1. **Fill Form**: Title, body, action text, destination route
2. **Choose Route**: Select where users should go when they click
3. **Set Priority**: Low, medium, or high priority
4. **Configure Cooldown**: Days between promotions
5. **Save Template**: Store for future use

#### **Sending Promotions**
1. **Select Template**: Choose from existing templates
2. **Customize**: Override title, body, or destination if needed
3. **Target Users**: Send to specific users or all unsynced users
4. **Send**: Deliver notifications with custom routing

#### **Analytics & Tracking**
- **Click Tracking**: Monitor which routes users visit
- **Conversion Rates**: Track success by destination
- **A/B Testing**: Test different routes for same promotion type

### **📱 Mobile Responsive**
- **Grid Layout**: Responsive cards that adapt to screen size
- **Touch Friendly**: Large buttons and form elements
- **Glass Effects**: Optimized for mobile performance

### **🔮 Future Enhancements**
- **Deep Linking**: Direct links to specific products or routine steps
- **Contextual Data**: Pass specific data to destination screens
- **Route Analytics**: Detailed reporting on navigation patterns
- **Custom Routes**: Support for external URLs or app deep links

## 🎉 **Result**

The promotion dashboard now perfectly matches the Fleur app's aesthetic while providing powerful new functionality to control exactly where users go when they click on notifications. The glass morphism design creates a cohesive experience that feels native to the app's design language.
