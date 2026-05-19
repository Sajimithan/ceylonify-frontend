# Ceylonify Traveler App 🇱🇰

A premium, production-quality React Native (Expo) mobile application for discovering real-time events and travel experiences in Sri Lanka.

**Author:** Sajimithan P (Index: 220596H)

## ✨ Core Features
- **Real-time Discovery:** Today, Near Me, Trending, and Personalized feeds.
- **Search & Filters:** Smart search with location and category filtering.
- **Premium Gating:** Exclusive "premium_only" listings blurred for free users with an upgrade flow.
- **Map Discovery:** Interactive Google Maps integration with local pins and custom drawers.
- **Itinerary Planning:** Save destinations and organize them into date-based itineraries.
- **Beautiful UI:** Modern, mobile-first design with Ceylonify brand tokens.
- **Offline Mode:** Gracefully handles network issues with cached data and seed fallbacks.

## 🛠️ Tech Stack
- **Framework:** Expo (SDK 54) + React Native
- **Language:** TypeScript
- **Navigation:** Expo Router (File-based)
- **Styling:** NativeWind (Tailwind CSS)
- **Data:** Apollo Client (GraphQL) + Seed Fallback
- **State:** Zustand
- **Auth:** Firebase Auth (Email/Password + Google)
- **Icons:** Lucide React Native
- **Validation:** Zod + React Hook Form

## 🚀 Getting Started

### 1. Prerequisites
- Node.js & npm
- Expo Go app on your phone

### 2. Installation
```powershell
npm install --legacy-peer-deps
```

### 3. Environment Setup
Create a `.env` file with:
```env
EXPO_PUBLIC_GRAPHQL_URL=your-graphql-url
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
# ... other firebase vars
```

### 4. Start Development
```powershell
npx expo start -c
```

## 📂 Project Structure
- `/app`: Expo Router screens and layouts.
- `/src/components`: Reusable UI components (Cards, Common, Maps, Forms).
- `/src/lib`: Logic, stores, theme tokens, and GraphQL client.
- `/src/data`: Seed data for the demo mode.

---
*Built as part of the Ceylonify Ecosystem.*
