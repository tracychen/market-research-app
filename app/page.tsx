"use client";

import { useState } from "react";
import StateInput from "@/components/StateInput";
import FileList from "@/components/FileList";
import CollapsibleDescription from "@/components/CollapsibleDescription";

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleGenerateResearch = async (
    selectedStates: string[],
    minPopulation: number,
    apiKey: string
  ) => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          states: selectedStates,
          minPopulation: minPopulation,
          googleMapsApiKey: apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate market research"
        );
      }

      const result = await response.json();
      setGenerationResult(result);

      // Trigger file list refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error generating market research:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Market Research Data Tool
          </h1>
          <p className="mt-2 text-gray-600">
            Fetch and analyze demographic and economic data for U.S. cities
          </p>
        </header>

        {/* Add the collapsible description under the header */}
        <CollapsibleDescription />

        <div className="space-y-8">
          <StateInput
            onSubmit={handleGenerateResearch}
            isLoading={isGenerating}
          />

          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
              role="alert"
            >
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {generationResult && !error && (
            <div
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded"
              role="alert"
            >
              <strong className="font-bold">Success! </strong>
              <span className="block sm:inline">
                Generated {generationResult.files.length} files
              </span>
            </div>
          )}

          <FileList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </main>
  );
}
