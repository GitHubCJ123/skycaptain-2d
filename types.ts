
export interface Vector2 {
  x: number;
  y: number;
}

export interface FlightState {
  position: Vector2;
  velocity: Vector2;
  rotation: number; // radians
  throttle: number; // 0 to 1
  flaps: number; // 0 to 1
  gear: boolean;
  brakes: boolean;
  fuel: number;
  engineOn: boolean;
  crashed: boolean;
  landed: boolean;
  stallWarning: boolean;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  timeOfDay: 'day' | 'night';
  obstaclesEnabled: boolean;
  weather: {
    windSpeed: number; // knots
    windDirection: number; // degrees
    turbulence: number; // 0-1
    visibility: number; // 0-1 (opacity of fog)
    precipitation: 'none' | 'rain' | 'storm';
  };
  startingConditions: {
    altitude: number;
    speed: number;
    airborne: boolean;
  };
}

export interface SimulationParams {
  gravity: number;
  airDensity: number;
  liftCoefficient: number;
  dragCoefficient: number;
  thrustPower: number;
  mass: number;
  wingArea: number;
}

export enum GameStatus {
  MENU,
  HANGAR,
  BRIEFING,
  FLYING,
  CRASHED,
  SUCCESS,
}

export interface UserProfile {
  coins: number;
  invertPitch?: boolean;
  upgrades: {
    engineLevel: number; // Currently equipped
    aeroLevel: number;
    fuelLevel: number;
    gearLevel: number;
    weightLevel: number;
    hydraulicsLevel: number;
    
    // Max unlocked levels
    unlockedEngine: number;
    unlockedAero: number;
    unlockedFuel: number;
    unlockedGear: number;
    unlockedWeight: number;
    unlockedHydraulics: number;

    liveryId: string;
    smokeId: string;
  };
}

export interface UnlockableItem {
  id: string;
  name: string;
  type: 'livery' | 'smoke';
  cost: number;
  value: string; // Hex code or rgba
}
