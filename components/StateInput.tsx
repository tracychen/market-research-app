"use client";

import { getAllStates } from "@/lib/states";
import { useState } from "react";

export default function StateInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (
    selectedStates: string[],
    minPopulation: number,
    apiKey: string
  ) => void;
  isLoading: boolean;
}) {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [minPopulation, setMinPopulation] = useState(50000);
  const [apiKey, setApiKey] = useState("");

  const states = getAllStates();

  const handleStateChange = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  const handleSelectAll = () => {
    setSelectedStates(states);
  };

  const handleClearAll = () => {
    setSelectedStates([]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedStates.length > 0 && apiKey) {
      onSubmit(selectedStates, minPopulation, apiKey);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Select States to Analyze</h2>

      <div className="mb-4">
        <label
          htmlFor="apiKey"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Google Maps API Key (required for geocoding)
        </label>
        <input
          type="text"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={isLoading}
          placeholder="Enter your Google Maps API key"
        />
        <p className="mt-1 text-xs text-gray-500">
          The API key is used only for geocoding cities and finding nearest
          metro areas. It&apos;s not saved on the server.
        </p>
      </div>

      <div className="mb-4">
        <label
          htmlFor="minPopulation"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Minimum City Population
        </label>
        <input
          type="number"
          id="minPopulation"
          value={minPopulation}
          onChange={(e) => setMinPopulation(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={isLoading}
          min="1000"
          step="1000"
        />
      </div>

      <div className="mb-4 flex space-x-4">
        <button
          type="button"
          onClick={handleSelectAll}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          disabled={isLoading}
        >
          Select All
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          disabled={isLoading}
        >
          Clear All
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6 max-h-80 overflow-y-auto">
          {states.map((state) => (
            <div key={state} className="flex items-center">
              <input
                type="checkbox"
                id={`state-${state}`}
                checked={selectedStates.includes(state)}
                onChange={() => handleStateChange(state)}
                className="mr-2"
                disabled={isLoading}
              />
              <label htmlFor={`state-${state}`} className="text-sm">
                {state}
              </label>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            disabled={selectedStates.length === 0 || !apiKey || isLoading}
          >
            {isLoading ? "Generating..." : "Generate Market Research"}
          </button>

          <div className="mt-2 text-sm text-gray-600">
            {selectedStates.length} states selected
          </div>
        </div>
      </form>
    </div>
  );
}
