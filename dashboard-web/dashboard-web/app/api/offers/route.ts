import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const projectRoot = path.join(process.cwd(), "..");
    const dashboardDataPath = path.join(projectRoot, "data", "dashboard-offers.json");

    if (fs.existsSync(dashboardDataPath)) {
      const data = JSON.parse(fs.readFileSync(dashboardDataPath, "utf8"));
      return NextResponse.json(data);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("Error loading offers:", error);
    return NextResponse.json([], { status: 500 });
  }
}
