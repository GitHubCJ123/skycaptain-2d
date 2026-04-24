import React from 'react';

interface ControlsProps {
  throttle: number;
  flaps: number;
  gear: boolean;
  brakes: boolean;
  engineOn: boolean;
  setThrottle: (val: number) => void;
  setFlaps: (val: number) => void;
  toggleGear: () => void;
  toggleBrakes: () => void;
  toggleEngine: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  throttle,
  flaps,
  gear,
  brakes,
  engineOn,
  setThrottle,
  setFlaps,
  toggleGear,
  toggleBrakes,
  toggleEngine,
}) => {
  return (
    <div className="flex flex-col gap-2 p-4 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700 text-xs font-mono">
      
      {/* Engine Master */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400">ENGINE [E]</span>
        <button
          onClick={toggleEngine}
          className={`px-3 py-1 rounded border ${engineOn ? 'bg-green-600 border-green-400 text-white' : 'bg-red-900/50 border-red-800 text-red-400'}`}
        >
          {engineOn ? 'RUNNING' : 'OFF'}
        </button>
      </div>

      {/* Throttle Slider */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
           <span className="text-gray-400">THROTTLE</span>
           <span className="text-amber-400">{(throttle * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={throttle}
          onChange={(e) => setThrottle(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>

       {/* Flaps Slider */}
       <div className="flex flex-col gap-1 mt-2">
        <div className="flex justify-between">
           <span className="text-gray-400">FLAPS</span>
           <span className="text-blue-400">{(flaps * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.25"
          value={flaps}
          onChange={(e) => setFlaps(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          onClick={toggleGear}
          className={`py-2 border rounded transition-colors ${gear ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`}
        >
          GEAR {gear ? 'DOWN' : 'UP'}
        </button>
        <button
          onClick={toggleBrakes}
          className={`py-2 border rounded transition-colors ${brakes ? 'bg-red-900/40 border-red-500 text-red-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`}
        >
          PARK BRAKE
        </button>
      </div>
      
      <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-gray-500">
         <div>CONTROLS:</div>
         <div>E : Engine Start/Stop</div>
         <div>↑/↓ : Pitch</div>
         <div>W/S : Throttle</div>
         <div>B : Brakes</div>
         <div>G : Gear</div>
         <div>F/V : Flaps</div>
         <div>P : Pause</div>
      </div>
    </div>
  );
};