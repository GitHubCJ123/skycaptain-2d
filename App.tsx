
import React, { useState, useEffect, useRef } from 'react';
import { SimCanvas } from './components/SimCanvas';
import { Instruments } from './components/Instruments';
import { Controls } from './components/Controls';
import { MissionControl } from './components/MissionControl';
import { Minimap } from './components/Minimap';
import { Hangar } from './components/Hangar';
import { FlightState, GameStatus, Mission, UserProfile } from './types';
import { INITIAL_STATE, FUEL_UPGRADES } from './constants';
import { loadProfile, saveProfile } from './utils/storage';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [mission, setMission] = useState<Mission | null>(null);
  const [flightState, setFlightState] = useState<FlightState>(INITIAL_STATE);
  
  // Persistence State
  const [userProfile, setUserProfile] = useState<UserProfile>(loadProfile());

  // React State for Controls (passed into Sim via props for sync)
  const [throttle, setThrottle] = useState(0);
  const [flaps, setFlaps] = useState(0);
  const [gear, setGear] = useState(true);
  const [brakes, setBrakes] = useState(true);
  const [engineOn, setEngineOn] = useState(false);

  // Smart Tips State
  const [currentTip, setCurrentTip] = useState<string>("");
  const flightStateRef = useRef(flightState); // Ref to access latest state in interval
  
  // Cheat code state
  const cheatBufferRef = useRef<string>("");

  // Resolve Max Fuel for UI
  const maxFuel = FUEL_UPGRADES[userProfile.upgrades.fuelLevel || 0].capacity;

  // Profile saver
  useEffect(() => {
    saveProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    flightStateRef.current = flightState;
  }, [flightState]);

  // Coin Income Logic
  useEffect(() => {
    if (status !== GameStatus.FLYING) return;
    
    // Earn 1 coin every 2 seconds of being airborne
    const incomeInterval = setInterval(() => {
        const s = flightStateRef.current;
        const altitude = s.position.y;
        
        // If airborne and moving, get salary
        if (altitude > 10 && !s.crashed && s.engineOn) {
            setUserProfile(prev => ({
                ...prev,
                coins: prev.coins + 1
            }));
        }
    }, 2000);

    return () => clearInterval(incomeInterval);
  }, [status]);

  useEffect(() => {
    if (status !== GameStatus.FLYING) return;

    const tips = [
        "Retracting flaps [V] reduces drag and helps you fly faster.",
        "Smooth controls are key. Don't jerk the yoke.",
        "If you lose speed, nose down to regain airflow.",
        "Landing gear adds significant drag. Retract it after takeoff.",
        "Use flaps [F] to land at slower speeds.",
        "Always check your vertical speed (VSI) when landing.",
    ];

    const interval = setInterval(() => {
        const s = flightStateRef.current;
        const altitude = s.position.y * 3.28; // Feet
        const speed = Math.sqrt(s.velocity.x**2 + s.velocity.y**2) * 1.94; // Knots
        const isDescending = s.velocity.y < -1;

        // Contextual Logic
        if (s.stallWarning) {
            setCurrentTip("⚠️ STALL WARNING: Nose down [↓] immediately!");
        } else if (altitude > 300 && s.gear) {
            setCurrentTip("💡 TIP: Retract landing gear [G] to fly faster.");
        } else if (altitude < 200 && isDescending && !s.gear) {
            setCurrentTip("⚠️ CRITICAL: Lower landing gear [G] for landing!");
        } else if (speed > 120 && s.flaps > 0) {
             setCurrentTip("💡 TIP: Retract flaps [V] at high speeds to prevent damage.");
        } else if (s.fuel < 15) {
             setCurrentTip("⚠️ LOW FUEL: Return to base immediately.");
        } else {
            // Random general tip
            setCurrentTip("ℹ️ " + tips[Math.floor(Math.random() * tips.length)]);
        }
    }, 6000); // Change tip every 6 seconds

    return () => clearInterval(interval);
  }, [status]);

  const handleStartMission = (newMission: Mission) => {
    // We create a new object reference to ensure the simulator resets even if it's the same mission
    setMission({ ...newMission }); 
    setStatus(GameStatus.FLYING);
    // Reset controls based on start condition
    setThrottle(newMission.startingConditions.airborne ? 0.7 : 0);
    setEngineOn(newMission.startingConditions.airborne);
    setGear(!newMission.startingConditions.airborne);
    setBrakes(!newMission.startingConditions.airborne);
    setCurrentTip("Ready for takeoff. Good luck, Captain.");
  };

  const handleRestart = () => {
      if (mission) {
          handleStartMission(mission);
      }
  };

  // Cheat code listener (only on menu screens)
  useEffect(() => {
    if (status === GameStatus.FLYING) return;
    
    const handleCheatKey = (e: KeyboardEvent) => {
      // Only listen for alphanumeric keys
      if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) {
        cheatBufferRef.current += e.key.toLowerCase();
        // Keep buffer to last 20 chars
        if (cheatBufferRef.current.length > 20) {
          cheatBufferRef.current = cheatBufferRef.current.slice(-20);
        }
        // Check for cheat codes
        if (cheatBufferRef.current.includes('jacobisthebest67')) {
          setUserProfile(prev => ({
            ...prev,
            coins: Infinity
          }));
          cheatBufferRef.current = '';
        }
        if (cheatBufferRef.current.includes('jacobisnotthebest67')) {
          setUserProfile(prev => ({
            ...prev,
            coins: 0
          }));
          cheatBufferRef.current = '';
        }
      }
    };
    
    window.addEventListener('keydown', handleCheatKey);
    return () => window.removeEventListener('keydown', handleCheatKey);
  }, [status]);

  // Global key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (status !== GameStatus.FLYING) return;
        
        // Prevent default scrolling for game keys
        if (['ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }

        switch(e.key.toLowerCase()) {
            case 'e': setEngineOn(prev => !prev); break;
            case 'g': setGear(prev => !prev); break;
            case 'b': setBrakes(prev => !prev); break;
            case 'f': setFlaps(prev => Math.min(prev + 0.25, 1)); break;
            case 'v': setFlaps(prev => Math.max(prev - 0.25, 0)); break;
            case 'w': setThrottle(prev => Math.min(prev + 0.05, 1)); break;
            case 's': setThrottle(prev => Math.max(prev - 0.05, 0)); break;
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden">
      {/* Background Simulation Layer */}
      <SimCanvas 
        mission={mission} 
        onUpdateState={setFlightState} 
        externalControls={{ throttle, flaps, gear, brakes, engineOn }}
        userProfile={userProfile}
      />

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none">
         {/* Beta Badge */}
         <div className="absolute top-6 left-6 z-50 opacity-80 hover:opacity-100 transition-opacity pointer-events-auto">
            <div className="flex flex-col items-start select-none">
                <h1 className="text-2xl font-black text-white italic tracking-tighter drop-shadow-md">
                    SkyCaptain <span className="text-sky-400">2D</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-amber-400">
                        BETA
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                        WORK IN PROGRESS
                    </span>
                </div>
            </div>
         </div>

         {/* Flight Coins Indicator (Only when flying) */}
         {status === GameStatus.FLYING && (
             <div className="absolute top-6 left-48 z-50 opacity-90">
                 <div className="bg-black/40 backdrop-blur px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_5px_#fbbf24]"></div>
                     <span className="text-amber-400 font-mono font-bold text-xs">{userProfile.coins}</span>
                 </div>
             </div>
         )}

         {/* Top Info Bar */}
         {mission && status === GameStatus.FLYING && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-6 py-2 rounded-full border border-white/10 text-center">
                <h2 className="text-white font-bold text-sm">{mission.title}</h2>
                <div className="flex gap-4 text-xs text-slate-300 mt-1">
                    <span>WIND: {mission.weather.windSpeed}kts</span>
                    <span>VIS: {(mission.weather.visibility * 100).toFixed(0)}%</span>
                </div>
             </div>
         )}

         {/* Smart Tip Box */}
         {status === GameStatus.FLYING && !flightState.crashed && (
             <div className="absolute top-20 right-8 max-w-xs bg-slate-800/80 backdrop-blur border-l-4 border-sky-500 p-3 rounded shadow-lg transition-opacity duration-500">
                 <p className="text-sky-100 text-xs font-semibold font-mono animate-pulse">FLIGHT ASSIST</p>
                 <p className="text-white text-sm font-medium mt-1 leading-tight">{currentTip}</p>
             </div>
         )}
         
         {/* Bottom Control Deck */}
         {status === GameStatus.FLYING && (
             <div className="absolute bottom-0 left-0 w-full flex items-end justify-between pointer-events-auto">
                {/* Instruments Dashboard (Centered mostly) */}
                <div className="flex-1 flex justify-center pb-0">
                    <Instruments state={flightState} maxFuel={maxFuel} />
                </div>

                {/* Right Side Controls & Map */}
                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2">
                    <Minimap position={flightState.position} rotation={flightState.rotation} />
                    
                    <div className="flex gap-2 mt-2">
                        <button 
                            onClick={() => setStatus(GameStatus.MENU)}
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded font-bold text-[10px] shadow-lg shadow-red-900/50"
                        >
                            ABORT
                        </button>
                        <Controls 
                            throttle={throttle}
                            flaps={flaps}
                            gear={gear}
                            brakes={brakes}
                            engineOn={engineOn}
                            setThrottle={setThrottle}
                            setFlaps={setFlaps}
                            toggleGear={() => setGear(!gear)}
                            toggleBrakes={() => setBrakes(!brakes)}
                            toggleEngine={() => setEngineOn(!engineOn)}
                        />
                    </div>
                </div>
             </div>
         )}
      </div>

      {/* CRASHED OVERLAY */}
      {status === GameStatus.FLYING && flightState.crashed && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
              <div className="bg-red-900/90 border-2 border-red-500 p-8 rounded-2xl text-center shadow-[0_0_50px_rgba(239,68,68,0.5)]">
                  <h2 className="text-5xl font-black text-white italic tracking-tighter mb-2">CRASHED</h2>
                  <p className="text-red-200 mb-6">Structural Integrity Failure</p>
                  
                  <div className="flex gap-4 justify-center">
                      <button 
                          onClick={handleRestart}
                          className="px-6 py-3 bg-white text-red-900 font-bold rounded hover:bg-gray-200 transition-colors"
                      >
                          PLAY AGAIN
                      </button>
                      <button 
                          onClick={() => setStatus(GameStatus.MENU)}
                          className="px-6 py-3 bg-red-950 border border-red-700 text-red-300 font-bold rounded hover:bg-red-900 transition-colors"
                      >
                          MAIN MENU
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Menus */}
      {status === GameStatus.MENU && (
        <MissionControl 
            onStartMission={handleStartMission} 
            onOpenHangar={() => setStatus(GameStatus.HANGAR)}
            userProfile={userProfile}
        />
      )}

      {status === GameStatus.HANGAR && (
          <Hangar 
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            onClose={() => setStatus(GameStatus.MENU)}
          />
      )}
    </div>
  );
};

export default App;
