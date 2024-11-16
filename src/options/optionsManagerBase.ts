// This is separate from the OptionsManager class because it is used by the background script
// and the background script should not have to load Firebase

import { taskLogStore } from '../background/logStore';
import { DeviceSettings, SettingsChangeEvent } from '../interfaces';

export class OptionsManagerBase {
    listeners: ((event: SettingsChangeEvent) => void)[] = [];
    static instance: OptionsManagerBase;

    constructor() {}

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
                debateBehaviour: 'oneRound' as const,
                disableOnPageLoad: false,
                pauseState: false
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
        if (key === 'currentTask') {
            // if the text has not changed, don't log it
            if (value === (await this.get('currentTask'))) {
                return;
            }
            taskLogStore.addLog({
                timestamp: new Date().toISOString(),
                task: value as string
            });
        }
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

    protected notifyListeners(event: SettingsChangeEvent): void {
        this.listeners.forEach(listener => listener(event));
    }
}
