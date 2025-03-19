import { NextResponse } from "next/server";
import { listGeneratedFiles } from "@/lib/scraper";

export async function GET() {
  try {
    const files = await listGeneratedFiles();

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error listing files:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to list files: " + errorMessage },
      { status: 500 }
    );
  }
}
