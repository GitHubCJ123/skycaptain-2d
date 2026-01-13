import { FlightState, SimulationParams, Vector2 } from "./types";

export const WORLD_SCALE = 10; // Pixels per meter approximation for rendering
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const DEFAULT_PARAMS: SimulationParams = {
  gravity: 9.81,
  airDensity: 1.225, // kg/m^3
  liftCoefficient: 0.1, // Simplified linear approximation base
  dragCoefficient: 0.03, // Base drag
  thrustPower: 8000, // Newtons
  mass: 1200, // kg (Cessna 172-ish)
  wingArea: 16.2, // m^2
};

export const INITIAL_STATE: FlightState = {
  position: { x: 0, y: 0 }, // Will be set by mission
  velocity: { x: 0, y: 0 },
  rotation: 0,
  throttle: 0,
  flaps: 0,
  gear: true,
  brakes: true,
  fuel: 100,
  engineOn: false,
  crashed: false,
  landed: false,
  stallWarning: false,
};

export const GROUND_Y = 100; // Meters above bottom of "world" (rendering logic handles this)
export const RUNWAY_LENGTH = 2000; // Meters
export const RUNWAY_START_X = -500; // Meters
