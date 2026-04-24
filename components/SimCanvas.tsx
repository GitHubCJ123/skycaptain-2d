
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FlightState, Mission, Vector2, UserProfile } from '../types';
import { DEFAULT_PARAMS, WORLD_SCALE, INITIAL_STATE, RUNWAY_START_X, RUNWAY_LENGTH, ENGINE_UPGRADES, AERO_UPGRADES, FUEL_UPGRADES, GEAR_UPGRADES, WEIGHT_UPGRADES, HYDRAULICS_UPGRADES, LIVERIES, SMOKE_COLORS } from '../constants';

interface SimCanvasProps {
  mission: Mission | null;
  onUpdateState: (state: FlightState) => void;
  externalControls: {
      throttle: number;
      flaps: number;
      gear: boolean;
      brakes: boolean;
      engineOn: boolean;
  };
  userProfile: UserProfile;
  paused?: boolean;
  onCoinEarned?: (amount: number, label: string, worldPos?: Vector2) => void;
}

interface Ring {
    x: number;
    y: number;
    radius: number;
    collected: boolean;
    pulse: number;
    value: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    type: 'smoke' | 'spark' | 'rain';
}

interface LightningBolt {
    segments: {x: number, y: number}[];
    life: number;
    alpha: number;
}

interface Obstacle {
    x: number;
    height: number;
    width: number;
    type: 'tower';
}

interface Building {
    x: number;
    width: number;
    height: number;
    color: string;
    windowColor: string;
    hasAntenna: boolean;
    antennaHeight: number;
    windowLitPattern: boolean[][]; // Pre-generated pattern of which windows are lit
}

interface CityZone {
    startX: number;
    endX: number;
    buildings: Building[];
}

// Building colors palette
const BUILDING_COLORS = [
    '#475569', '#64748b', '#334155', '#1e293b', // Grays/Slate
    '#78716c', '#57534e', '#44403c', // Stone
    '#7c2d12', '#9a3412', '#c2410c', // Brick orange
    '#1e3a8a', '#1e40af', '#3730a3', // Blues
    '#155e75', '#0e7490', '#0891b2', // Cyan
    '#166534', '#15803d', '#16a34a', // Greens
];

const WINDOW_COLORS = [
    'rgba(250, 250, 180, 0.9)', // Warm yellow
    'rgba(200, 230, 255, 0.8)', // Cool blue
    'rgba(255, 255, 255, 0.7)', // White
    'rgba(180, 200, 255, 0.6)', // Light blue
];

// Generate buildings for a city zone
const generateCityBuildings = (startX: number, endX: number): Building[] => {
    const buildings: Building[] = [];
    let currentX = startX;
    
    while (currentX < endX) {
        const width = 30 + Math.random() * 70; // 30-100m wide
        const height = 20 + Math.random() * 180; // 20-200m tall
        const colorIdx = Math.floor(Math.random() * BUILDING_COLORS.length);
        const windowColorIdx = Math.floor(Math.random() * WINDOW_COLORS.length);
        
        // Pre-generate window lit pattern
        const windowRows = Math.floor(height / 8);
        const windowCols = Math.floor(width / 12);
        const windowLitPattern: boolean[][] = [];
        for (let row = 0; row < windowRows; row++) {
            windowLitPattern[row] = [];
            for (let col = 0; col < windowCols; col++) {
                // ~60% of windows are lit at night, ~30% during day
                windowLitPattern[row][col] = Math.random() > 0.4;
            }
        }
        
        buildings.push({
            x: currentX,
            width,
            height,
            color: BUILDING_COLORS[colorIdx],
            windowColor: WINDOW_COLORS[windowColorIdx],
            hasAntenna: Math.random() > 0.7 && height > 80,
            antennaHeight: 15 + Math.random() * 20,
            windowLitPattern,
        });
        
        currentX += width; // No gap between buildings - they touch
    }
    
    return buildings;
};

// Pre-generate city zones at fixed world positions
const generateCityZones = (): CityZone[] => {
    const zones: CityZone[] = [];
    
    // Create cities at various locations (avoiding runway area around 0)
    const cityPositions = [
        { start: -5000, end: -4000 },
        { start: -2500, end: -1800 },
        { start: 2000, end: 3200 },
        { start: 4500, end: 5500 },
        { start: 7000, end: 8500 },
        { start: -8000, end: -6500 },
    ];
    
    for (const pos of cityPositions) {
        zones.push({
            startX: pos.start,
            endX: pos.end,
            buildings: generateCityBuildings(pos.start, pos.end),
        });
    }
    
    return zones;
};

