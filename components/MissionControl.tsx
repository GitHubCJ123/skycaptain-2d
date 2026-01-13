import React from 'react';
import { Mission } from '../types';

interface MissionControlProps {
  onStartMission: (mission: Mission) => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({ onStartMission }) => {
  const handleStart = () => {
    const defaultMission: Mission = {
      id: 'default-free-flight',
      title: 'Free Flight',
      description: 'Take off from the runway and fly freely.',
      difficulty: 'Easy',
      weather: {
        windSpeed: 0,
        windDirection: 0,
        turbulence: 0,
        visibility: 1,
      },
      startingConditions: {
        altitude: 0,
        speed: 0,
        airborne: false,
      },
    };
    onStartMission(defaultMission);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">SkyCaptain <span className="text-sky-400">2D</span></h1>
        <p className="text-slate-400 mb-8">Flight Simulator</p>

        <button
          onClick={handleStart}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-lg hover:shadow-sky-500/20"
        >
          Start Engine & Take Off
        </button>

        <div className="mt-8 pt-6 border-t border-slate-800 text-left text-slate-500 text-xs font-mono space-y-2">
            <p className="font-bold text-slate-400">COMMANDS:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>[E] Start/Stop Engine</span>
              <span>[W/S] Throttle</span>
              <span>[↑/↓] Pitch</span>
              <span>[B] Brakes</span>
              <span>[G] Landing Gear</span>
              <span>[F/V] Flaps</span>
            </div>
        </div>
      </div>
    </div>
  );
};