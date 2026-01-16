
import React, { useState } from 'react';
import { UserProfile, UnlockableItem } from '../types';
import { ENGINE_UPGRADES, AERO_UPGRADES, FUEL_UPGRADES, GEAR_UPGRADES, WEIGHT_UPGRADES, HYDRAULICS_UPGRADES, LIVERIES, SMOKE_COLORS } from '../constants';

interface HangarProps {
    userProfile: UserProfile;
    onUpdateProfile: (p: UserProfile) => void;
    onClose: () => void;
}

export const Hangar: React.FC<HangarProps> = ({ userProfile, onUpdateProfile, onClose }) => {
    const [activeTab, setActiveTab] = useState<'performance' | 'cosmetics'>('performance');

    const canAfford = (cost: number) => userProfile.coins >= cost;

    const buyOrEquipEngine = (level: number, cost: number) => {
        const unlocked = userProfile.upgrades.unlockedEngine;
        if (level <= unlocked) {
            onUpdateProfile({ ...userProfile, upgrades: { ...userProfile.upgrades, engineLevel: level } });
        } else if (level === unlocked + 1) {
            if (!canAfford(cost)) return;
            onUpdateProfile({ ...userProfile, coins: userProfile.coins - cost, upgrades: { ...userProfile.upgrades, engineLevel: level, unlockedEngine: level } });
        }
    };

    const buyOrEquipAero = (level: number, cost: number) => {
        const unlocked = userProfile.upgrades.unlockedAero;
        if (level <= unlocked) {
            onUpdateProfile({ ...userProfile, upgrades: { ...userProfile.upgrades, aeroLevel: level } });
        } else if (level === unlocked + 1) {
            if (!canAfford(cost)) return;
            onUpdateProfile({ ...userProfile, coins: userProfile.coins - cost, upgrades: { ...userProfile.upgrades, aeroLevel: level, unlockedAero: level } });
        }
    };

    const buyOrEquipFuel = (level: number, cost: number) => {
        const unlocked = userProfile.upgrades.unlockedFuel;
        if (level <= unlocked) {
            onUpdateProfile({ ...userProfile, upgrades: { ...userProfile.upgrades, fuelLevel: level } });
        } else if (level === unlocked + 1) {
            if (!canAfford(cost)) return;
            onUpdateProfile({ ...userProfile, coins: userProfile.coins - cost, upgrades: { ...userProfile.upgrades, fuelLevel: level, unlockedFuel: level } });
        }
    };

    const buyOrEquipGear = (level: number, cost: number) => {
        const unlocked = userProfile.upgrades.unlockedGear;
        if (level <= unlocked) {
            onUpdateProfile({ ...userProfile, upgrades: { ...userProfile.upgrades, gearLevel: level } });
        } else if (level === unlocked + 1) {
            if (!canAfford(cost)) return;
            onUpdateProfile({ ...userProfile, coins: userProfile.coins - cost, upgrades: { ...userProfile.upgrades, gearLevel: level, unlockedGear: level } });
        }
    };

    const buyOrEquipWeight = (level: number, cost: number) => {
        const unlocked = userProfile.upgrades.unlockedWeight;
        if (level <= unlocked) {
            onUpdateProfile({ ...userProfile, upgrades: { ...userProfile.upgrades, weightLevel: level } });
        } else if (level === unlocked + 1) {
            if (!canAfford(cost)) return;
            onUpdateProfile({ ...userProfile, coins: userProfile.coins - cost, upgrades: { ...userProfile.upgrades, weightLevel: level, unlockedWeight: level } });
        }
    };

    const buyOrEquipHydraulics = (level: number, cost: number) => {
        const unlocked = userProfile.upgrades.unlockedHydraulics;
        if (level <= unlocked) {
            onUpdateProfile({ ...userProfile, upgrades: { ...userProfile.upgrades, hydraulicsLevel: level } });
        } else if (level === unlocked + 1) {
            if (!canAfford(cost)) return;
            onUpdateProfile({ ...userProfile, coins: userProfile.coins - cost, upgrades: { ...userProfile.upgrades, hydraulicsLevel: level, unlockedHydraulics: level } });
        }
    };

    const equipCosmetic = (item: UnlockableItem) => {
        if (!canAfford(item.cost)) return;
        
        const isLivery = item.type === 'livery';
        
        onUpdateProfile({
            ...userProfile,
            coins: userProfile.coins - item.cost,
            upgrades: { 
                ...userProfile.upgrades, 
                liveryId: isLivery ? item.id : userProfile.upgrades.liveryId,
                smokeId: !isLivery ? item.id : userProfile.upgrades.smokeId
            }
        });
    };

    const renderUpgradeCard = (
        idx: number, 
        item: { name: string, cost: number, [key: string]: any }, 
        currentLevel: number, 
        unlockedLevel: number, 
        onAction: (lvl: number, cost: number) => void,
        statDisplay: React.ReactNode
    ) => {
        const isEquipped = currentLevel === idx;
        const isOwned = unlockedLevel >= idx;
        const isNext = unlockedLevel === idx - 1;
        
        let statusNode;
        if (isEquipped) {
            statusNode = (
                <div className="mt-auto text-center py-2 bg-sky-900/30 text-sky-400 text-xs font-bold rounded border border-sky-500/30">
                    EQUIPPED
                </div>
            );
        } else if (isOwned) {
             statusNode = (
                <button 
                    onClick={() => onAction(idx, 0)}
                    className="mt-auto py-2 text-xs font-bold rounded border bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                    EQUIP
                </button>
            );
        } else if (isNext) {
             statusNode = (
                <button 
                    onClick={() => onAction(idx, item.cost)}
                    className={`mt-auto py-2 text-xs font-bold rounded border transition-colors ${canAfford(item.cost) ? 'bg-green-600 border-green-500 text-white hover:bg-green-500' : 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed'}`}
                >
                    BUY {item.cost}
                </button>
            );
        } else {
             statusNode = (
                <div className="mt-auto text-center py-2 text-slate-600 text-xs font-bold border border-slate-800 rounded">
                    LOCKED
                </div>
            );
        }

        return (
            <div key={idx} className={`relative p-4 rounded-xl border flex flex-col gap-2 transition-all ${isEquipped ? 'bg-slate-800 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.15)]' : isOwned ? 'bg-slate-900 border-slate-600' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
                <div className="flex justify-between items-start">
                    <div className="text-xs font-mono text-slate-500">LVL {idx}</div>
                    {isOwned && !isEquipped && <div className="w-2 h-2 rounded-full bg-slate-500"></div>}
                </div>
                <div className="font-bold text-white text-sm">{item.name}</div>
                <div className="text-xs text-slate-400 mb-2">{statDisplay}</div>
                {statusNode}
            </div>
        );
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 bg-slate-950 border-b border-slate-800">
                    <div>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter">THE HANGAR</h1>
                        <p className="text-slate-400 text-sm">Upgrade and Customize your Aircraft</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-900/30 border border-amber-600/50 px-4 py-2 rounded-full flex items-center gap-2">
                             <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
                             <span className="text-amber-400 font-mono font-bold">{userProfile.coins} COINS</span>
                        </div>
                        <button onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold transition-colors">
                            EXIT
                        </button>
                    </div>
                </div>

                {/* Info Note */}
                <div className="bg-sky-900/20 border-b border-sky-500/20 px-6 py-2 flex items-center gap-2 text-xs text-sky-300">
                    <span className="font-bold bg-sky-500/20 px-2 py-0.5 rounded text-sky-200">INFO</span>
                    <span>Earn coins by keeping your aircraft airborne. <span className="text-slate-400">Higher flight time = More revenue.</span></span>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                    <button 
                        onClick={() => setActiveTab('performance')}
                        className={`flex-1 py-4 font-bold tracking-wider transition-colors ${activeTab === 'performance' ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        PERFORMANCE
                    </button>
                    <button 
                         onClick={() => setActiveTab('cosmetics')}
                         className={`flex-1 py-4 font-bold tracking-wider transition-colors ${activeTab === 'cosmetics' ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        VISUALS
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'performance' && (
                        <div className="space-y-8">
                            {/* Engine Section */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-orange-500">⚡</span> ENGINE POWER
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    {ENGINE_UPGRADES.map((upgrade, idx) => 
                                        renderUpgradeCard(
                                            idx, 
                                            upgrade, 
                                            userProfile.upgrades.engineLevel, 
                                            userProfile.upgrades.unlockedEngine, 
                                            buyOrEquipEngine,
                                            <span>Thrust: {upgrade.power}N</span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Aero Section */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-blue-500">💨</span> AERODYNAMICS
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    {AERO_UPGRADES.map((upgrade, idx) => 
                                        renderUpgradeCard(
                                            idx, 
                                            upgrade, 
                                            userProfile.upgrades.aeroLevel, 
                                            userProfile.upgrades.unlockedAero, 
                                            buyOrEquipAero,
                                            <span>Drag: {(upgrade.dragMod * 100).toFixed(0)}%</span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Weight Section */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-emerald-500">⚖️</span> WEIGHT REDUCTION
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    {WEIGHT_UPGRADES.map((upgrade, idx) => 
                                        renderUpgradeCard(
                                            idx, 
                                            upgrade, 
                                            userProfile.upgrades.weightLevel || 0, 
                                            userProfile.upgrades.unlockedWeight || 0, 
                                            buyOrEquipWeight,
                                            <span>Mass: {upgrade.mass}kg</span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Hydraulics Section */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-rose-500">🔧</span> HYDRAULICS
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {HYDRAULICS_UPGRADES.map((upgrade, idx) => 
                                        renderUpgradeCard(
                                            idx, 
                                            upgrade, 
                                            userProfile.upgrades.hydraulicsLevel || 0, 
                                            userProfile.upgrades.unlockedHydraulics || 0, 
                                            buyOrEquipHydraulics,
                                            <span>Control: {(upgrade.effectiveness * 100).toFixed(0)}%</span>
                                        )
                                    )}
                                </div>
                            </div>

                             {/* Fuel Section */}
                             <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-yellow-500">⛽</span> FUEL TANKS
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {FUEL_UPGRADES.map((upgrade, idx) => 
                                        renderUpgradeCard(
                                            idx, 
                                            upgrade, 
                                            userProfile.upgrades.fuelLevel, 
                                            userProfile.upgrades.unlockedFuel, 
                                            buyOrEquipFuel,
                                            <span>Capacity: {upgrade.capacity}L</span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Gear Section */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-slate-400">⚙️</span> LANDING GEAR
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {GEAR_UPGRADES.map((upgrade, idx) => 
                                        renderUpgradeCard(
                                            idx, 
                                            upgrade, 
                                            userProfile.upgrades.gearLevel, 
                                            userProfile.upgrades.unlockedGear, 
                                            buyOrEquipGear,
                                            <span>Brakes: x{upgrade.brakeMod}</span>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cosmetics' && (
                        <div className="space-y-8">
                            {/* Livery Section */}
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4">PAINT JOB</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {LIVERIES.map((item) => {
                                        const isActive = userProfile.upgrades.liveryId === item.id;
                                        return (
                                            <button 
                                                key={item.id}
                                                onClick={() => equipCosmetic(item)}
                                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 group ${isActive ? 'bg-slate-800 border-purple-500' : 'bg-slate-900 border-slate-700 hover:bg-slate-800'}`}
                                            >
                                                <div className="w-16 h-8 rounded-full border border-slate-500 shadow-lg" style={{ backgroundColor: item.value }}></div>
                                                <div className="text-center">
                                                    <div className="text-white font-bold text-sm">{item.name}</div>
                                                    {!isActive && <div className={`text-xs mt-1 ${canAfford(item.cost) ? 'text-green-400' : 'text-red-400'}`}>{item.cost === 0 ? 'FREE' : `${item.cost} Coins`}</div>}
                                                    {isActive && <div className="text-xs mt-1 text-purple-400 font-bold">EQUIPPED</div>}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                             {/* Smoke Section */}
                             <div>
                                <h2 className="text-xl font-bold text-white mb-4">SMOKE TRAILS</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {SMOKE_COLORS.map((item) => {
                                        const isActive = userProfile.upgrades.smokeId === item.id;
                                        return (
                                            <button 
                                                key={item.id}
                                                onClick={() => equipCosmetic(item)}
                                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 group ${isActive ? 'bg-slate-800 border-purple-500' : 'bg-slate-900 border-slate-700 hover:bg-slate-800'}`}
                                            >
                                                <div className="w-12 h-12 rounded-full border border-slate-500 shadow-lg flex items-center justify-center bg-slate-950">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.value, boxShadow: `0 0 10px ${item.value}` }}></div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-white font-bold text-sm">{item.name}</div>
                                                    {!isActive && <div className={`text-xs mt-1 ${canAfford(item.cost) ? 'text-green-400' : 'text-red-400'}`}>{item.cost === 0 ? 'FREE' : `${item.cost} Coins`}</div>}
                                                    {isActive && <div className="text-xs mt-1 text-purple-400 font-bold">EQUIPPED</div>}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