export const SimCanvas: React.FC<SimCanvasProps> = ({ mission, onUpdateState, externalControls, userProfile, paused = false, onCoinEarned }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const stateRef = useRef<FlightState>(JSON.parse(JSON.stringify(INITIAL_STATE)));
  
  // Visual Effects State
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<{x: number, y: number, alpha: number, size: number}[]>([]);
  const rainRef = useRef<Particle[]>([]);
  const boltsRef = useRef<LightningBolt[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const landingScoredRef = useRef<boolean>(false);
  const wasAirborneRef = useRef<boolean>(false);
  const pendingLandingRef = useRef<{ bonus: number; label: string } | null>(null);
  const pausedRef = useRef<boolean>(false);
  const cityZonesRef = useRef<CityZone[]>(generateCityZones());
  
  // Lightning Flash State (Screen whiteout)
  const lightningFlashRef = useRef({ intensity: 0 });

  // Camera state
  const cameraRef = useRef<Vector2>({ x: 0, y: 100 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Resolve Upgrades
  const engineStats = ENGINE_UPGRADES[userProfile.upgrades.engineLevel || 0];
  const aeroStats = AERO_UPGRADES[userProfile.upgrades.aeroLevel || 0];
  const fuelStats = FUEL_UPGRADES[userProfile.upgrades.fuelLevel || 0];
  const gearStats = GEAR_UPGRADES[userProfile.upgrades.gearLevel || 0];
  const weightStats = WEIGHT_UPGRADES[userProfile.upgrades.weightLevel || 0];
  const hydraulicsStats = HYDRAULICS_UPGRADES[userProfile.upgrades.hydraulicsLevel || 0];
  
  const liveryColor = LIVERIES.find(l => l.id === userProfile.upgrades.liveryId)?.value || '#dc2626';
  const smokeColor = SMOKE_COLORS.find(s => s.id === userProfile.upgrades.smokeId)?.value || 'rgba(200, 200, 200, 0.4)';

  // Initialize stars once
  useEffect(() => {
    const stars = [];
    for(let i=0; i<200; i++) {
        stars.push({
            x: Math.random() * 2000,
            y: Math.random() * 1000,
            alpha: Math.random(),
            size: Math.random() * 1.5 + 0.5
        });
    }
    starsRef.current = stars;
  }, []);

  // Initialize mission
  useEffect(() => {
    if (mission) {
      const startPos = { 
        x: mission.startingConditions.airborne ? 0 : RUNWAY_START_X + 50, 
        y: mission.startingConditions.altitude 
      };

      // Specific logic for landing mission (offset X to be far away)
      if (mission.id === 'landing-practice') {
          startPos.x = RUNWAY_START_X - 2000;
      }

      stateRef.current = {
        ...INITIAL_STATE,
        position: startPos,
        velocity: { 
            x: mission.startingConditions.speed, 
            y: 0 
        },
        engineOn: mission.startingConditions.airborne,
        gear: !mission.startingConditions.airborne,
        throttle: mission.startingConditions.airborne ? 0.7 : 0,
        rotation: mission.startingConditions.airborne ? 0 : 0, // Flat if on ground
        fuel: fuelStats.capacity, // Initialize with upgraded capacity
      };

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      cameraRef.current = {
        x: startPos.x * WORLD_SCALE - winW * 0.3,
        y: startPos.y * WORLD_SCALE + winH * 0.6
      };
      
      // Generate Obstacles (Towers)
      const obs: Obstacle[] = [];
      if (mission.obstaclesEnabled) {
          const runwayBuffer = 200; // Meters around runway to keep clear
          const runwayEnd = RUNWAY_START_X + RUNWAY_LENGTH;
          
          // Generate 10 towers randomly
          for(let i=0; i<10; i++) {
              let xPos = (Math.random() - 0.5) * 8000; // Spread across 8km
              
              // Ensure not on runway
              if (xPos > RUNWAY_START_X - runwayBuffer && xPos < runwayEnd + runwayBuffer) {
                  // Push it out
                  xPos = xPos > (RUNWAY_START_X + RUNWAY_LENGTH / 2) ? runwayEnd + runwayBuffer + Math.random() * 500 : RUNWAY_START_X - runwayBuffer - Math.random() * 500;
              }

              obs.push({
                  x: xPos,
                  height: 50 + Math.random() * 150, // 50m to 200m tall
                  width: 10,
                  type: 'tower'
              });
          }
      }
      obstaclesRef.current = obs;

      // Generate Coin Rings - floating collectibles in the sky
      const rings: Ring[] = [];
      const ringCount = 14;
      for (let i = 0; i < ringCount; i++) {
          // Spread rings across the playable corridor; bias near runway region
          const xPos = -3500 + (i / (ringCount - 1)) * 9000 + (Math.random() - 0.5) * 400;
          const yPos = 80 + Math.random() * 700; // 80m - 780m altitude
          rings.push({
              x: xPos,
              y: yPos,
              radius: 22, // meters
              collected: false,
              pulse: Math.random() * Math.PI * 2,
              value: 5,
          });
      }
      ringsRef.current = rings;
      landingScoredRef.current = false;
      wasAirborneRef.current = mission.startingConditions.airborne;
      pendingLandingRef.current = null;

      // Regenerate city zones with fresh building data
      cityZonesRef.current = generateCityZones();

      // Clear particles on reset
      particlesRef.current = [];
      rainRef.current = [];
      boltsRef.current = [];
      lightningFlashRef.current = { intensity: 0 };
    }
  }, [mission, fuelStats.capacity]);

  // Sync paused flag into ref for game loop
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Sync external controls
  useEffect(() => {
    const state = stateRef.current;
    state.throttle = externalControls.throttle;
    state.flaps = externalControls.flaps;
    state.gear = externalControls.gear;
    state.brakes = externalControls.brakes;
    
    // Only allow engine on if we have fuel
    if (state.fuel > 0) {
        state.engineOn = externalControls.engineOn;
    } else {
        state.engineOn = false;
    }
  }, [externalControls]);

  // Input Handling
  const inputRef = useRef({ pitchUp: false, pitchDown: false });
  const invertPitchRef = useRef<boolean>(!!userProfile.invertPitch);
  useEffect(() => { invertPitchRef.current = !!userProfile.invertPitch; }, [userProfile.invertPitch]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
        if (e.key === "ArrowUp") {
            if (invertPitchRef.current) inputRef.current.pitchDown = true;
            else inputRef.current.pitchUp = true;
        }
        if (e.key === "ArrowDown") {
            if (invertPitchRef.current) inputRef.current.pitchUp = true;
            else inputRef.current.pitchDown = true;
        }
    };
    const up = (e: KeyboardEvent) => {
        if (e.key === "ArrowUp") {
            if (invertPitchRef.current) inputRef.current.pitchDown = false;
            else inputRef.current.pitchUp = false;
        }
        if (e.key === "ArrowDown") {
            if (invertPitchRef.current) inputRef.current.pitchUp = false;
            else inputRef.current.pitchDown = false;
        }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
    };
  }, []);

  const spawnParticle = (x: number, y: number, type: 'smoke' | 'spark', velocity: Vector2) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'spark' ? Math.random() * 5 + 2 : Math.random() * 0.5;
      
      particlesRef.current.push({
          x,
          y,
          vx: velocity.x + Math.cos(angle) * speed,
          vy: velocity.y + Math.sin(angle) * speed,
          life: 1.0,
          maxLife: 1.0,
          size: type === 'smoke' ? Math.random() * 5 + 2 : Math.random() * 2 + 1,
          color: type === 'smoke' 
            ? smokeColor
            : `rgba(255, ${Math.floor(Math.random() * 155) + 100}, 0, 1)`,
          type
      });
  };

  const updateParticles = (dt: number) => {
      const s = stateRef.current;
      const isStorm = mission?.weather.precipitation === 'storm';

      // General Particles (Smoke/Sparks)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.life -= dt * (p.type === 'spark' ? 3.0 : 1.5); 
          p.x += p.vx * dt; 
          p.y += p.vy * dt;
          
          if (p.type === 'spark') {
              p.vy -= 9.81 * dt; 
          } else {
              p.size += dt * 10; 
              p.vy += 2 * dt; 
          }

          if (p.life <= 0) {
              particlesRef.current.splice(i, 1);
          }
      }

      // Rain Particles
      if (mission?.weather.precipitation && mission.weather.precipitation !== 'none') {
        const spawnCount = isStorm ? 40 : 5;
        
        for(let i=0; i<spawnCount; i++) {
            const width = windowSize.width;
            const height = windowSize.height;
            
            const worldCamX = cameraRef.current.x / WORLD_SCALE;
            const worldCamY = cameraRef.current.y / WORLD_SCALE;
            
            const x = (worldCamX) + (Math.random() * width/WORLD_SCALE * 2.0) - (width/WORLD_SCALE * 0.5);
            const y = (worldCamY) + (height/WORLD_SCALE * 0.8) + Math.random() * 20;

            rainRef.current.push({
                x, y,
                vx: mission.weather.windSpeed * -0.5, 
                vy: isStorm ? -60 - Math.random() * 30 : -40 - Math.random() * 20, 
                life: 1.0, maxLife: 1.0,
                size: Math.random() * 2 + 1,
                color: isStorm ? 'rgba(200, 220, 255, 0.6)' : 'rgba(180, 200, 220, 0.4)',
                type: 'rain'
            });
        }

        for (let i = rainRef.current.length - 1; i >= 0; i--) {
            const p = rainRef.current[i];
            p.y += p.vy * dt;
            p.x += p.vx * dt;

            if (p.y < (cameraRef.current.y/WORLD_SCALE - windowSize.height/WORLD_SCALE - 20)) {
                rainRef.current.splice(i, 1);
            }
        }
      }
      
      // Lightning
      if (lightningFlashRef.current.intensity > 0) {
          lightningFlashRef.current.intensity -= dt * 3;
          if(lightningFlashRef.current.intensity < 0) lightningFlashRef.current.intensity = 0;
      }

      if (isStorm && Math.random() < 0.01) { 
           lightningFlashRef.current.intensity = 0.8 + Math.random() * 0.2;
           const planeX = s.position.x;
           const planeY = s.position.y;
           const startX = planeX + (Math.random() - 0.5) * 1000;
           const startY = planeY + 800; 
           
           const segments = [{x: startX, y: startY}];
           let currX = startX;
           let currY = startY;
           const groundLevel = 0;
           
           while (currY > groundLevel) {
               currY -= (30 + Math.random() * 80);
               currX += (Math.random() - 0.5) * 150; 
               segments.push({x: currX, y: currY});
           }
           
           boltsRef.current.push({
               segments,
               life: 0.3,
               alpha: 1.0
           });
      }

      for (let i = boltsRef.current.length - 1; i >= 0; i--) {
          const bolt = boltsRef.current[i];
          bolt.life -= dt;
          bolt.alpha = bolt.life / 0.3;
          if (bolt.life <= 0) {
              boltsRef.current.splice(i, 1);
          }
      }
  };

  const updatePhysics = (dt: number) => {
    const s = stateRef.current;
    if (s.crashed) return;

    // --- Environment ---
    const altitude = s.position.y;
    const airDensityRatio = Math.exp(-altitude / 7000); 
    const currentAirDensity = DEFAULT_PARAMS.airDensity * airDensityRatio;

    // --- Forces ---
    const v2 = s.velocity.x ** 2 + s.velocity.y ** 2;
    const speed = Math.sqrt(v2);
    
    // --- Fuel Consumption & Refueling ---
    const onGround = s.position.y <= 0.1;
    
    // Upgraded engines might consume slightly more fuel, but let's keep it simple for now
    const consumptionRate = 0.2; 
    
    if (s.engineOn && s.fuel > 0) {
        s.fuel -= s.throttle * dt * consumptionRate;
        if (s.fuel < 0) {
            s.fuel = 0;
            s.engineOn = false;
        }
    } else if (onGround && speed < 1.0 && !s.engineOn) {
        // Refuel when stopped on ground with engine off
        const maxFuel = fuelStats.capacity;
        if (s.fuel < maxFuel) {
            s.fuel += dt * 10.0; // Refuel rate: 10 units per second
            if (s.fuel > maxFuel) s.fuel = maxFuel;
        }
    }

    const gamma = Math.atan2(s.velocity.y, s.velocity.x);
    
    // Angle of Attack (Alpha) calculation
    let alpha = s.rotation - gamma;
    while (alpha > Math.PI) alpha -= Math.PI * 2;
    while (alpha < -Math.PI) alpha += Math.PI * 2;

    const dynamicPressure = 0.5 * currentAirDensity * v2;

    // --- Lift & Drag ---
    // Apply Aero Upgrades to drag coefficient
    // The base coefficient is modulated heavily by the Aero Level.
    const currentDragCoeff = DEFAULT_PARAMS.dragCoefficient * aeroStats.dragMod;

    const stallAngle = 0.30; 
    let Cl = 0;
    let Cd = currentDragCoeff;
    let pitchMoment = 0;

    if (Math.abs(alpha) < stallAngle) {
        // Normal Flight
        Cl = 2 * Math.PI * alpha;
        s.stallWarning = false;
        // Induced Drag (Lift induced)
        Cd += (Cl * Cl) / (Math.PI * 0.8 * 7);
        pitchMoment -= alpha * 2.0; 
    } else {
        // Stalled
        s.stallWarning = true;
        Cl = Math.sin(alpha) * 0.8; 
        // Massive drag spike when stalled
        Cd += 0.8 * Math.sin(Math.abs(alpha));
        if (Math.abs(alpha) < Math.PI / 2) {
             pitchMoment -= 1.5 * Math.sign(alpha);
        }
    }

    // Flaps effect
    Cl += s.flaps * 0.6;
    Cd += s.flaps * 0.08;
    
    // Landing Gear Drag
    if (s.gear) Cd += 0.05; 

    // Forces
    const liftForceMag = Cl * dynamicPressure * DEFAULT_PARAMS.wingArea;
    const dragForceMag = Cd * dynamicPressure * DEFAULT_PARAMS.wingArea;

    const liftX = -Math.sin(gamma) * liftForceMag;
    const liftY = Math.cos(gamma) * liftForceMag;
    const dragX = -Math.cos(gamma) * dragForceMag;
    const dragY = -Math.sin(gamma) * dragForceMag;

    // Thrust - Apply Engine Upgrade
    const currentThrustPower = engineStats.power;
    const thrustMag = s.engineOn ? s.throttle * currentThrustPower * (airDensityRatio * 0.8 + 0.2) : 0;
    const thrustX = Math.cos(s.rotation) * thrustMag;
    const thrustY = Math.sin(s.rotation) * thrustMag;

    // Engine Smoke
    if (s.engineOn) {
        const cosR = Math.cos(s.rotation);
        const sinR = Math.sin(s.rotation);
        const engX = s.position.x + (cosR * 2.5 - sinR * 0.2);
        const engY = s.position.y + (sinR * 2.5 + cosR * 0.2);
        
        if (Math.random() < s.throttle * 0.5 + 0.1) {
             spawnParticle(engX, engY, 'smoke', { x: 0, y: 0 });
        }
    }

    // Turbulence (Increased intensity for Storm, Reduced by Aero Upgrade)
    let turbulenceX = 0;
    let turbulenceY = 0;
    if (mission?.weather.turbulence && speed > 20) {
        // Apply Aero Upgrade to reduce turbulence effect
        const baseIntensity = mission.weather.turbulence * (speed / 50) * 1000 * aeroStats.turbulenceMod;
        if (Math.random() < 0.1) { 
            turbulenceX = (Math.random() - 0.5) * baseIntensity * 2;
            turbulenceY = (Math.random() - 0.5) * baseIntensity * 2;
        }
    }

    // Gravity - Use Weight Upgrade Mass
    const currentMass = weightStats.mass;
    const gravityForce = currentMass * DEFAULT_PARAMS.gravity;

    let Fx = liftX + dragX + thrustX + turbulenceX;
    let Fy = liftY + dragY + thrustY - gravityForce + turbulenceY;

    // --- Ground Interaction ---
    const isGround = s.position.y <= 0.1;

    if (isGround) {
        s.landed = true;
        
        if (!s.gear && speed > 1) {
            if (speed > 5) s.crashed = true;
            if (Math.random() > 0.5) {
                spawnParticle(s.position.x, 0, 'spark', {x: -speed * 0.5, y: Math.random() * 5});
            }
            const frictionCoeff = 2.0; 
            const normalForce = gravityForce - liftY;
            if (normalForce > 0) {
                 const frictionMag = normalForce * frictionCoeff;
                 const dirX = Math.sign(s.velocity.x);
                 Fx -= dirX * frictionMag;
            }
        } 
        else if (s.rotation > 0.2 && speed > 5) {
             const tailX = s.position.x - Math.cos(s.rotation) * 3.0;
             spawnParticle(tailX, 0, 'spark', {x: -speed * 0.5, y: Math.random() * 10});
        }
        
        if (s.gear) {
            if (Fy < 0) Fy = 0;
            // Apply Landing Gear Upgrades to braking and crash tolerance
            const frictionCoeff = s.brakes ? gearStats.brakeMod : 0.02;
            const normalForce = gravityForce - liftY;
            if (normalForce > 0) {
                const frictionMag = normalForce * frictionCoeff;
                const dirX = Math.sign(s.velocity.x);
                Fx -= dirX * frictionMag;
            }
            // Use gearStats.tolerance (Default 6, upgrades to 8, 10, 14)
            if (s.velocity.y < -gearStats.tolerance) s.crashed = true;
        }
        
        s.position.y = 0;
        if (s.velocity.y < 0) s.velocity.y = 0;
    } else {
        s.landed = false;
    }

    // --- Ring Collection ---
    {
        const px = s.position.x;
        const py = s.position.y;
        for (const ring of ringsRef.current) {
            if (ring.collected) continue;
            const dx = px - ring.x;
            const dy = py - ring.y;
            // Squared distance check vs ring radius (plane half-size ~3m)
            if (dx*dx + dy*dy < (ring.radius + 3) * (ring.radius + 3)) {
                ring.collected = true;
                // Burst of celebratory sparks
                for (let i = 0; i < 18; i++) {
                    const angle = (i / 18) * Math.PI * 2;
                    const speed = 6 + Math.random() * 4;
                    particlesRef.current.push({
                        x: ring.x,
                        y: ring.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1.0,
                        maxLife: 1.0,
                        size: 2 + Math.random() * 2,
                        color: `rgba(251, 191, 36, 1)`,
                        type: 'spark',
                    });
                }
                onCoinEarned?.(ring.value, `+${ring.value} RING`, { x: ring.x, y: ring.y });
            }
        }
    }

    // --- Smooth Landing Bonus ---
    {
        const airborne = s.position.y > 1.0;
        // Capture landing quality at moment of touchdown, but defer payout until the plane fully stops.
        if (!airborne && wasAirborneRef.current && !landingScoredRef.current && !s.crashed && !pendingLandingRef.current) {
            const vsi = Math.abs(s.velocity.y);
            const levelness = Math.abs(s.rotation);
            if (s.gear && vsi < 3 && levelness < 0.18) {
                if (vsi < 1.2 && levelness < 0.10) {
                    pendingLandingRef.current = { bonus: 60, label: "+60 PERFECT LANDING" };
                } else {
                    pendingLandingRef.current = { bonus: 25, label: "+25 SMOOTH LANDING" };
                }
            }
        }
        // Award only once the plane has fully stopped on the ground.
        if (pendingLandingRef.current && !s.crashed) {
            const groundSpeed = Math.sqrt(s.velocity.x * s.velocity.x + s.velocity.y * s.velocity.y);
            if (!airborne && groundSpeed < 0.5) {
                landingScoredRef.current = true;
                const { bonus, label } = pendingLandingRef.current;
                pendingLandingRef.current = null;
                onCoinEarned?.(bonus, label, { x: s.position.x, y: 5 });
            }
        }
        if (airborne) {
            wasAirborneRef.current = true;
            // Reset so subsequent landings can be scored after takeoff
            landingScoredRef.current = false;
            pendingLandingRef.current = null;
        }
    }

    // --- Obstacle Collision ---
    const planeX = s.position.x;
    const planeY = s.position.y;
    // Simple AABB hit box for plane (approx 8m wide, 4m high)
    const hitW = 4;
    const hitH = 2;
    
    for(const obs of obstaclesRef.current) {
        // Obstacle box
        // Tower is essentially a line or thin box at obs.x going up to obs.height
        const obsWidth = obs.width; // e.g. 10m base
        
        // Check X overlap
        if (planeX + hitW > obs.x - obsWidth/2 && planeX - hitW < obs.x + obsWidth/2) {
            // Check Y overlap
            if (planeY - hitH < obs.height) {
                s.crashed = true;
                // Add spark at crash site
                spawnParticle(planeX, planeY, 'spark', {x: 0, y: 0});
            }
        }
    }

    // Newton's 2nd Law (F=ma)
    const ax = Fx / currentMass;
    const ay = Fy / currentMass;

    s.velocity.x += ax * dt;
    s.velocity.y += ay * dt;
    s.position.x += s.velocity.x * dt;
    s.position.y += s.velocity.y * dt;

    let torque = 0;
    // Hydraulics increase control authority
    const controlAuthority = Math.min(dynamicPressure / 500, 1.5) * hydraulicsStats.effectiveness; 

    if (inputRef.current.pitchUp) torque += 1.5 * controlAuthority; 
    if (inputRef.current.pitchDown) torque -= 1.5 * controlAuthority; 

    torque += pitchMoment * controlAuthority;
    torque -= s.rotation * 0.01; 
    
    // Add turbulence torque (roll/pitch instability)
    if (mission?.weather.turbulence && speed > 30) {
        // Reduced by Aero Upgrade
        torque += (Math.random() - 0.5) * mission.weather.turbulence * 0.5 * aeroStats.turbulenceMod;
    }

    const turnRate = torque * dt; 
    s.rotation += turnRate;

    if (isGround && s.gear) {
        if (speed < 30) s.rotation = s.rotation * 0.9;
    }
    if (isGround && s.rotation < -0.2) s.rotation = -0.2;
  };

  // ... (Drawing methods)

  const drawParticles = (ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) => {
      particlesRef.current.forEach(p => {
          ctx.save();
          const screenX = p.x * WORLD_SCALE - cameraX;
          const screenY = -(p.y * WORLD_SCALE) + cameraY;
          
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
      });
  };

  const drawRain = (ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) => {
      ctx.lineWidth = 2; // Thicker rain
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.5)';
      const isStorm = mission?.weather.precipitation === 'storm';
      if (isStorm) ctx.strokeStyle = 'rgba(220, 230, 255, 0.7)';

      rainRef.current.forEach(p => {
          const screenX = p.x * WORLD_SCALE - cameraX;
          const screenY = -(p.y * WORLD_SCALE) + cameraY;
          
          // Optimization: Skip off-screen
          if (screenX < -50 || screenX > ctx.canvas.width + 50) return;
          if (screenY < -50 || screenY > ctx.canvas.height + 50) return;

          const length = isStorm ? 25 : 15;
          const lean = isStorm ? -10 : -5; // Strong wind visual

          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX + lean, screenY + length);
          ctx.stroke();
      });
  };

  const drawBolts = (ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      boltsRef.current.forEach(bolt => {
          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${bolt.alpha})`;
          ctx.shadowColor = `rgba(200, 220, 255, ${bolt.alpha})`;
          ctx.shadowBlur = 20;
          ctx.lineWidth = 3;

          ctx.beginPath();
          if (bolt.segments.length > 0) {
              const start = bolt.segments[0];
              ctx.moveTo(start.x * WORLD_SCALE - cameraX, -(start.y * WORLD_SCALE) + cameraY);
              
              for (let i = 1; i < bolt.segments.length; i++) {
                  const pt = bolt.segments[i];
                  ctx.lineTo(pt.x * WORLD_SCALE - cameraX, -(pt.y * WORLD_SCALE) + cameraY);
              }
          }
          ctx.stroke();
          ctx.restore();
      });
  }

  const drawRings = (ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, dark: boolean) => {
      const time = Date.now() / 1000;
      ringsRef.current.forEach(ring => {
          if (ring.collected) return;
          const screenX = ring.x * WORLD_SCALE - cameraX;
          const screenY = -(ring.y * WORLD_SCALE) + cameraY;
          if (screenX < -200 || screenX > ctx.canvas.width + 200) return;
          if (screenY < -200 || screenY > ctx.canvas.height + 200) return;

          const pulse = 1 + Math.sin(time * 3 + ring.pulse) * 0.08;
          const r = ring.radius * WORLD_SCALE * pulse;

          ctx.save();
          // Outer glow
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = dark ? 30 : 18;
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
          ctx.stroke();
          // Inner brighter ring
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255, 247, 200, 0.95)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(screenX, screenY, r - 3, 0, Math.PI * 2);
          ctx.stroke();
          // Rotating shimmer dot
          const dotAngle = time * 2 + ring.pulse;
          ctx.fillStyle = '#fff';
          ctx.shadowColor = '#fff';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(screenX + Math.cos(dotAngle) * r, screenY + Math.sin(dotAngle) * r, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
      });
  };

  const drawObstacles = (ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) => {
      const time = Date.now();
      obstaclesRef.current.forEach(obs => {
          const screenX = obs.x * WORLD_SCALE - cameraX;
          const screenBaseY = cameraY; // Ground level is 0 in world space
          const screenTopY = -(obs.height * WORLD_SCALE) + cameraY;
          
          // Check visibility
          if (screenX < -50 || screenX > ctx.canvas.width + 50) return;

          ctx.save();
          // Tower legs
          ctx.strokeStyle = '#94a3b8'; // Slate 400
          ctx.lineWidth = 2;
          ctx.beginPath();
          // Left Leg
          ctx.moveTo(screenX - (obs.width*WORLD_SCALE/2), screenBaseY);
          ctx.lineTo(screenX, screenTopY);
          // Right Leg
          ctx.lineTo(screenX + (obs.width*WORLD_SCALE/2), screenBaseY);
          ctx.stroke();
          
          // Cross-bracing (Lattice)
          ctx.lineWidth = 1;
          const segments = 5;
          const hStep = obs.height * WORLD_SCALE / segments;
          
          for(let i=0; i<segments; i++) {
              const y1 = screenBaseY - (i * hStep);
              const y2 = screenBaseY - ((i+1) * hStep);
              
              // Interpolate width at height
              const w1 = (obs.width * WORLD_SCALE) * (1 - (i/segments));
              const w2 = (obs.width * WORLD_SCALE) * (1 - ((i+1)/segments));
              
              ctx.beginPath();
              // X pattern
              ctx.moveTo(screenX - w1/2, y1);
              ctx.lineTo(screenX + w2/2, y2);
              
              ctx.moveTo(screenX + w1/2, y1);
              ctx.lineTo(screenX - w2/2, y2);
              
              // Horizontal bar
              ctx.moveTo(screenX - w2/2, y2);
              ctx.lineTo(screenX + w2/2, y2);
              ctx.stroke();
          }

          // Blinking Light on top
          if (Math.floor(time / 500) % 2 === 0) {
              ctx.fillStyle = '#ef4444';
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(screenX, screenTopY, 4, 0, Math.PI*2);
              ctx.fill();
              ctx.shadowBlur = 0;
          }

          ctx.restore();
      });
  }

  const drawParallaxLayer = (ctx: CanvasRenderingContext2D, cameraX: number, scaleX: number, scaleY: number, yOffset: number, color: string, amplitude: number, frequency: number, width: number, height: number, verticalOffset: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    const segmentWidth = 50;
    const totalSegments = Math.ceil(width / segmentWidth) + 2;
    const startX = Math.floor((cameraX * scaleX) / segmentWidth) * segmentWidth;
    const offsetX = (cameraX * scaleX) % segmentWidth;

    for (let i = -1; i < totalSegments; i++) {
        const x = (i * segmentWidth) - offsetX;
        const worldX = startX + (i * segmentWidth);
        const noise = Math.sin(worldX * frequency) * amplitude + Math.cos(worldX * frequency * 2.5) * (amplitude / 2);
        const y = (height - yOffset - noise) + (verticalOffset * scaleY);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
  };

  // Check if a world position is within a city zone
  const isInCityZone = (worldX: number): CityZone | null => {
    for (const zone of cityZonesRef.current) {
      if (worldX >= zone.startX && worldX <= zone.endX) {
        return zone;
      }
    }
    return null;
  };

  // Draw city buildings
  const drawCityBuildings = (ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, width: number, isNight: boolean, isStorm: boolean) => {
    const worldCamX = cameraX / WORLD_SCALE;
    const viewStartX = worldCamX - 100;
    const viewEndX = worldCamX + (width / WORLD_SCALE) + 100;
    
    for (const zone of cityZonesRef.current) {
      // Skip zones not in view
      if (zone.endX < viewStartX || zone.startX > viewEndX) continue;
      
      // Draw city ground fill first (to cover any gaps)
      const zoneScreenStartX = zone.startX * WORLD_SCALE - cameraX;
      const zoneScreenEndX = zone.endX * WORLD_SCALE - cameraX;
      const zoneWidth = zoneScreenEndX - zoneScreenStartX;
      ctx.fillStyle = (isNight || isStorm) ? '#1e293b' : '#374151'; // Dark ground for city
      ctx.fillRect(zoneScreenStartX, cameraY - 300, zoneWidth, 400); // Fill up from ground
      
      for (const building of zone.buildings) {
        // Skip buildings not in view
        if (building.x + building.width < viewStartX || building.x > viewEndX) continue;
        
        const screenX = building.x * WORLD_SCALE - cameraX;
        const screenBaseY = cameraY; // Ground level
        const buildingWidth = building.width * WORLD_SCALE;
        const buildingHeight = building.height * WORLD_SCALE;
        
        // Building shadow (subtle)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(screenX + 5, screenBaseY - buildingHeight + 5, buildingWidth, buildingHeight);
        
        // Main building body
        ctx.fillStyle = building.color;
        ctx.fillRect(screenX, screenBaseY - buildingHeight, buildingWidth, buildingHeight);
        
        // Building edge highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(screenX, screenBaseY - buildingHeight, 3, buildingHeight);
        
        // Building edge shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(screenX + buildingWidth - 3, screenBaseY - buildingHeight, 3, buildingHeight);
        
        // Windows
        const windowLitPattern = building.windowLitPattern || [];
        const windowRows = windowLitPattern.length;
        const windowCols = windowRows > 0 && windowLitPattern[0] ? windowLitPattern[0].length : 0;
        const windowWidth = 6 * WORLD_SCALE;
        const windowHeight = 4 * WORLD_SCALE;
        const windowSpacingX = windowCols > 0 ? (buildingWidth - windowCols * windowWidth) / (windowCols + 1) : 0;
        const windowSpacingY = windowRows > 0 ? (buildingHeight - windowRows * windowHeight) / (windowRows + 1) : 0;
        
        for (let row = 0; row < windowRows; row++) {
          for (let col = 0; col < windowCols; col++) {
            // Use pre-generated pattern - more windows lit at night
            const isLit = (isNight || isStorm) ? windowLitPattern[row][col] : !windowLitPattern[row][col];
            
            if (isLit) {
              ctx.fillStyle = building.windowColor;
              if (isNight || isStorm) {
                ctx.shadowColor = building.windowColor;
                ctx.shadowBlur = 3;
              }
            } else {
              ctx.fillStyle = 'rgba(30, 40, 50, 0.8)';
              ctx.shadowBlur = 0;
            }
            
            const wx = screenX + windowSpacingX + col * (windowWidth + windowSpacingX);
            const wy = screenBaseY - buildingHeight + windowSpacingY + row * (windowHeight + windowSpacingY);
            ctx.fillRect(wx, wy, windowWidth, windowHeight);
          }
        }
        ctx.shadowBlur = 0;
        
        // Roof details
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(screenX, screenBaseY - buildingHeight, buildingWidth, 3);
        
        // Antenna on some tall buildings
        if (building.hasAntenna) {
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screenX + buildingWidth / 2, screenBaseY - buildingHeight);
          ctx.lineTo(screenX + buildingWidth / 2, screenBaseY - buildingHeight - building.antennaHeight * WORLD_SCALE);
          ctx.stroke();
          
          // Blinking light on antenna
          if ((isNight || isStorm) && Math.floor(Date.now() / 500) % 2 === 0) {
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(screenX + buildingWidth / 2, screenBaseY - buildingHeight - building.antennaHeight * WORLD_SCALE, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
    }
  };

  // Draw parallax mountains/hills only where there's no city
  const drawParallaxWithCities = (ctx: CanvasRenderingContext2D, cameraX: number, scaleX: number, scaleY: number, yOffset: number, color: string, amplitude: number, frequency: number, width: number, height: number, verticalOffset: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    const segmentWidth = 50;
    const totalSegments = Math.ceil(width / segmentWidth) + 2;
    const startX = Math.floor((cameraX * scaleX) / segmentWidth) * segmentWidth;
    const offsetX = (cameraX * scaleX) % segmentWidth;

    for (let i = -1; i < totalSegments; i++) {
        const x = (i * segmentWidth) - offsetX;
        const worldX = (startX + (i * segmentWidth)) / scaleX / WORLD_SCALE;
        
        // Check if we're in a city zone - flatten the terrain
        const cityZone = isInCityZone(worldX);
        
        let y: number;
        if (cityZone) {
            // Flat terrain in city zones (just slightly above ground level)
            y = height - 50 + (verticalOffset * scaleY);
        } else {
            const noise = Math.sin(worldX * frequency * WORLD_SCALE * scaleX) * amplitude + Math.cos(worldX * frequency * 2.5 * WORLD_SCALE * scaleX) * (amplitude / 2);
            y = (height - yOffset - noise) + (verticalOffset * scaleY);
        }
        ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
  };

  const drawClouds = (ctx: CanvasRenderingContext2D, cameraX: number, width: number, verticalOffset: number, isNight: boolean, isStorm: boolean) => {
    // High Clouds
    ctx.fillStyle = isStorm 
        ? 'rgba(30, 41, 59, 0.4)' 
        : isNight ? 'rgba(100, 116, 139, 0.1)' : 'rgba(255, 255, 255, 0.3)';
    
    for(let i=0; i<6; i++) {
        const seed = i * 999;
        const speed = 0.1; 
        const worldWidth = 6000;
        const xPos = (seed % worldWidth) - (cameraX * speed) % worldWidth;
        const actualX = xPos < -300 ? xPos + worldWidth : xPos;
        const yPos = 50 + (seed % 300) + (verticalOffset * 0.05);
        
        ctx.beginPath();
        const size = 60 + (seed % 40);
        ctx.arc(actualX, yPos, size, 0, Math.PI * 2);
        ctx.arc(actualX + size * 0.9, yPos - size * 0.2, size * 1.2, 0, Math.PI * 2);
        ctx.arc(actualX + size * 1.8, yPos, size * 0.9, 0, Math.PI * 2);
        ctx.fill();
    }

    // Low Clouds
    ctx.fillStyle = isStorm
        ? 'rgba(51, 65, 85, 0.7)' 
        : isNight ? 'rgba(148, 163, 184, 0.15)' : 'rgba(255, 255, 255, 0.6)';
    
    for(let i=0; i<8; i++) {
        const seed = i * 1337;
        const speed = 0.25; 
        const worldWidth = 5000;
        const xPos = (seed % worldWidth) - (cameraX * speed) % worldWidth;
        const actualX = xPos < -200 ? xPos + worldWidth : xPos;
        const yPos = 150 + (seed % 400) + (verticalOffset * 0.8);
        
        ctx.beginPath();
        const size = 30 + (seed % 30) + (isStorm ? 20 : 0); 
        ctx.arc(actualX, yPos, size, 0, Math.PI * 2);
        ctx.arc(actualX + size * 0.8, yPos - size * 0.3, size * 1.2, 0, Math.PI * 2);
        ctx.arc(actualX + size * 1.5, yPos, size, 0, Math.PI * 2);
        ctx.fill();
    }
  }

  // Rendering
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    
    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    
    const isNight = mission?.timeOfDay === 'night';
    const isStorm = mission?.weather.precipitation === 'storm';

    // Visual Camera Shake (Simulating Turbulence)
    let shakeX = 0;
    let shakeY = 0;
    if (mission?.weather.turbulence) {
        // Only shake if moving fast enough to feel it
        const speed = Math.sqrt(s.velocity.x**2 + s.velocity.y**2);
        if (speed > 20) {
            // Shake affected by Aero Upgrade
            const intensity = mission.weather.turbulence * (speed/50) * 10 * aeroStats.turbulenceMod; // Pixels
            shakeX = (Math.random() - 0.5) * intensity;
            shakeY = (Math.random() - 0.5) * intensity;
        }
    }

    // Standard Camera Follow
    const targetCamX = s.position.x * WORLD_SCALE - canvasW * 0.3;
    const targetCamY = s.position.y * WORLD_SCALE + canvasH * 0.6;
    
    cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
    cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;

    // Apply Shake to Camera used for Rendering (not physics)
    const renderCamX = cameraRef.current.x + shakeX;
    const renderCamY = cameraRef.current.y + shakeY;

    const verticalShift = s.position.y * WORLD_SCALE;

    // Clear
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.clearRect(0, 0, canvasW, canvasH);
    
    // 1. Sky
    const skyDarkness = Math.min(s.position.y / 10000, 0.8);
    let grad;

    if (isStorm) {
        grad = ctx.createLinearGradient(0, 0, 0, canvasH);
        grad.addColorStop(0, '#0f172a'); // Very dark
        grad.addColorStop(1, '#334155');
    } else if (isNight) {
        grad = ctx.createLinearGradient(0, 0, 0, canvasH);
        grad.addColorStop(0, `rgb(2, 6, 23)`); 
        grad.addColorStop(1, `rgb(30, 41, 59)`); 
    } else {
        const skyR = Math.max(2 - skyDarkness * 2, 0) * 0;
        const skyG = Math.max(132 - skyDarkness * 120, 10);
        const skyB = Math.max(199 - skyDarkness * 150, 40);
        
        grad = ctx.createLinearGradient(0, 0, 0, canvasH);
        grad.addColorStop(0, `rgb(${skyR}, ${skyG}, ${skyB})`);
        grad.addColorStop(1, `rgb(${186 - skyDarkness * 100}, ${230 - skyDarkness * 100}, ${253 - skyDarkness * 100})`);
    }
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Lightning Flash Effect (White Overlay)
    if (lightningFlashRef.current.intensity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlashRef.current.intensity})`;
        ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // Stars (Night Only, No storm)
    if (isNight && !isStorm) {
        ctx.fillStyle = 'white';
        starsRef.current.forEach((star) => {
             const x = (star.x - renderCamX * 0.02) % canvasW;
             const finalX = x < 0 ? x + canvasW : x;
             const y = (star.y + verticalShift * 0.01) % canvasH;
             
             ctx.globalAlpha = star.alpha;
             ctx.beginPath();
             ctx.arc(finalX, y, star.size, 0, Math.PI*2);
             ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    // 2. Parallax Layers (with city awareness - mountains hide in city zones)
    if (isNight || isStorm) {
        drawParallaxWithCities(ctx, renderCamX, 0.1, 0.05, 350, '#0f172a', 150, 0.005, canvasW, canvasH, verticalShift); 
        drawParallaxWithCities(ctx, renderCamX, 0.4, 0.20, 250, '#022c22', 80, 0.01, canvasW, canvasH, verticalShift); 
    } else {
        drawParallaxWithCities(ctx, renderCamX, 0.1, 0.05, 350, '#334155', 150, 0.005, canvasW, canvasH, verticalShift); 
        drawParallaxWithCities(ctx, renderCamX, 0.4, 0.20, 250, '#166534', 80, 0.01, canvasW, canvasH, verticalShift); 
    }

    // Clouds (draw before buildings so buildings are in front)
    drawClouds(ctx, renderCamX, canvasW, verticalShift, isNight, isStorm);

    // Draw city buildings (in front of clouds and parallax layers)
    drawCityBuildings(ctx, renderCamX, renderCamY, canvasW, isNight, isStorm);

    // Lightning Bolts
    drawBolts(ctx, renderCamX, renderCamY);

    // Obstacles
    drawObstacles(ctx, renderCamX, renderCamY);

    // Coin Rings
    drawRings(ctx, renderCamX, renderCamY, isNight || isStorm);

    // Particles
    drawParticles(ctx, renderCamX, renderCamY);

    // Weather Visibility Overlay
    if (mission) {
        const vis = mission.weather.visibility;
        if (vis < 1) {
            ctx.fillStyle = isStorm 
                ? `rgba(15, 23, 42, ${1 - vis})` 
                : `rgba(255, 255, 255, ${1 - vis})`;
            ctx.fillRect(0,0,canvasW,canvasH);
        }
    }

    ctx.save();
    // 3. World Space Transform
    ctx.translate(-renderCamX, renderCamY);

    const groundY = 0; 
    const renderGroundY = -groundY * WORLD_SCALE;

    // Infinite Grass / Earth Fill
    ctx.fillStyle = (isNight || isStorm) ? '#064e3b' : '#14532d'; 
    ctx.fillRect(renderCamX, renderGroundY, canvasW + 200, canvasH * 2); 

    // Runway
    ctx.fillStyle = (isNight || isStorm) ? '#0f172a' : '#1e293b';
    ctx.fillRect(RUNWAY_START_X * WORLD_SCALE, renderGroundY, RUNWAY_LENGTH * WORLD_SCALE, 20 * WORLD_SCALE);
    
    // Runway Lights (Edge Lights)
    ctx.fillStyle = '#fbbf24'; 
    
    for(let i = 0; i < RUNWAY_LENGTH; i += 40) {
        if ((i / 40) % 2 === 0) { 
             const lx = (RUNWAY_START_X + i) * WORLD_SCALE;
             const ly = renderGroundY - 2;
             
             if (isNight || isStorm) {
                 ctx.save();
                 ctx.shadowColor = '#fbbf24';
                 ctx.shadowBlur = 10;
                 ctx.beginPath();
                 ctx.arc(lx, ly, 3, 0, Math.PI*2);
                 ctx.fill();
                 ctx.restore();
             } else {
                 ctx.beginPath();
                 ctx.arc(lx, ly, 2, 0, Math.PI*2);
                 ctx.fill();
             }
        }
    }

    // Runway Stripes
    ctx.fillStyle = (isNight || isStorm) ? '#94a3b8' : '#ffffff'; 
    ctx.font = '40px monospace';
    // Center lines
    for(let i = 0; i < RUNWAY_LENGTH; i += 60) {
        ctx.fillRect((RUNWAY_START_X + i) * WORLD_SCALE, renderGroundY + 80, 40 * WORLD_SCALE, 4);
    }
    // Threshold numbers
    ctx.save();
    ctx.scale(1, -1);
    ctx.fillText("09", (RUNWAY_START_X + 20) * WORLD_SCALE, -(renderGroundY + 50));
    ctx.restore();

    // PAPI Lights
    const distToThreshold = (RUNWAY_START_X - s.position.x);
    if (distToThreshold > -200 && distToThreshold < 5000) {
       const height = s.position.y;
       const distance = Math.abs(distToThreshold);
       const ratio = distance > 0 ? height / distance : 0;
       
       let light1 = '#ef4444'; // Red
       let light2 = '#ef4444'; // Red
       
       if (ratio > 0.07) { light1 = '#ffffff'; light2 = '#ffffff'; } 
       else if (ratio > 0.04) { light1 = '#ffffff'; light2 = '#ef4444'; }
       
       const papiX = (RUNWAY_START_X - 50) * WORLD_SCALE;
       const papiY = renderGroundY - 10; 
       
       ctx.fillStyle = '#333';
       ctx.fillRect(papiX, papiY, 40, 10);
       
       const drawLight = (x: number, color: string) => {
           ctx.fillStyle = color;
           if (isNight || isStorm) {
               ctx.shadowColor = color;
               ctx.shadowBlur = 15;
           }
           ctx.beginPath();
           ctx.arc(x, papiY + 5, 4, 0, Math.PI*2);
           ctx.fill();
           ctx.shadowBlur = 0; // Reset
           
           if (!isNight && !isStorm) { 
               ctx.globalAlpha = 0.3;
               ctx.beginPath();
               ctx.arc(x, papiY + 5, 12, 0, Math.PI*2);
               ctx.fill();
               ctx.globalAlpha = 1.0;
           }
       }
       drawLight(papiX + 10, light1);
       drawLight(papiX + 30, light2);
    }

    // --- Plane ---
    ctx.save();
    ctx.translate(s.position.x * WORLD_SCALE, -s.position.y * WORLD_SCALE);
    ctx.rotate(-s.rotation); 

    const scale = 0.8;

    // Shadow
    if (s.position.y < 50 && !isNight && !isStorm) {
        ctx.save();
        ctx.rotate(s.rotation); 
        ctx.translate(0, s.position.y * WORLD_SCALE); 
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        const shadowScale = Math.max(0, 1 - (s.position.y / 50)); 
        if (shadowScale > 0) {
            ctx.ellipse(0, 20, 40 * scale * shadowScale, 5 * scale * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Plane Lighting (Beam)
    if ((isNight || isStorm) && s.gear && s.engineOn) {
        ctx.save();
        const grad = ctx.createLinearGradient(0, 0, 200, 30);
        grad.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
        grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(35 * scale, 10 * scale); // Start near nose gear
        ctx.lineTo(250 * scale, 50 * scale); // Beam extent
        ctx.lineTo(250 * scale, -20 * scale);
        ctx.fill();
        ctx.restore();
    }

    // Plane Body Drawing
    ctx.fillStyle = liveryColor; // Use Custom Livery Color
    ctx.beginPath();
    ctx.moveTo(-28 * scale, 0);
    ctx.lineTo(-38 * scale, -14 * scale);
    ctx.lineTo(-30 * scale, 0);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d'; // Darker outline
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9'; // Fuselage (White/Grey Accent)
    ctx.beginPath();
    ctx.moveTo(35 * scale, 2 * scale); // Nose
    ctx.bezierCurveTo(35 * scale, -10 * scale, -30 * scale, -8 * scale, -30 * scale, -2 * scale); // Top curve
    ctx.lineTo(-30 * scale, 4 * scale); // Rear bottom
    ctx.lineTo(20 * scale, 6 * scale); // Belly
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Fuselage Color Strip (Custom Livery)
    ctx.fillStyle = liveryColor;
    ctx.beginPath();
    ctx.moveTo(10 * scale, 2 * scale);
    ctx.lineTo(-20 * scale, 2 * scale);
    ctx.lineTo(-20 * scale, -4 * scale);
    ctx.lineTo(10 * scale, -4 * scale);
    ctx.fill();

    // Cockpit Window
    ctx.fillStyle = (isNight || isStorm) ? '#0ea5e9' : '#38bdf8';
    if (isNight || isStorm) {
        ctx.shadowColor = '#0ea5e9';
        ctx.shadowBlur = 5;
    }
    ctx.beginPath();
    ctx.moveTo(5 * scale, -5 * scale);
    ctx.lineTo(20 * scale, -2 * scale);
    ctx.lineTo(20 * scale, 1 * scale);
    ctx.lineTo(5 * scale, 2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    // Main Wing
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-10 * scale, 2 * scale);
    ctx.lineTo(10 * scale, 2 * scale);
    ctx.lineTo(0 * scale, -3 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Landing Gear
    if (s.gear) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 5 * scale);
        ctx.lineTo(-5 * scale, 15 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = '#111';
        ctx.arc(-5 * scale, 15 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(25 * scale, 3 * scale);
        ctx.lineTo(25 * scale, 15 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(25 * scale, 15 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // Landing Light Source Orb
        if ((isNight || isStorm) && s.engineOn) {
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(25 * scale, 10 * scale, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // Propeller Blur
    if (s.engineOn) {
        const blurWidth = 2 + s.throttle * 5;
        ctx.fillStyle = `rgba(50, 50, 50, 0.2)`;
        ctx.beginPath();
        ctx.ellipse(38 * scale, 0, blurWidth, 25 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Beacon Light
    if ((isNight || isStorm) && s.engineOn) {
        const time = Date.now();
        if (Math.floor(time / 1000) % 2 === 0 || true) { 
            const intensity = (Math.sin(time / 100) + 1) / 2;
            if (intensity > 0.8) {
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(-35 * scale, -14 * scale, 2 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }
    // Navigation Light
    if (isNight || isStorm) {
        ctx.fillStyle = '#22c55e'; // Green
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(0 * scale, -3 * scale, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Explosion
    if (s.crashed) {
         ctx.fillStyle = '#f59e0b';
         ctx.beginPath();
         const explosionSize = 50 + Math.sin(Date.now() / 50) * 10;
         ctx.arc(0, 0, explosionSize, 0, Math.PI * 2);
         ctx.fill();
         ctx.fillStyle = '#7f1d1d';
         ctx.beginPath();
         ctx.arc(0, -20, explosionSize * 0.7, 0, Math.PI * 2);
         ctx.fill();
    }

    ctx.restore(); // End Plane
    
    // Draw Rain on top of plane
    if (mission?.weather.precipitation) {
        drawRain(ctx, renderCamX, renderCamY);
    }
    
    ctx.restore(); // End World Camera

    // Engine Hint (Text removed from canvas as it's now on dashboard)
    if (s.stallWarning) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 32px "Inter"';
        ctx.fillText("STALL WARNING", canvasW / 2, canvasH / 2);
        ctx.textAlign = 'left';
    }
    
    // Refueling Hint
    const speed = Math.sqrt(s.velocity.x**2 + s.velocity.y**2);
    const onGround = s.position.y <= 0.1;
    // Get max fuel from constants based on current profile level or default to 100
    const currentMaxFuel = fuelStats.capacity;
    if (onGround && speed < 1.0 && !s.engineOn && s.fuel < currentMaxFuel) {
         ctx.textAlign = 'center';
         ctx.fillStyle = '#22c55e';
         ctx.font = 'bold 24px "Inter"';
         ctx.fillText(`REFUELING: ${s.fuel.toFixed(0)} / ${currentMaxFuel}`, canvasW / 2, canvasH / 2 - 100);
         ctx.textAlign = 'left';
    }

    if (s.crashed) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 48px "Inter"';
        ctx.fillText("CRASHED", canvasW / 2, canvasH / 2);
        if (!s.gear && s.landed) {
            ctx.font = '24px "Inter"';
            ctx.fillText("Forgot Landing Gear!", canvasW / 2, canvasH / 2 + 35);
        }
        ctx.textAlign = 'left';
    }

  }, [mission, userProfile, aeroStats, fuelStats, weightStats, hydraulicsStats]);

  // Main Loop
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (time: number) => {
        const dt = Math.min((time - lastTime) / 1000, 0.1); 
        lastTime = time;
        if (!pausedRef.current) {
            updatePhysics(dt);
            updateParticles(dt);
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) draw(ctx);
        }
        onUpdateState({ ...stateRef.current });
        requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [draw, onUpdateState]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
       setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas 
        ref={canvasRef} 
        width={windowSize.width} 
        height={windowSize.height}
        className="block bg-slate-900 cursor-crosshair active:cursor-grabbing"
    />
  );
};
