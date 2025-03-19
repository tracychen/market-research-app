import { NextRequest, NextResponse } from "next/server";
import { getFileByName } from "@/lib/scraper";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename) {
    return NextResponse.json(
      { error: "Filename is required" },
      { status: 400 }
    );
  }

  try {
    const file = await getFileByName(filename);

    // Create response with appropriate headers
    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename=${file.filename}`,
      },
    });
  } catch (error) {
    console.error(`Error downloading file ${filename}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to download file: " + errorMessage },
      { status: 500 }
    );
  }
}
