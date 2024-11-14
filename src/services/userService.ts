import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import type { DeviceSettings } from '../interfaces';
import debounce from 'lodash/debounce';

interface UserData {
  email: string;
  settings: DeviceSettings;
  lastUpdated: number;
}

export class UserService {
  // Track the latest settings to ensure we sync the most recent version
  private static latestSettings: { [userId: string]: DeviceSettings } = {};

  private static debouncedSync = debounce(async (userId: string) => {
    try {
      // TEMPORARY
      console.log("firebase sync disabled until apps for other devices ready");
      return;
      console.log('Syncing settings to Firebase for user:', userId, this.latestSettings[userId]);
      const settings = this.latestSettings[userId];
      if (!settings) return;

      const userRef = doc(firestore, 'users', userId);
      await setDoc(userRef, {
        settings,
        lastUpdated: Date.now()
      }, { merge: true });

      // Clear the cached settings after successful sync
      delete this.latestSettings[userId];
    } catch (error) {
      console.error('Failed to sync settings:', error);
    }
  }, 15000, { maxWait: 30000 }); // 15 second debounce, max 30 seconds between syncs

  static async syncSettings(userId: string, settings: DeviceSettings): Promise<void> {
    console.log('Queueing settings sync:', settings);
    // Always update the latest settings
    this.latestSettings[userId] = settings;
    // Queue the sync
    this.debouncedSync(userId);
  }

  static async getUserData(userId: string): Promise<UserData | null> {
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    return docSnap.exists() ? docSnap.data() as UserData : null;
  }
} 