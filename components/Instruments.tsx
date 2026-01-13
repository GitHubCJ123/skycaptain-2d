import React from 'react';
import { FlightState } from '../types';

interface InstrumentsProps {
  state: FlightState;
}

// Helper for rotation
const rotate = (deg: number) => ({ transform: `rotate(${deg}deg)`, transformOrigin: 'center' });

export const Instruments: React.FC<InstrumentsProps> = ({ state }) => {
  // Conversions
  const altFeet = state.position.y * 3.28084;
  const speedKnots = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2) * 1.94384;
  const vsiFpm = state.velocity.y * 60 * 3.28084;
  const pitchDeg = (state.rotation * 180) / Math.PI;

  return (
    <div className="flex gap-4 p-4 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl pointer-events-none select-none">
      {/* Airspeed Indicator */}
      <div className="relative w-24 h-24 bg-black rounded-full border-4 border-slate-600 shadow-inner">
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-mono text-gray-400 mt-8">KNOTS</span>
        </div>
        {/* Ticks */}
        {[...Array(10)].map((_, i) => (
           <div key={i} className="absolute w-full h-full" style={rotate(i * 36 + 180)}>
             <div className="w-0.5 h-1.5 bg-white mx-auto mt-0.5"></div>
           </div>
        ))}
        {/* Needle */}
        <div className="absolute w-full h-full transition-transform duration-75 ease-linear" style={rotate(speedKnots * 2)}>
           <div className="w-0.5 h-10 bg-orange-500 mx-auto mt-2 origin-bottom"></div>
        </div>
      </div>

      {/* Artificial Horizon */}
      <div className="relative w-24 h-24 bg-blue-400 rounded-full border-4 border-slate-600 overflow-hidden shadow-inner">
         {/* Ground/Sky moving part */}
         <div 
           className="absolute w-48 h-48 bg-amber-700 transition-transform duration-75 ease-linear"
           style={{
             top: '50%',
             left: '50%',
             marginTop: '-6rem',
             marginLeft: '-6rem',
             transform: `rotate(${-pitchDeg}deg) translateY(${pitchDeg * 2}px)` // Simplified 2D horizon
           }}
         >
            <div className="w-full h-1/2 bg-sky-500 border-b-2 border-white"></div>
         </div>
         {/* Fixed Plane Reference */}
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-0.5 bg-yellow-400 shadow-sm"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-400 -ml-7"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-400 -mr-7"></div>
         </div>
      </div>

      {/* Altimeter */}
      <div className="relative w-24 h-24 bg-black rounded-full border-4 border-slate-600 shadow-inner">
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-mono text-gray-400 mt-4">ALT</span>
        </div>
        {[...Array(10)].map((_, i) => (
           <div key={i} className="absolute w-full h-full" style={rotate(i * 36)}>
             <div className="w-0.5 h-2 bg-white mx-auto mt-0.5"></div>
             <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[8px] text-white font-mono">{i}</span>
           </div>
        ))}
        {/* 1000s Hand */}
        <div className="absolute w-full h-full transition-transform duration-75 ease-linear" style={rotate((altFeet / 1000) * 360)}>
           <div className="w-1 h-6 bg-white mx-auto mt-6 origin-bottom"></div>
        </div>
        {/* 100s Hand */}
        <div className="absolute w-full h-full transition-transform duration-75 ease-linear" style={rotate((altFeet / 100) * 360)}>
           <div className="w-0.5 h-9 bg-white mx-auto mt-3 origin-bottom"></div>
        </div>
      </div>

      {/* VSI */}
      <div className="relative w-24 h-24 bg-black rounded-full border-4 border-slate-600 shadow-inner">
         <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-mono text-gray-400 mb-6">VSI</span>
        </div>
        <div className="absolute left-1 top-1/2 w-2 h-0.5 bg-white"></div>
        <div className="absolute w-full h-full transition-transform duration-75 ease-linear" style={{ transform: `rotate(${(vsiFpm / 1000) * 45 - 90}deg)` }}>
             <div className="w-0.5 h-9 bg-white ml-2 mt-12 origin-right" style={{ transformOrigin: '50% 50%' }}></div> {/* Rough approximation visual */}
             <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-white origin-left" style={{ width: '40%' }}></div>
        </div>
      </div>
    </div>
  );
};
