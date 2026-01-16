
import { FlightState, SimulationParams, UnlockableItem } from "./types";

export const WORLD_SCALE = 10; // Pixels per meter approximation for rendering
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const DEFAULT_PARAMS: SimulationParams = {
  gravity: 9.81,
  airDensity: 1.225, // kg/m^3
  liftCoefficient: 0.1, // Simplified linear approximation base
  dragCoefficient: 0.04, // Increased base drag to make Aero upgrades felt more
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

// --- UPGRADE CONFIGURATION ---

export const ENGINE_UPGRADES = [
  { level: 0, cost: 0, power: 5500, name: "Stock Engine (Rusty)" }, // Starts worse than default
  { level: 1, cost: 50, power: 7000, name: "Rebuilt Engine" },
  { level: 2, cost: 150, power: 8500, name: "Sport Tuned" },
  { level: 3, cost: 400, power: 10500, name: "Turbocharged" },
  { level: 4, cost: 1000, power: 13000, name: "Race Modified" },
];

export const AERO_UPGRADES = [
  { level: 0, cost: 0, dragMod: 1.2, turbulenceMod: 1.2, name: "Dented Fuselage" }, // High drag
  { level: 1, cost: 40, dragMod: 1.0, turbulenceMod: 1.0, name: "Patch Repairs" },
  { level: 2, cost: 120, dragMod: 0.85, turbulenceMod: 0.8, name: "Polished Skin" },
  { level: 3, cost: 350, dragMod: 0.7, turbulenceMod: 0.5, name: "Streamlined Kit" },
  { level: 4, cost: 900, dragMod: 0.5, turbulenceMod: 0.2, name: "Carbon Fiber Body" },
];

export const FUEL_UPGRADES = [
  { level: 0, cost: 0, capacity: 100, name: "Standard Tank" },
  { level: 1, cost: 80, capacity: 150, name: "Auxiliary Tank" },
  { level: 2, cost: 250, capacity: 220, name: "Long Range Cells" },
  { level: 3, cost: 600, capacity: 350, name: "Global Hopper" },
];

export const GEAR_UPGRADES = [
  { level: 0, cost: 0, brakeMod: 0.8, tolerance: 6, name: "Standard Gear" },
  { level: 1, cost: 100, brakeMod: 1.2, tolerance: 8, name: "Disc Brakes" },
  { level: 2, cost: 300, brakeMod: 1.6, tolerance: 10, name: "Oleo Struts" },
  { level: 3, cost: 800, brakeMod: 2.2, tolerance: 14, name: "Bush Tires" },
];

export const WEIGHT_UPGRADES = [
  { level: 0, cost: 0, mass: 1300, name: "Heavy Steel" },
  { level: 1, cost: 150, mass: 1200, name: "Aluminum Panels" },
  { level: 2, cost: 400, mass: 1100, name: "Stripped Interior" },
  { level: 3, cost: 850, mass: 1000, name: "Composite Parts" },
  { level: 4, cost: 1500, mass: 900, name: "Titanium Frame" },
];

export const HYDRAULICS_UPGRADES = [
  { level: 0, cost: 0, effectiveness: 0.8, name: "Manual Cable" },
  { level: 1, cost: 200, effectiveness: 1.0, name: "Refurbished Lines" },
  { level: 2, cost: 500, effectiveness: 1.2, name: "Hydraulic Assist" },
  { level: 3, cost: 1200, effectiveness: 1.5, name: "Fly-By-Wire" },
];

export const LIVERIES: UnlockableItem[] = [
  { id: 'default', name: 'Classic Red', type: 'livery', cost: 0, value: '#dc2626' },
  { id: 'ocean', name: 'Ocean Blue', type: 'livery', cost: 100, value: '#0284c7' },
  { id: 'forest', name: 'Ranger Green', type: 'livery', cost: 100, value: '#15803d' },
  { id: 'stealth', name: 'Stealth Black', type: 'livery', cost: 400, value: '#171717' },
  { id: 'gold', name: 'Midas Gold', type: 'livery', cost: 2000, value: '#fbbf24' },
];

export const SMOKE_COLORS: UnlockableItem[] = [
  { id: 'default', name: 'Exhaust Grey', type: 'smoke', cost: 0, value: 'rgba(200, 200, 200, 0.4)' },
  { id: 'white', name: 'Airshow White', type: 'smoke', cost: 50, value: 'rgba(255, 255, 255, 0.6)' },
  { id: 'red', name: 'Flare Red', type: 'smoke', cost: 150, value: 'rgba(239, 68, 68, 0.6)' },
  { id: 'blue', name: 'Neon Blue', type: 'smoke', cost: 150, value: 'rgba(56, 189, 248, 0.6)' },
  { id: 'purple', name: 'Magic Purple', type: 'smoke', cost: 300, value: 'rgba(168, 85, 247, 0.6)' },
];
