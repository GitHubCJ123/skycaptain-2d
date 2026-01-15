import React from 'react';
import { Vector2 } from '../types';
import { RUNWAY_START_X, RUNWAY_LENGTH, GROUND_Y } from '../constants';

interface MinimapProps {
  position: Vector2;
  rotation: number;
}

export const Minimap: React.FC<MinimapProps> = ({ position, rotation }) => {
  // Scale: 1px on map = 50m in world
  const SCALE = 0.05; 
  const MAP_WIDTH = 200;
  const MAP_HEIGHT = 100;
  
  // Center the map on the plane horizontally, but keep ground fixed vertically relative to view
  // Actually, standard aviation radar is "Plane Center".
  // Let's do: Plane is always center X. World moves.
  
  const planeMapX = MAP_WIDTH / 2;
  const planeMapY = MAP_HEIGHT / 2; // Center vertically for now

  // Calculate Runway relative to plane
  const runwayWorldX = RUNWAY_START_X;
  const runwayRelX = (runwayWorldX - position.x) * SCALE;
  const runwayScreenX = planeMapX + runwayRelX;
  const runwayScreenW = RUNWAY_LENGTH * SCALE;

  // Ground relative to plane
  // If plane is at y=1000, ground is at -1000 relative.
  // We want the visual to look like an artificial horizon or side-profile radar.
  // Let's do a side-profile view (Side View Radar).
  const groundRelY = (0 - position.y) * SCALE;
  const groundScreenY = planeMapY - groundRelY;

  return (
    <div className="relative w-[200px] h-[100px] bg-slate-900/90 border border-slate-600 rounded-lg overflow-hidden shadow-xl">
      {/* Label */}
      <div className="absolute top-1 left-1 text-[8px] text-slate-400 font-mono">TERRAIN RADAR</div>
      
      {/* Grid Lines */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="w-full h-1/2 border-b border-slate-500"></div>
          <div className="h-full w-1/2 border-r border-slate-500 absolute top-0 left-0"></div>
      </div>

      {/* Ground Line */}
      <div 
        className="absolute w-full bg-emerald-900/50 border-t border-emerald-500/50"
        style={{ 
            top: Math.min(Math.max(groundScreenY, -100), 200), // Clamp slightly to prevent weirdness
            height: 200, // Extend downwards
            left: 0
        }}
      />

      {/* Runway Marker on Ground */}
      <div 
        className="absolute h-1 bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]"
        style={{
            left: runwayScreenX,
            top: Math.min(Math.max(groundScreenY, -100), 200),
            width: runwayScreenW,
        }}
      />

      {/* Plane Icon */}
      <div 
        className="absolute w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-amber-500"
        style={{
            top: planeMapY - 4,
            left: planeMapX - 4,
            transform: `rotate(${rotation * (180/Math.PI)}deg)`
        }}
      />
      
      {/* Distance Text */}
      <div className="absolute bottom-1 right-1 text-[8px] text-amber-500 font-mono">
        DST: {Math.abs(position.x - (RUNWAY_START_X + RUNWAY_LENGTH/2)).toFixed(0)}m
      </div>
    </div>
  );
};