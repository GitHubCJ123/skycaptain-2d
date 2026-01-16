
import React from 'react';
import { FlightState } from '../types';

interface InstrumentsProps {
  state: FlightState;
  maxFuel: number;
}

const rotate = (deg: number) => ({ transform: `rotate(${deg}deg)`, transformOrigin: 'center' });

// Reusable Gauge Component
const GaugeCircle: React.FC<{ 
    label: string, 
    children: React.ReactNode, 
    className?: string 
}> = ({ label, children, className }) => (
    <div className={`relative w-28 h-28 bg-slate-950 rounded-full border-[3px] border-slate-700 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center overflow-hidden ${className}`}>
        {children}
        <span className="absolute bottom-6 text-[9px] font-bold font-mono text-slate-500 uppercase">{label}</span>
        {/* Glass Glare */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent to-white/10 pointer-events-none"></div>
    </div>
);

export const Instruments: React.FC<InstrumentsProps> = ({ state, maxFuel }) => {
  // Conversions
  const altFeet = state.position.y * 3.28084;
  const speedKnots = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2) * 1.94384;
  const vsiFpm = state.velocity.y * 60 * 3.28084;
  const pitchDeg = (state.rotation * 180) / Math.PI;
  // RPM approximation (max 2700 for C172)
  const rpm = state.engineOn ? (800 + state.throttle * 1700) : 0; 
  
  // Fuel Percentage
  const fuelPercent = (state.fuel / maxFuel) * 100;

  return (
    <div className="flex items-end gap-2 p-3 bg-slate-900 border-t border-slate-700 shadow-2xl pointer-events-none select-none rounded-t-xl">
      
      {/* 1. AIRSPEED */}
      <GaugeCircle label="Airspeed">
         {/* Ticks */}
         {[...Array(11)].map((_, i) => (
           <div key={i} className="absolute w-full h-full" style={rotate(i * 30 + 135)}>
             <div className={`mx-auto mt-1 ${i % 2 === 0 ? 'w-1 h-3 bg-white' : 'w-0.5 h-2 bg-slate-400'}`}></div>
           </div>
         ))}
         {/* Green Arc (Safe Operation) */}
         <svg className="absolute inset-0 w-full h-full rotate-[135deg]">
             <circle cx="50%" cy="50%" r="48" fill="none" stroke="#16a34a" strokeWidth="4" strokeDasharray="60 300" strokeDashoffset="-40" />
         </svg>
         <div className="absolute w-full h-full transition-transform duration-100 ease-linear" style={rotate(speedKnots * 2 + 135)}>
            <div className="w-1 h-12 bg-white mx-auto mt-2 origin-bottom shadow-md"></div>
         </div>
         <div className="absolute text-lg font-mono font-bold text-white z-10">{speedKnots.toFixed(0)}</div>
      </GaugeCircle>

      {/* 2. ATTITUDE INDICATOR (Artificial Horizon) */}
      <div className="relative w-32 h-32 bg-blue-400 rounded-full border-[4px] border-slate-600 overflow-hidden shadow-inner mx-1">
         {/* Sky/Ground */}
         <div 
           className="absolute w-64 h-64 bg-amber-700 transition-transform duration-75 ease-linear"
           style={{
             top: '50%', left: '50%', marginLeft: '-8rem', marginTop: '-8rem',
             transform: `rotate(${-pitchDeg}deg) translateY(${pitchDeg * 3}px)`
           }}
         >
            <div className="w-full h-1/2 bg-sky-500 border-b-2 border-white"></div>
         </div>
         {/* Fixed Reference Plane */}
         <div className="absolute inset-0 flex items-center justify-center">
             <svg width="100%" height="100%" viewBox="0 0 100 100">
                 <path d="M 20 50 L 40 50 L 50 60 L 60 50 L 80 50" stroke="yellow" strokeWidth="3" fill="none" className="drop-shadow-md"/>
                 <circle cx="50" cy="50" r="2" fill="yellow" />
             </svg>
         </div>
         {/* Bank Ticks */}
         <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
             <div className="w-0.5 h-2 bg-white rotate-[-30deg]"></div>
             <div className="w-1 h-3 bg-yellow-400"></div>
             <div className="w-0.5 h-2 bg-white rotate-[30deg]"></div>
         </div>
      </div>

      {/* 3. ALTIMETER */}
      <GaugeCircle label="Altimeter">
        {[...Array(10)].map((_, i) => (
           <div key={i} className="absolute w-full h-full" style={rotate(i * 36)}>
             <div className="w-0.5 h-2 bg-white mx-auto mt-1"></div>
             <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[8px] text-white font-mono">{i}</span>
           </div>
        ))}
        {/* 1000s Hand (Short) */}
        <div className="absolute w-full h-full transition-transform duration-75 ease-linear" style={rotate((altFeet / 1000) * 360)}>
           <div className="w-1.5 h-8 bg-white mx-auto mt-6 origin-bottom border border-black"></div>
        </div>
        {/* 100s Hand (Long) */}
        <div className="absolute w-full h-full transition-transform duration-75 ease-linear" style={rotate((altFeet / 100) * 360)}>
           <div className="w-1 h-11 bg-white mx-auto mt-3 origin-bottom shadow-sm"></div>
        </div>
        <div className="absolute bottom-10 bg-black px-1 text-[9px] font-mono text-green-400 border border-slate-700">
            {altFeet.toFixed(0)}
        </div>
      </GaugeCircle>

      {/* 4. HEADING INDICATOR (Directional Gyro) */}
      <GaugeCircle label="Heading">
         <div className="absolute inset-0 flex items-center justify-center">
            {/* Compass Card - Fixed for 2D, but we could animate slight wiggle */}
            <div className="w-24 h-24 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center relative rotate-90">
                <span className="absolute top-1 text-[10px] text-white font-bold">N</span>
                <span className="absolute right-2 text-[10px] text-white font-bold rotate-90">E</span>
                <span className="absolute bottom-1 text-[10px] text-white font-bold rotate-180">S</span>
                <span className="absolute left-2 text-[10px] text-white font-bold -rotate-90">W</span>
            </div>
            {/* Airplane Reference */}
            <div className="absolute text-orange-500 text-2xl">✈</div>
         </div>
      </GaugeCircle>

      {/* 5. TACHOMETER (RPM) */}
      <GaugeCircle label="RPM x100">
          <div className="absolute bottom-8 text-xs font-mono font-bold text-green-400">
              {(rpm).toFixed(0)}
          </div>
          <svg className="absolute inset-0 w-full h-full rotate-[210deg]">
             {/* Green Arc 2100-2700 approx */}
             <circle cx="50%" cy="50%" r="48" fill="none" stroke="#16a34a" strokeWidth="4" strokeDasharray="50 300" strokeDashoffset="-180" />
             {/* Red Line */}
             <circle cx="50%" cy="50%" r="48" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="10 300" strokeDashoffset="-240" />
          </svg>
          {/* Needle - Scale 0 to 3000 RPM over 270 degrees */}
          <div className="absolute w-full h-full transition-transform duration-100 ease-out" style={rotate((rpm / 3500) * 270 + 225)}>
            <div className="w-1 h-10 bg-white mx-auto mt-4 origin-bottom shadow-md"></div>
         </div>
      </GaugeCircle>

      {/* 6. FUEL & TEMP CLUSTER */}
      <div className="w-20 h-28 flex flex-col gap-1">
          {/* Fuel */}
          <div className="flex-1 bg-slate-950 rounded-lg border border-slate-700 flex flex-col items-center justify-center py-1">
              <span className="text-[8px] text-slate-500 mb-0.5">FUEL</span>
              <div className="w-2 flex-1 bg-slate-800 rounded-full relative overflow-hidden border border-slate-600">
                  <div 
                    className={`absolute bottom-0 w-full transition-all duration-500 ${fuelPercent < 20 ? 'bg-red-500 animate-pulse' : 'bg-white'}`} 
                    style={{ height: `${Math.min(fuelPercent, 100)}%` }}
                  ></div>
              </div>
              <span className="text-[8px] text-white mt-0.5">{Math.min(fuelPercent, 100).toFixed(0)}%</span>
          </div>
          
          {/* Oil Temp */}
          <div className="h-8 bg-slate-950 rounded-lg border border-slate-700 flex flex-col items-center justify-center p-1">
              <span className="text-[6px] text-slate-500 uppercase leading-none">Oil T.</span>
              <div className="w-12 h-1.5 bg-slate-800 rounded mt-1 overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: state.engineOn ? '80%' : '10%' }}></div>
              </div>
          </div>
      </div>

    </div>
  );
};
