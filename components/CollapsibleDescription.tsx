import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const CollapsibleDescription = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
      <button
        onClick={toggleOpen}
        className="w-full px-6 py-4 text-left flex items-center justify-between font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <span className="text-lg">What does this tool do?</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="space-y-4">
            <p>
              This tool scrapes demographic and economic data from city-data.com
              and the Bureau of Labor Statistics (BLS) to generate comprehensive
              market research reports for U.S. cities and states.
            </p>

            <h3 className="text-lg font-medium">What This Tool Does:</h3>

            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">
                  Demographic Data Collection:
                </span>{" "}
                Extracts population, income, housing values, crime rates, and
                other key metrics from city-data.com for cities that meet your
                minimum population criteria.
              </li>
              <li>
                <span className="font-medium">Employment Analysis:</span>{" "}
                Retrieves employment data from the Bureau of Labor Statistics to
                calculate job growth rates for metropolitan areas.
              </li>
              <li>
                <span className="font-medium">Geocoding:</span> Uses Google Maps
                API to locate cities and identify the nearest metropolitan
                statistical areas for job data correlation.
              </li>
              <li>
                <span className="font-medium">Comprehensive Reporting:</span>{" "}
                Generates Excel reports with all collected data, ready for
                analysis or presentation.
              </li>
            </ul>

            <h3 className="text-lg font-medium">How To Use:</h3>

            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Enter your Google Maps API key (required for geocoding cities)
              </li>
              <li>
                Set the minimum population threshold for cities to include
              </li>
              <li>Select one or more states to analyze</li>
              <li>
                Click &quot;Generate Market Research&quot; and wait for
                processing
              </li>
              <li>Download the resulting Excel or JSON files</li>
            </ol>

            <h3 className="text-lg font-medium">Data Sources:</h3>

            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">city-data.com:</span> Population,
                income, housing, poverty, ethnicity, crime, and unemployment
                data
              </li>
              <li>
                <span className="font-medium">Bureau of Labor Statistics:</span>{" "}
                Employment data for metropolitan areas, including year-over-year
                job growth
              </li>
              <li>
                <span className="font-medium">Google Maps API:</span> Geocoding
                data for cities and metropolitan areas
              </li>
            </ul>

            <div className="bg-blue-50 p-4 rounded mt-4">
              <h3 className="text-lg font-medium text-blue-800">
                Example Use Cases:
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-blue-800">
                <li>Real estate investment analysis for multiple markets</li>
                <li>Business expansion planning and market comparison</li>
                <li>Economic development research for municipal governments</li>
                <li>Demographic analysis for marketing campaigns</li>
                <li>Academic research on economic and population trends</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              <strong>Note:</strong> This tool is designed for research purposes
              only. Please be respectful of the data sources by not making
              excessive requests in a short period.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleDescription;
