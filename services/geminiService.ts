// Gemini integration has been removed in favor of manual flight control.
import { Mission } from "../types";

export const generateMission = async (prompt: string): Promise<Mission> => {
  throw new Error("Gemini service is disabled.");
};
