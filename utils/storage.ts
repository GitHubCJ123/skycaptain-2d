
import { UserProfile } from "../types";

const STORAGE_KEY = "skycaptain_save_v1";

const DEFAULT_PROFILE: UserProfile = {
    coins: 0,
    upgrades: {
        engineLevel: 0,
        aeroLevel: 0,
        fuelLevel: 0,
        gearLevel: 0,
        weightLevel: 0,
        hydraulicsLevel: 0,
        unlockedEngine: 0,
        unlockedAero: 0,
        unlockedFuel: 0,
        unlockedGear: 0,
        unlockedWeight: 0,
        unlockedHydraulics: 0,
        liveryId: 'default',
        smokeId: 'default'
    }
};

export const loadProfile = (): UserProfile => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULT_PROFILE;
        const parsed = JSON.parse(stored);
        
        const savedUpgrades = parsed.upgrades || {};

        // Merge with default to handle added fields in future
        const upgrades = { 
            ...DEFAULT_PROFILE.upgrades, 
            ...savedUpgrades,
            // Migration for older saves
            unlockedEngine: savedUpgrades.unlockedEngine ?? savedUpgrades.engineLevel ?? 0,
            unlockedAero: savedUpgrades.unlockedAero ?? savedUpgrades.aeroLevel ?? 0,
            unlockedFuel: savedUpgrades.unlockedFuel ?? savedUpgrades.fuelLevel ?? 0,
            unlockedGear: savedUpgrades.unlockedGear ?? savedUpgrades.gearLevel ?? 0,
            
            // New fields migration
            weightLevel: savedUpgrades.weightLevel ?? 0,
            hydraulicsLevel: savedUpgrades.hydraulicsLevel ?? 0,
            unlockedWeight: savedUpgrades.unlockedWeight ?? savedUpgrades.weightLevel ?? 0,
            unlockedHydraulics: savedUpgrades.unlockedHydraulics ?? savedUpgrades.hydraulicsLevel ?? 0,
        };

        return { ...DEFAULT_PROFILE, ...parsed, upgrades };
    } catch (e) {
        console.error("Failed to load save", e);
        return DEFAULT_PROFILE;
    }
};

export const saveProfile = (profile: UserProfile) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error("Failed to save progress", e);
    }
};
