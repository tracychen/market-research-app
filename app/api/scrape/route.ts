import { NextRequest, NextResponse } from "next/server";
import { runScraper } from "@/lib/scraper";

export async function POST(req: NextRequest) {
  try {
    const { states, minPopulation, googleMapsApiKey } = await req.json();

    if (!states || !Array.isArray(states) || states.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one valid state" },
        { status: 400 }
      );
    }

    if (!googleMapsApiKey) {
      return NextResponse.json(
        { error: "Google Maps API key is required" },
        { status: 400 }
      );
    }

    try {
      // Run the scraper with the provided parameters
      const generatedFiles = await runScraper(
        states,
        minPopulation || 50000,
        googleMapsApiKey
      );

      return NextResponse.json({
        message: "Scraping completed successfully",
        files: generatedFiles,
      });
    } catch (scraperError) {
      console.error("Scraper error:", scraperError);
      const errorMessage =
        scraperError instanceof Error ? scraperError.message : "Unknown error";
      return NextResponse.json(
        { error: `Error running scraper: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in API route:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to run scraper: " + errorMessage },
      { status: 500 }
    );
  }
}
