# Fleur Native - Hair Care App

A React Native app built with Expo for personalized hair care routines and product recommendations.

## 🚀 Quick Start

### Development Setup
```bash
# Install dependencies
npm install

# Start Expo development server
npx expo start
```

### Run on Device
- **iOS**: Press `i` in terminal or scan QR code with Camera app
- **Android**: Press `a` in terminal or scan QR code with Expo Go app

## 📱 Features

- **Personalized Hair Care Routines** - Custom routines based on hair type and goals
- **Product Recommendations** - AI-powered product suggestions
- **Progress Tracking** - Monitor your hair care journey
- **Community Features** - Share and discover hair care tips
- **Cloud Sync** - Backup and sync data across devices

## 🛠️ Development Tools

### Promotion Dashboard

The promotion dashboard allows you to manage cloud sync promotions and notifications.

#### Starting the Dashboard Server

**Python HTTP Server** (Recommended for local development):
```bash
# Navigate to scripts directory
cd scripts

# Start Python HTTP server
python3 -m http.server 8000

# Access dashboard in browser
# URL: http://localhost:8000/promotion-dashboard.html
```

**Alternative - Node.js Server** (For full API functionality):
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Start the server
npm start

# Access dashboard
# URL: http://localhost:8000/promotion-dashboard.html
```

#### Dashboard Features
- **Create Promotion Templates** - Design new promotions
- **Send Promotions** - Send to specific users or all unsynced users
- **View Analytics** - Track click rates and conversions
- **Manage Cloud Sync Promotions** - Promote email signup for cloud backup

#### Stopping the Python Server
```bash
# Find the process
ps aux | grep python

# Kill it (replace PID with actual process ID)
kill <PID>
```

### Command Line Tools

```bash
# Promotion management CLI
node scripts/manage-promotions.js

# Database seeding
psql -f scripts/seed-promotions.sql
```

## 📁 Project Structure

```
├── app/                    # Expo Router pages
├── src/                    # Source code
│   ├── components/         # Reusable components
│   ├── screens/           # Screen components
│   ├── services/          # API services
│   └── stores/            # Zustand state management
├── scripts/               # Utility scripts
├── server/                # Backend API server
├── database/              # Database schemas and migrations
└── docs/                  # Documentation
```

## 🔧 Configuration

### Environment Variables
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# API Server
API_BASE=http://localhost:3000
```

## 📚 Documentation

- [Cloud Sync Promotions](docs/CLOUD_SYNC_PROMOTIONS.md)
- [Promotion Dashboard Update](docs/PROMOTION_DASHBOARD_UPDATE.md)
- [Database Schema](database/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary and confidential.
