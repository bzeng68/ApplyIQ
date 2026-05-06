import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const projectRoot = path.join(process.cwd(), "..");
    const aggregatePath = path.join(projectRoot, "reports", "token-aggregate.json");

    if (fs.existsSync(aggregatePath)) {
      const data = JSON.parse(fs.readFileSync(aggregatePath, "utf8"));
      return NextResponse.json(data);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("Error loading token data:", error);
    return NextResponse.json([], { status: 500 });
  }
}
