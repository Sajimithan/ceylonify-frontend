import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { firebaseApp } from "../auth/firebase";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

export async function getFcmToken(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const messaging = getMessaging(firebaseApp);

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token || null;
  } catch (err) {
    console.error("FCM token error:", err);
    return null;
  }
}

export function listenForegroundMessages() {
  const messaging = getMessaging(firebaseApp);

  onMessage(messaging, (payload) => {
    console.log("Foreground message:", payload);
    // Dispatch custom event so NotificationBell can refetch without a page reload
    window.dispatchEvent(new CustomEvent("ceylonify:notification", { detail: payload }));
  });
}
