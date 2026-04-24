
import React, { useState } from 'react';
import { Mission, UserProfile } from '../types';

const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-sm font-bold text-white font-mono">{value}</span>
    </div>
);

interface MissionControlProps {
  onStartMission: (mission: Mission) => void;
  onOpenHangar: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({ onStartMission, onOpenHangar, userProfile, onUpdateProfile }) => {
  const [obstaclesEnabled, setObstaclesEnabled] = useState(false);

  const handleStartFree = () => {
    const defaultMission: Mission = {
      id: 'default-free-flight',
      title: 'Free Flight',
      description: 'Take off from the runway and fly freely.',
      difficulty: 'Easy',
      timeOfDay: 'day',
      obstaclesEnabled,
      weather: {
        windSpeed: 0,
        windDirection: 0,
        turbulence: 0,
        visibility: 1,
        precipitation: 'none',
      },
      startingConditions: {
        altitude: 0,
        speed: 0,
        airborne: false,
      },
    };
    onStartMission(defaultMission);
  };

  const handleStartLanding = () => {
    const landingMission: Mission = {
        id: 'landing-practice',
        title: 'Landing Approach',
        description: 'You are 3km out from the runway at 1000ft. Land safely.',
        difficulty: 'Medium',
        timeOfDay: 'day',
        obstaclesEnabled,
        weather: {
            windSpeed: 5,
            windDirection: 180,
            turbulence: 0.1,
            visibility: 0.9,
            precipitation: 'none',
        },
        startingConditions: {
            altitude: 300, // meters (~1000ft)
            speed: 50, // m/s (~100 kts)
            airborne: true
        }
    };
    onStartMission(landingMission);
  };

  const handleStartNight = () => {
    const nightMission: Mission = {
        id: 'night-flight',
        title: 'Night Operations',
        description: 'Navigate by instruments and runway lights in total darkness.',
        difficulty: 'Hard',
        timeOfDay: 'night',
        obstaclesEnabled,
        weather: {
            windSpeed: 8,
            windDirection: 0,
            turbulence: 0.05,
            visibility: 1.0,
            precipitation: 'none',
        },
        startingConditions: {
            altitude: 0,
            speed: 0,
            airborne: false
        }
    };
    onStartMission(nightMission);
  };

  const handleStartStorm = () => {
    const stormMission: Mission = {
        id: 'storm-chaser',
        title: 'Storm Front',
        description: 'Heavy rain, lightning, and severe turbulence. Keep it steady.',
        difficulty: 'Extreme',
        timeOfDay: 'day', // Darkened by storm logic
        obstaclesEnabled,
        weather: {
            windSpeed: 25,
            windDirection: 270,
            turbulence: 0.8,
            visibility: 0.6,
            precipitation: 'storm',
        },
        startingConditions: {
            altitude: 500,
            speed: 60,
            airborne: true
        }
    };
    onStartMission(stormMission);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 text-center relative">
        
        {/* Top Right Coins */}
        <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
            <div className="bg-amber-900/30 border border-amber-600/50 px-4 py-2 rounded-full flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
                <span className="text-amber-400 font-mono font-bold">{userProfile.coins} COINS</span>
            </div>
            <button 
                onClick={onOpenHangar}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-lg shadow-lg shadow-purple-900/50 transition-all transform hover:scale-105"
            >
                OPEN HANGAR ✈️
            </button>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">SkyCaptain <span className="text-sky-400">2D</span></h1>
        <p className="text-slate-400 mb-4">Flight Simulator</p>

        {/* Personal Bests */}
        {userProfile.stats && (userProfile.stats.bestDistanceM > 0 || userProfile.stats.totalRings > 0 || userProfile.stats.smoothLandings > 0) && (
            <div className="max-w-3xl mx-auto mb-6 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Personal Bests</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <Stat label="Max Altitude" value={`${Math.round(userProfile.stats.bestAltitudeFt).toLocaleString()} ft`} />
                    <Stat label="Max Speed" value={`${Math.round(userProfile.stats.bestSpeedKt)} kt`} />
                    <Stat label="Max Distance" value={`${(userProfile.stats.bestDistanceM/1000).toFixed(1)} km`} />
                    <Stat label="Best Combo" value={`×${userProfile.stats.bestComboMult}`} />
                    <Stat label="Longest Flight" value={fmtTime(userProfile.stats.longestFlightSec)} />
                    <Stat label="Rings Collected" value={`${userProfile.stats.totalRings}`} />
                    <Stat label="Smooth / Perfect" value={`${userProfile.stats.smoothLandings} / ${userProfile.stats.perfectLandings}`} />
                    <Stat label="Crashes" value={`${userProfile.stats.totalCrashes}`} />
                </div>
            </div>
        )}

        {/* Settings Bar */}
        <div className="flex items-center justify-center gap-4 mb-8 bg-slate-800/50 p-2 rounded-full max-w-2xl mx-auto border border-slate-700 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Settings:</span>
            <button 
                onClick={() => setObstaclesEnabled(!obstaclesEnabled)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-bold ${obstaclesEnabled ? 'bg-red-900/40 border-red-500 text-red-300' : 'bg-slate-800 border-slate-600 text-slate-500 hover:text-slate-300'}`}
            >
                <div className={`w-2 h-2 rounded-full transition-colors ${obstaclesEnabled ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-600'}`} />
                OBSTACLES: {obstaclesEnabled ? 'ON' : 'OFF'}
            </button>
            <button
                onClick={() => onUpdateProfile({ ...userProfile, invertPitch: !userProfile.invertPitch })}
                title="When ON, pulling ↓ raises the nose like a real yoke; ↑ pitches down."
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-bold ${userProfile.invertPitch ? 'bg-sky-900/40 border-sky-500 text-sky-300' : 'bg-slate-800 border-slate-600 text-slate-500 hover:text-slate-300'}`}
            >
                <div className={`w-2 h-2 rounded-full transition-colors ${userProfile.invertPitch ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-600'}`} />
                INVERT PITCH: {userProfile.invertPitch ? 'ON' : 'OFF'}
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-sky-500 transition-all group flex flex-col justify-between">
                <div>
                    <h3 className="text-white font-bold text-xl mb-2">Free Flight</h3>
                    <p className="text-slate-400 text-sm mb-4">Start on the runway. Perfect weather. Practice your basics.</p>
                </div>
                <button
                    onClick={handleStartFree}
                    className="w-full bg-sky-600 group-hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
                >
                    DAY FLIGHT
                </button>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-sky-500 transition-all group flex flex-col justify-between">
                <div>
                    <h3 className="text-white font-bold text-xl mb-2">Landing Practice</h3>
                    <p className="text-slate-400 text-sm mb-4">Mid-air start. Line up and touchdown safely.</p>
                </div>
                <button
                    onClick={handleStartLanding}
                    className="w-full bg-emerald-700 group-hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
                >
                    APPROACH
                </button>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all group flex flex-col justify-between">
                <div>
                    <h3 className="text-indigo-200 font-bold text-xl mb-2">Night Ops</h3>
                    <p className="text-slate-400 text-sm mb-4">Visual flight rules at night. Rely on runway lighting.</p>
                </div>
                <button
                    onClick={handleStartNight}
                    className="w-full bg-indigo-900 group-hover:bg-indigo-800 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg border border-indigo-700"
                >
                    NIGHT
                </button>
            </div>

             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-yellow-500 transition-all group flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 z-0"></div>
                <div className="relative z-10">
                    <h3 className="text-yellow-100 font-bold text-xl mb-2">Storm Front</h3>
                    <p className="text-slate-400 text-sm mb-4">Heavy rain, turbulence, and lightning.</p>
                </div>
                <button
                    onClick={handleStartStorm}
                    className="relative z-10 w-full bg-slate-700 group-hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg border border-slate-500"
                >
                    STORM
                </button>
            </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-left text-slate-500 text-xs font-mono space-y-2">
            <p className="font-bold text-slate-400">COMMANDS:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>[E] Start/Stop Engine</span>
              <span>[W/S] Throttle</span>
              <span>[↑/↓] Pitch</span>
              <span>[B] Brakes</span>
              <span>[G] Landing Gear</span>
              <span>[F/V] Flaps</span>
              <span>[P] Pause</span>
              <span className="text-amber-400">Fly through gold rings to earn coins!</span>
            </div>
        </div>
      </div>
    </div>
  );
};
