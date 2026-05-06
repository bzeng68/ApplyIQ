import fs from "fs";
import path from "path";

export interface OfferData {
  id: number;
  url: string;
  company: string;
  role: string;
  score: number | null;
  report_num: string;
  report_file: string;
  archetype: string;
  legitimacy: string;
  remote: string;
  scanned_at: string;
  evaluated_at: string;
  scanned_relative: string;
  evaluated_relative: string;
  done: boolean;
}

export function loadOffersData(projectRoot: string): OfferData[] {
  const dashboardDataPath = path.join(projectRoot, "data", "dashboard-offers.json");
  if (fs.existsSync(dashboardDataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dashboardDataPath, "utf8"));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function loadDoneState(projectRoot: string): number[] {
  const uiStatePath = path.join(projectRoot, "data", "ui-state.json");
  if (fs.existsSync(uiStatePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(uiStatePath, "utf8"));
      return data.done || [];
    } catch {
      return [];
    }
  }
  return [];
}

export function saveDoneState(projectRoot: string, done: number[]): void {
  const dataDir = path.join(projectRoot, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "ui-state.json"),
    JSON.stringify({ done }, null, 2)
  );
}
