import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectRoot = path.join(process.cwd(), "..");
    const jdPath = path.join(projectRoot, "data", "jds", `${params.id}.txt`);

    if (!fs.existsSync(jdPath)) {
      return new NextResponse("", { status: 404 });
    }

    const content = fs.readFileSync(jdPath, "utf8");
    return new NextResponse(content, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Error loading JD:", error);
    return NextResponse.json("", { status: 500 });
  }
}
