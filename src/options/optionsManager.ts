import { DeviceSettings } from '../interfaces';
import { auth } from '../firebase/config';
import { UserService } from '../services/userService';
import { OptionsManagerBase } from './optionsManagerBase';

export class OptionsManager extends OptionsManagerBase {
    static instance: OptionsManager;

    constructor() {
        super();
    }

    public static getInstance(): OptionsManager {
        if (!OptionsManager.instance) {
            OptionsManager.instance = new OptionsManager();
        }
        return OptionsManager.instance;
    }

    /**
     * Override update to include Firebase sync
     */
    public async update(settings: Partial<DeviceSettings>): Promise<void> {
        await super.update(settings);
        
        // Sync with Firebase if user is logged in
        const user = auth.currentUser;
        if (user) {
            const allSettings = await this.getAll();
            await UserService.syncSettings(user.uid, allSettings);
        }
    }
}

// Export a singleton instance
export const optionsManager = OptionsManager.getInstance(); 