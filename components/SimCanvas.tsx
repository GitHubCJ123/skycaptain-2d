import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FlightState, Mission, Vector2 } from '../types';
import { DEFAULT_PARAMS, WORLD_SCALE, INITIAL_STATE, RUNWAY_START_X, RUNWAY_LENGTH } from '../constants';

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
    type: 'smoke' | 'spark';
}

export const SimCanvas: React.FC<SimCanvasProps> = ({ mission, onUpdateState, externalControls }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const stateRef = useRef<FlightState>(JSON.parse(JSON.stringify(INITIAL_STATE)));
  
  // Visual Effects State
  const particlesRef = useRef<Particle[]>([]);
  
  // Camera state
  const cameraRef = useRef<Vector2>({ x: 0, y: 100 });
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Initialize mission
  useEffect(() => {
    if (mission) {
      const startPos = { 
        x: mission.startingConditions.airborne ? 0 : RUNWAY_START_X + 50, 
        y: mission.startingConditions.altitude 
      };

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
      };

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      cameraRef.current = {
        x: startPos.x * WORLD_SCALE - winW * 0.3,
        y: startPos.y * WORLD_SCALE + winH * 0.6
      };
      
      // Clear particles on reset
      particlesRef.current = [];
    }
  }, [mission]);

  // Sync external controls
  useEffect(() => {
    const s = stateRef.current;
    s.throttle = externalControls.throttle;
    s.flaps = externalControls.flaps;
    s.gear = externalControls.gear;
    s.brakes = externalControls.brakes;
    s.engineOn = externalControls.engineOn;
  }, [externalControls]);

  // Input Handling
  const inputRef = useRef({ pitchUp: false, pitchDown: false });
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
        if (e.key === "ArrowUp") inputRef.current.pitchUp = true;
        if (e.key === "ArrowDown") inputRef.current.pitchDown = true;
    };
    const up = (e: KeyboardEvent) => {
        if (e.key === "ArrowUp") inputRef.current.pitchUp = false;
        if (e.key === "ArrowDown") inputRef.current.pitchDown = false;
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
            ? `rgba(200, 200, 200, 0.4)` 
            : `rgba(255, ${Math.floor(Math.random() * 155) + 100}, 0, 1)`,
          type
      });
  };

  const updateParticles = (dt: number) => {
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
  };

  const updatePhysics = (dt: number) => {
    const s = stateRef.current;
    if (s.crashed) return;

    // --- Environment ---
    const altitude = s.position.y;
    // Increased scale height from 3500 to 7000 to allow higher flight
    const airDensityRatio = Math.exp(-altitude / 7000); 
    const currentAirDensity = DEFAULT_PARAMS.airDensity * airDensityRatio;

    // --- Forces ---
    const v2 = s.velocity.x ** 2 + s.velocity.y ** 2;
    const speed = Math.sqrt(v2);
    const gamma = Math.atan2(s.velocity.y, s.velocity.x);
    
    // Angle of Attack (Alpha) calculation
    let alpha = s.rotation - gamma;
    while (alpha > Math.PI) alpha -= Math.PI * 2;
    while (alpha < -Math.PI) alpha += Math.PI * 2;

    const dynamicPressure = 0.5 * currentAirDensity * v2;

    // --- Lift & Drag ---
    const stallAngle = 0.30; 
    let Cl = 0;
    let Cd = DEFAULT_PARAMS.dragCoefficient;
    let pitchMoment = 0;

    if (Math.abs(alpha) < stallAngle) {
        Cl = 2 * Math.PI * alpha;
        s.stallWarning = false;
        Cd += (Cl * Cl) / (Math.PI * 0.8 * 7);
        pitchMoment -= alpha * 2.0; 
    } else {
        s.stallWarning = true;
        Cl = Math.sin(alpha) * 0.8; 
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

    // Thrust
    const thrustMag = s.engineOn ? s.throttle * DEFAULT_PARAMS.thrustPower * (airDensityRatio * 0.8 + 0.2) : 0;
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

    // Gravity
    const gravityForce = DEFAULT_PARAMS.mass * DEFAULT_PARAMS.gravity;

    let Fx = liftX + dragX + thrustX;
    let Fy = liftY + dragY + thrustY - gravityForce;

    // --- Ground Interaction ---
    const heightAboveGround = s.position.y;
    const onGround = heightAboveGround <= 0.1;

    if (onGround) {
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
            const frictionCoeff = s.brakes ? 0.8 : 0.02;
            const normalForce = gravityForce - liftY;
            if (normalForce > 0) {
                const frictionMag = normalForce * frictionCoeff;
                const dirX = Math.sign(s.velocity.x);
                Fx -= dirX * frictionMag;
            }
            if (s.velocity.y < -6) s.crashed = true;
        }
        
        s.position.y = 0;
        if (s.velocity.y < 0) s.velocity.y = 0;
    } else {
        s.landed = false;
    }

    const ax = Fx / DEFAULT_PARAMS.mass;
    const ay = Fy / DEFAULT_PARAMS.mass;

    s.velocity.x += ax * dt;
    s.velocity.y += ay * dt;
    s.position.x += s.velocity.x * dt;
    s.position.y += s.velocity.y * dt;

    let torque = 0;
    const controlAuthority = Math.min(dynamicPressure / 500, 1.5); 

    if (inputRef.current.pitchUp) torque += 1.5 * controlAuthority; 
    if (inputRef.current.pitchDown) torque -= 1.5 * controlAuthority; 

    torque += pitchMoment * controlAuthority;
    torque -= s.rotation * 0.01; 

    const turnRate = torque * dt; 
    s.rotation += turnRate;

    if (onGround && s.gear) {
        if (speed < 30) s.rotation = s.rotation * 0.9;
    }
    if (onGround && s.rotation < -0.2) s.rotation = -0.2;
  };

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
        
        // Add verticalOffset (which is positive as plane goes up) to push mountains down
        const y = (height - yOffset - noise) + (verticalOffset * scaleY);
        ctx.lineTo(x, y);
    }
    // Anchor to bottom of screen
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
  };

  const drawClouds = (ctx: CanvasRenderingContext2D, cameraX: number, width: number, verticalOffset: number) => {
    // Layer 1: High Cirrus Clouds (Slow vertical movement)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for(let i=0; i<6; i++) {
        const seed = i * 999;
        const speed = 0.1; 
        const worldWidth = 6000;
        
        const xPos = (seed % worldWidth) - (cameraX * speed) % worldWidth;
        const actualX = xPos < -300 ? xPos + worldWidth : xPos;
        
        // High clouds: Move down very slowly (factor 0.05) as you go up
        const yPos = 50 + (seed % 300) + (verticalOffset * 0.05);
        
        ctx.beginPath();
        const size = 60 + (seed % 40);
        ctx.arc(actualX, yPos, size, 0, Math.PI * 2);
        ctx.arc(actualX + size * 0.9, yPos - size * 0.2, size * 1.2, 0, Math.PI * 2);
        ctx.arc(actualX + size * 1.8, yPos, size * 0.9, 0, Math.PI * 2);
        ctx.fill();
    }

    // Layer 2: Low Cumulus Clouds (Fast vertical movement - can fly over them)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for(let i=0; i<8; i++) {
        const seed = i * 1337;
        const speed = 0.25; 
        const worldWidth = 5000;
        const xPos = (seed % worldWidth) - (cameraX * speed) % worldWidth;
        const actualX = xPos < -200 ? xPos + worldWidth : xPos;
        
        // Low clouds: Move down quickly (factor 0.8) giving sense of height
        const yPos = 150 + (seed % 400) + (verticalOffset * 0.8);
        
        ctx.beginPath();
        const size = 30 + (seed % 30);
        ctx.arc(actualX, yPos, size, 0, Math.PI * 2);
        ctx.arc(actualX + size * 0.8, yPos - size * 0.3, size * 1.2, 0, Math.PI * 2);
        ctx.arc(actualX + size * 1.5, yPos, size, 0, Math.PI * 2);
        ctx.fill();
    }
  }

  // Rendering
  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Smooth Camera
    const targetCamX = s.position.x * WORLD_SCALE - width * 0.3;
    const targetCamY = s.position.y * WORLD_SCALE + height * 0.6;
    
    cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
    cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;

    // Calculate vertical shift for parallax (based on altitude)
    // s.position.y is meters. WORLD_SCALE is 10 px/m.
    // At y=0, shift is 0. At y=1000m, shift is 10000px (unscaled).
    const verticalShift = s.position.y * WORLD_SCALE;

    // 1. Sky
    ctx.clearRect(0, 0, width, height);
    
    // Sky gets darker as you go higher
    const skyDarkness = Math.min(s.position.y / 10000, 0.8); // Cap at 80% darkness
    const skyR = Math.max(2 - skyDarkness * 2, 0) * 0; // Blacker
    const skyG = Math.max(132 - skyDarkness * 120, 10);
    const skyB = Math.max(199 - skyDarkness * 150, 40);
    
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `rgb(${skyR}, ${skyG}, ${skyB})`); // #0284c7 dimmed
    grad.addColorStop(1, `rgb(${186 - skyDarkness * 100}, ${230 - skyDarkness * 100}, ${253 - skyDarkness * 100})`); // #bae6fd dimmed
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 2. Parallax Layers
    // Far Mountains (Slow X, Very Slow Y)
    drawParallaxLayer(ctx, cameraRef.current.x, 0.1, 0.05, 350, '#334155', 150, 0.005, width, height, verticalShift); 
    // Near Hills (Faster X, Faster Y)
    drawParallaxLayer(ctx, cameraRef.current.x, 0.4, 0.20, 250, '#166534', 80, 0.01, width, height, verticalShift); 

    // Clouds
    drawClouds(ctx, cameraRef.current.x, width, verticalShift);

    // Particles (Background smoke)
    drawParticles(ctx, cameraRef.current.x, cameraRef.current.y);

    // Weather Effects
    if (mission) {
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - mission.weather.visibility})`;
        ctx.fillRect(0,0,width,height);
    }

    ctx.save();
    // 3. World Space Transform
    ctx.translate(-cameraRef.current.x, cameraRef.current.y);

    const groundY = 0; 
    const renderGroundY = -groundY * WORLD_SCALE;

    // Infinite Grass / Earth Fill
    ctx.fillStyle = '#14532d'; 
    ctx.fillRect(cameraRef.current.x, renderGroundY, width, height * 2);

    // Runway
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(RUNWAY_START_X * WORLD_SCALE, renderGroundY, RUNWAY_LENGTH * WORLD_SCALE, 20 * WORLD_SCALE);
    
    // Runway Stripes
    ctx.fillStyle = '#ffffff';
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

    // --- Plane ---
    ctx.save();
    ctx.translate(s.position.x * WORLD_SCALE, -s.position.y * WORLD_SCALE);
    ctx.rotate(-s.rotation); 

    const scale = 0.8;

    // Shadow
    if (s.position.y < 50) { 
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

    // Improved Plane Drawing
    // Tail
    ctx.fillStyle = '#dc2626'; // Red
    ctx.beginPath();
    ctx.moveTo(-28 * scale, 0);
    ctx.lineTo(-38 * scale, -14 * scale);
    ctx.lineTo(-30 * scale, 0);
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.stroke();

    // Fuselage (Body)
    ctx.fillStyle = '#f1f5f9'; // White
    ctx.beginPath();
    ctx.moveTo(35 * scale, 2 * scale); // Nose
    ctx.bezierCurveTo(35 * scale, -10 * scale, -30 * scale, -8 * scale, -30 * scale, -2 * scale); // Top curve
    ctx.lineTo(-30 * scale, 4 * scale); // Rear bottom
    ctx.lineTo(20 * scale, 6 * scale); // Belly
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit Window
    ctx.fillStyle = '#38bdf8'; // Glass
    ctx.beginPath();
    ctx.moveTo(5 * scale, -5 * scale);
    ctx.lineTo(20 * scale, -2 * scale);
    ctx.lineTo(20 * scale, 1 * scale);
    ctx.lineTo(5 * scale, 2 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Main Wing (Foreground)
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
        
        // Main gear
        ctx.beginPath();
        ctx.moveTo(0, 5 * scale);
        ctx.lineTo(-5 * scale, 15 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = '#111';
        ctx.arc(-5 * scale, 15 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Nose gear
        ctx.beginPath();
        ctx.moveTo(25 * scale, 3 * scale);
        ctx.lineTo(25 * scale, 15 * scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(25 * scale, 15 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    // Propeller Blur
    if (s.engineOn) {
        const propSpeed = s.throttle * 50;
        const blurWidth = 2 + s.throttle * 5;
        ctx.fillStyle = `rgba(50, 50, 50, 0.2)`;
        ctx.beginPath();
        ctx.ellipse(38 * scale, 0, blurWidth, 25 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Blade line
        ctx.save();
        ctx.translate(38 * scale, 0);
        ctx.rotate(Date.now() / (1000/propSpeed));
        ctx.fillStyle = '#333';
        ctx.fillRect(-2, -25 * scale, 4, 50 * scale);
        ctx.restore();
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
    ctx.restore(); // End World Camera

    // HUD / Overlay text in Canvas
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "JetBrains Mono"';
    ctx.fillText(`ALT: ${(s.position.y * 3.28).toFixed(0)} ft`, 10, 20);
    ctx.fillText(`SPD: ${(Math.sqrt(s.velocity.x**2 + s.velocity.y**2) * 1.94).toFixed(0)} kts`, 10, 35);
    
    // Engine Hint
    if (!s.engineOn && !s.crashed) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 20px "Inter"';
        ctx.fillText("PRESS 'E' TO START ENGINE", width / 2, height / 2 - 50);
        ctx.textAlign = 'left';
    }

    if (s.stallWarning) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 32px "Inter"';
        ctx.fillText("STALL WARNING", width / 2, height / 2);
        ctx.textAlign = 'left';
    }
    if (s.crashed) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 48px "Inter"';
        ctx.fillText("CRASHED", width / 2, height / 2);
        if (!s.gear && s.landed) {
            ctx.font = '24px "Inter"';
            ctx.fillText("Forgot Landing Gear!", width / 2, height / 2 + 35);
        }
        ctx.textAlign = 'left';
    }

  }, [mission]);

  // Main Loop
  useEffect(() => {
    let lastTime = performance.now();
    const loop = (time: number) => {
        const dt = Math.min((time - lastTime) / 1000, 0.1); 
        lastTime = time;
        updatePhysics(dt);
        updateParticles(dt);
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