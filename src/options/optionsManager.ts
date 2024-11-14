import { DeviceSettings, SettingsChangeEvent } from '../interfaces';
import { auth } from '../firebase/config';
import { UserService } from '../services/userService';

export class OptionsManager {
    private static instance: OptionsManager;
    private listeners: ((event: SettingsChangeEvent) => void)[] = [];

    private constructor() {}

    public static getInstance(): OptionsManager {
        if (!OptionsManager.instance) {
            OptionsManager.instance = new OptionsManager();
        }
        return OptionsManager.instance;
    }

    /**
     * Get all settings
     */
    public async getAll(): Promise<DeviceSettings> {
        return new Promise((resolve) => {
            chrome.storage.local.get({
                anthropicApiKey: '',
                deviceConstitution: '',
                currentTask: '',
                llmProvider: 'cloud' as const,
                localModelName: '',
                enableXProcessor: true,
                aiJudgementPolicy: 'pageLoad' as const,
                aiJudgementInterval: 240e3,
                mementoMori: false,
                debateBehaviour: 'oneRound' as const
            }, (items) => resolve(items as DeviceSettings));
        });
    }

    /**
     * Get a specific setting
     */
    public async get<K extends keyof DeviceSettings>(key: K): Promise<DeviceSettings[K]> {
        const settings = await this.getAll();
        return settings[key];
    }

    /**
     * Update multiple settings at once
     */
    public async update(settings: Partial<DeviceSettings>): Promise<void> {
        const oldSettings = await this.getAll();
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(settings, async () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }

                // Notify listeners of each changed setting
                Object.keys(settings).forEach((key) => {
                    const settingKey = key as keyof DeviceSettings;
                    this.notifyListeners({
                        key: settingKey,
                        newValue: settings[settingKey],
                        oldValue: oldSettings[settingKey]
                    });
                });

                // Sync with Firebase if user is logged in
                const user = auth.currentUser;
                if (user) {
                    const allSettings = await this.getAll();
                    await UserService.syncSettings(user.uid, allSettings);
                }

                resolve();
            });
        });
    }

    /**
     * Update a single setting
     */
    public async set<K extends keyof DeviceSettings>(
        key: K,
        value: DeviceSettings[K]
    ): Promise<void> {
        return this.update({ [key]: value });
    }

    /**
     * Subscribe to settings changes
     */
    public subscribe(listener: (event: SettingsChangeEvent) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(event: SettingsChangeEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    /**
     * Load settings from Firebase if available
     */
    public async loadFromFirebase(): Promise<void> {
        const user = auth.currentUser;
        if (!user) return;

        const userData = await UserService.getUserData(user.uid);
        if (userData?.settings) {
            const { currentTask, ...otherSettings } = userData.settings;
            await this.update(otherSettings);
        }
    }
}

// Export a singleton instance
export const optionsManager = OptionsManager.getInstance(); 