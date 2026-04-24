import React from 'react';
import { Vector2 } from '../types';
import { RUNWAY_START_X, RUNWAY_LENGTH } from '../constants';

interface MinimapProps {
  position: Vector2;
  rotation: number;
  rings?: { x: number; y: number; collected: boolean; kind?: 'normal' | 'boost' }[];
}

export const Minimap: React.FC<MinimapProps> = ({ position, rotation, rings = [] }) => {
  // Independent scales: horizontal corridor is huge, vertical is bounded.
  const SCALE_X = 0.04; // 1px = 25m  → 200px shows ±2500m horizontally
  const SCALE_Y = 0.06; // 1px = ~17m → ground stays visible until ~833m altitude
  const MAP_WIDTH = 200;
  const MAP_HEIGHT = 100;

  // Plane is fixed in the centre of the map; the world scrolls around it.
  const planeMapX = MAP_WIDTH / 2;
  const planeMapY = MAP_HEIGHT / 2;

  // Project a world point to map coordinates, plane-relative.
  // World +Y is up (altitude). Screen +Y is down. So we negate Y.
  const project = (wx: number, wy: number) => ({
    x: planeMapX + (wx - position.x) * SCALE_X,
    y: planeMapY - (wy - position.y) * SCALE_Y,
  });

  // Ground line at world y=0
  const groundScreenY = Math.max(0, Math.min(MAP_HEIGHT, planeMapY + position.y * SCALE_Y));

  // Runway projection (start + end at ground level)
  const runwayStart = project(RUNWAY_START_X, 0);
  const runwayEnd = project(RUNWAY_START_X + RUNWAY_LENGTH, 0);
  const runwayLeft = Math.max(0, Math.min(MAP_WIDTH, runwayStart.x));
  const runwayRight = Math.max(0, Math.min(MAP_WIDTH, runwayEnd.x));

  // Heading: world rotation 0 means flying in +X direction (to the right).
  // The CSS triangle below points UP, so add +90° so rotation=0 points right.
  const headingDeg = rotation * (180 / Math.PI) + 90;

  return (
    <div className="relative w-[200px] h-[100px] bg-slate-900/90 border border-slate-600 rounded-lg overflow-hidden shadow-xl">
      {/* Label */}
      <div className="absolute top-1 left-1 text-[8px] text-slate-400 font-mono z-10">TERRAIN RADAR</div>

      {/* Grid Lines */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-px bg-slate-500" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-slate-500" />
      </div>

      {/* Ground fill */}
      {groundScreenY < MAP_HEIGHT && (
        <div
          className="absolute left-0 w-full bg-emerald-900/50 border-t border-emerald-500/50"
          style={{ top: groundScreenY, height: MAP_HEIGHT - groundScreenY }}
        />
      )}

      {/* Runway */}
      {groundScreenY >= 0 && groundScreenY <= MAP_HEIGHT && runwayRight > runwayLeft && (
        <div
          className="absolute h-[2px] bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]"
          style={{ left: runwayLeft, top: groundScreenY - 1, width: runwayRight - runwayLeft }}
        />
      )}

      {/* Rings */}
      {rings.filter(r => !r.collected).map((r, i) => {
        const p = project(r.x, r.y);
        const isBoost = r.kind === 'boost';
        const dotClass = isBoost
          ? 'absolute w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee]'
          : 'absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_4px_#fbbf24]';
        const offDotClass = isBoost
          ? 'absolute w-1 h-1 rounded-sm bg-cyan-400/80'
          : 'absolute w-1 h-1 rounded-sm bg-amber-500/70';
        const onMap = p.x >= 2 && p.x <= MAP_WIDTH - 2 && p.y >= 2 && p.y <= MAP_HEIGHT - 2;
        if (onMap) {
          return (
            <div
              key={i}
              className={dotClass}
              style={{ top: p.y - (isBoost ? 4 : 3), left: p.x - (isBoost ? 4 : 3) }}
            />
          );
        }
        const cx = Math.max(2, Math.min(MAP_WIDTH - 2, p.x));
        const cy = Math.max(2, Math.min(MAP_HEIGHT - 2, p.y));
        return (
          <div
            key={i}
            className={offDotClass}
            style={{ top: cy - 2, left: cx - 2 }}
          />
        );
      })}

      {/* Plane Icon (centred) — points in direction of travel */}
      <div
        className="absolute w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.9)]"
        style={{
          top: planeMapY - 4,
          left: planeMapX - 4,
          transform: `rotate(${headingDeg}deg)`,
          transformOrigin: 'center',
        }}
      />

      {/* HUD */}
      <div className="absolute bottom-1 right-1 text-[8px] text-amber-500 font-mono">
        DST: {(Math.abs(position.x - (RUNWAY_START_X + RUNWAY_LENGTH / 2)) / 1000).toFixed(2)}km
      </div>
      <div className="absolute bottom-1 left-1 text-[8px] text-sky-400 font-mono">
        ALT: {Math.round(position.y * 3.28084)}ft
      </div>
    </div>
  );
};
