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
  weather: {
    windSpeed: number; // knots
    windDirection: number; // degrees (0 is blowing from right to left in 2D usually, but we'll standardise)
    turbulence: number; // 0-1
    visibility: number; // 0-1 (opacity of fog)
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
  BRIEFING,
  FLYING,
  CRASHED,
  SUCCESS,
}
