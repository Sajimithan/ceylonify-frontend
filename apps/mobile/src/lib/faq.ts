export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'save-itinerary',
    question: 'How do I save places and build an itinerary?',
    answer:
      'Browse listings on the Map or Search tab, tap a place, and use Save or Add to Itinerary. Open the Saved tab to view your bookmarks and itinerary. You can reorder items and set planned dates for each stop.',
  },
  {
    id: 'route-planning',
    question: 'How does route planning work?',
    answer:
      'On the Map tab, switch to Route Plan mode after adding items to your itinerary. Tap Generate Route Plan to get AI-powered day-by-day directions. Your plan is saved locally and linked to each itinerary card in Saved.',
  },
  {
    id: 'contact-host',
    question: 'How do I contact a host?',
    answer:
      'Open a listing detail page and use the contact or message options provided by the host. Hosts respond through the platform — please do not share personal payment details outside official booking flows.',
  },
  {
    id: 'reset-password',
    question: 'How do I reset my password?',
    answer:
      'Go to Settings → Change Password and tap Forgot password, or use Forgot password on the sign-in screen. We will email you a secure link to set a new password. If you signed in with Google, manage your password through your Google account.',
  },
  {
    id: 'privacy',
    question: 'How do I manage privacy or delete my account?',
    answer:
      'Privacy settings and account deletion options are available under Settings → Privacy Settings (when enabled). For urgent privacy requests, contact support below and our team will assist you.',
  },
  {
    id: 'premium',
    question: 'What is Ceylonify Premium?',
    answer:
      'Premium unlocks advanced features such as enhanced route planning and priority support. Open the Premium screen from your profile to view current plans and benefits.',
  },
  {
    id: 'notifications',
    question: 'How do I manage notifications?',
    answer:
      'Use Settings → Push Notifications to enable or disable alerts on this device. You can also review recent notifications from the bell icon on your profile.',
  },
  {
    id: 'offline',
    question: 'Does the app work offline?',
    answer:
      'Saved itineraries and route plans stored on your device remain available offline. Map tiles, search, and live listing data require an internet connection.',
  },
];
