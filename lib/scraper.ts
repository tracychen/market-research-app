import axios from "axios";
import * as cheerio from "cheerio";
import ExcelJS from "exceljs";
import { getDistance } from "geolib";
import clientPromise from "./mongodb";
import { stateCodeMap, stateInitials } from "./states";
import areaData from "../data/areaData.json";
import cityData from "../data/cityData.json";
import { getCityLatLng } from "./geocoder";

// MongoDB collection names
const DB_NAME = "market-research";
const FILES_COLLECTION = "files";

// Function to scrape demographic data from city-data.com
export async function scrapeCityData(
  url: string,
  fields: Record<string, ($: cheerio.Root) => string | number | null>
) {
  try {
    const response = await axios.get(url);
    if (response.status !== 200) {
      console.log(`Failed to retrieve data from ${url}: ${response.status}`);
      return null;
    }

    const $ = cheerio.load(response.data);
    const data: Record<string, string | number | null> = {};

    for (const [fieldName, fieldSelector] of Object.entries(fields)) {
      const value = fieldSelector($);
      data[fieldName] = value;
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error scraping ${url}:`, error.message);
    } else {
      console.error(`Error scraping ${url}:`, error);
    }
    return null;
  }
}

// Function to scrape job data from the BLS website
export async function scrapeBLSData(url: string) {
  try {
    const response = await axios.get(url);
    if (response.status !== 200) {
      console.log(`Failed to retrieve data from ${url}: ${response.status}`);
      return null;
    }

    const $ = cheerio.load(response.data);

    // Find the data table
    const table = $("#table0");
    if (!table.length) {
      console.log(`Could not find table with id 'table0' in ${url}`);
      return null;
    }

    // Get all rows from the table body
    const rows = table.find("tbody tr");
    if (!rows.length) {
      console.log(`No rows found in the table at ${url}`);
      return null;
    }

    // Get data for each year
    const yearData: {
      year: number;
      months: { index: number; value: number }[];
    }[] = [];

    rows.each((index, row) => {
      const yearCell = $(row).find("td").first();
      const year = parseInt(yearCell.text().trim());

      if (isNaN(year)) return; // Skip if not a valid year

      // Get all month cells for this year
      const monthCells = $(row).find("td").not(":first-child");
      const months: { index: number; value: number }[] = [];

      monthCells.each((i, cell) => {
        const value = $(cell).text().trim();
        // Only add non-empty cells and remove any characters like (P) for preliminary
        if (value && value !== "&nbsp;") {
          const cleanValue = value
            .replace(/\(P\)|\(p\)/g, "")
            .replace(/,/g, "")
            .trim();
          if (!isNaN(parseFloat(cleanValue))) {
            months.push({
              index: i,
              value: parseFloat(cleanValue),
            });
          }
        }
      });

      if (months.length > 0) {
        yearData.push({
          year,
          months,
        });
      }
    });

    // Sort years in descending order (most recent first)
    yearData.sort((a, b) => b.year - a.year);

    // We need at least two years of data
    if (yearData.length < 2) {
      console.log(`Not enough years found in the table at ${url}`);
      return null;
    }

    // Get the most recent year
    const currentYear = yearData[0];
    // Get the previous year
    const previousYear = yearData[1];

    // Get the most recent month from the current year
    if (currentYear.months.length === 0) {
      console.log(`No month data found for year ${currentYear.year}`);
      return null;
    }

    // Sort months by index (most recent first)
    currentYear.months.sort((a, b) => b.index - a.index);
    const mostRecentMonth = currentYear.months[0];

    // Find the same month in the previous year
    let previousYearValue: number | null = null;

    // Try to find the exact same month in the previous year
    const sameMonthInPreviousYear = previousYear.months.find(
      (m) => m.index === mostRecentMonth.index
    );

    if (sameMonthInPreviousYear) {
      previousYearValue = sameMonthInPreviousYear.value;
    } else {
      // If we can't find the same month, get the closest month
      previousYear.months.sort(
        (a, b) =>
          Math.abs(a.index - mostRecentMonth.index) -
          Math.abs(b.index - mostRecentMonth.index)
      );

      if (previousYear.months.length > 0) {
        previousYearValue = previousYear.months[0].value;
      }
    }

    if (previousYearValue === null) {
      console.log(
        `Could not find comparable month data for previous year ${previousYear.year}`
      );
      return null;
    }

    return {
      mostRecentValue: mostRecentMonth.value,
      previousYearValue: previousYearValue,
      currentYear: currentYear.year,
      previousYear: previousYear.year,
      // Add month info for context
      currentMonth: mostRecentMonth.index + 1, // +1 for human-readable month number
      previousMonth: sameMonthInPreviousYear
        ? sameMonthInPreviousYear.index + 1
        : null,
    };
  } catch (error) {
    console.error(`Error scraping BLS data from ${url}:`, error);
    return null;
  }
}

// Function to construct the BLS URL from series components https://www.bls.gov/help/hlpforma.htm#SM
export function constructBLSUrl(state: string, areaCode: string) {
  const seriesId = `SMU${stateCodeMap[state]}${areaCode}0000000001`;
  return `https://data.bls.gov/timeseries/${seriesId}`;
}

// Function to load area data from ../data/areaData.json
async function loadAreaData() {
  const formattedAreaData: Record<
    string,
    { area_code: string; coordinates: number[] }
  > = {};

  Object.entries(areaData).forEach(([areaName, area]) => {
    formattedAreaData[areaName] = {
      area_code: area.area_code,
      coordinates: area.coordinates,
    };
  });

  return formattedAreaData;
}

// Function to load city data from ../data/cityData.json
async function loadCityData() {
  const formattedCityData: Record<string, { coordinates: number[] }> = {};

  Object.entries(cityData).forEach(([cityName, city]) => {
    formattedCityData[cityName] = {
      coordinates: city.coordinates,
    };
  });

  return formattedCityData;
}

// Function to find the closest metro area
export async function findClosestMetroArea(
  targetCityName: string,
  cityDataCache: Record<string, { coordinates: number[] }>,
  areaDataCache: Record<string, { area_code: string; coordinates: number[] }>,
  apiKey: string
) {
  try {
    // Get target city coordinates
    let targetCoords;
    // TODO cache coords of cities in db
    if (
      cityDataCache[targetCityName] &&
      cityDataCache[targetCityName].coordinates
    ) {
      targetCoords = cityDataCache[targetCityName].coordinates;
    } else {
      const geoResults = await getCityLatLng(targetCityName, apiKey);
      if (geoResults) {
        targetCoords = geoResults;

        // Cache the coordinates
        cityDataCache[targetCityName] = {
          coordinates: targetCoords,
        };
      }
    }

    if (!targetCoords) {
      return null;
    }

    let closestMetroArea = null;
    let minDistance = Infinity;

    // Find closest metro area
    for (const [areaName, areaData] of Object.entries(areaDataCache)) {
      if (areaData.coordinates) {
        const metroCoords = {
          latitude: areaData.coordinates[0],
          longitude: areaData.coordinates[1],
        };

        const distance = getDistance(
          {
            latitude: targetCoords[0],
            longitude: targetCoords[1],
          },
          metroCoords
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestMetroArea = areaName;
        }
      }
    }

    return closestMetroArea;
  } catch (error) {
    console.error(
      `Error finding closest metro area for ${targetCityName}:`,
      error
    );
    return null;
  }
}

// Function to calculate job growth
export function calculateJobGrowth(
  mostRecentValue: number,
  previousYearValue: number
) {
  if (!previousYearValue || previousYearValue === 0) return null;
  return (mostRecentValue - previousYearValue) / previousYearValue;
}
// Function to scrape cities from a state page
export async function scrapeCities(
  url: string,
  state: string,
  minPopulation: number
) {
  try {
    const response = await axios.get(url);
    if (response.status !== 200) {
      console.log(`Failed to retrieve data from ${url}: ${response.status}`);
      return null;
    }

    const $ = cheerio.load(response.data);
    const cities: Record<string, number> = {};

    // Find the table with city data
    $(".tabBlue tbody tr").each((i, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 3) {
        const cityName = $(cells[1])
          .text()
          .replace(`, ${stateInitials[state]}`, "")
          .trim();
        const populationText = $(cells[2]).text().trim();

        try {
          const population = parseInt(populationText.replace(/,/g, ""), 10);
          if (population > minPopulation) {
            cities[cityName] = population;
          }
        } catch (e) {
          // Skip if population can't be parsed
          console.error(`Error parsing population for ${cityName}:`, e);
        }
      }
    });

    return cities;
  } catch (error) {
    console.error(`Error scraping cities from ${url}:`, error);
    return null;
  }
}

// Function to save a file to MongoDB
async function saveFileToDB(
  filename: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any,
  contentType: string,
  metadata: Record<string, string> = {}
) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const collection = db.collection(FILES_COLLECTION);

  let buffer;
  if (contentType === "application/json") {
    // For JSON, store as string
    buffer = JSON.stringify(content);
  } else {
    // For Excel, convert workbook to buffer
    buffer = await content.xlsx.writeBuffer();
  }

  // Convert buffer to base64 for storage
  const base64Content = Buffer.from(buffer).toString("base64");

  const fileDoc = {
    filename,
    contentType,
    content: base64Content,
    metadata,
    createdAt: new Date(),
    size: buffer.length || 0,
  };

  await collection.insertOne(fileDoc);

  return {
    name: filename,
    type: contentType.split("/").pop()?.toUpperCase(),
    size: buffer.length || 0,
    created: new Date(),
  };
}

// Main scraper function
export async function runScraper(
  statesToAnalyze: string[],
  minPopulation: number,
  apiKey: string
) {
  try {
    // Load area data and city data from MongoDB
    const areaData = await loadAreaData();
    const cityData = await loadCityData();

    // Define city-data.com fields to scrape
    const cityFields = {
      "Population in 2022": ($: cheerio.Root) => {
        const section = $("#city-population");
        if (section.length) {
          // Get the text content directly
          const text = section.text();
          if (text) {
            // Use regex to extract the population number
            const match = text.match(/Population in 2022:\s*([\d,]+)/);
            if (match && match[1]) {
              return match[1].trim();
            }
          }
        }
        return null;
      },

      "Population change since 2000 (%)": ($: cheerio.Root) => {
        const section = $("#city-population");
        if (section.length) {
          const html = section.html();
          if (html) {
            const match = html.match(
              /Population change since 2000:<\/b>(.*?)%/
            );
            if (match && match[1]) {
              return match[1].trim() + "%";
            }
          }
        }
        return null;
      },

      "Median household income in 2023": ($: cheerio.Root) => {
        const text = $("#median-income").contents().eq(1).text().trim(); // Target the text node after the first <b>
        const match = text.match(/\$\d{1,3}(?:,\d{3})*/);
        return match ? match[0] : null;
      },

      "Median household income in 2000": ($: cheerio.Root) => {
        const text = $("#median-income").contents().eq(3).text().trim(); // Target the text node after the first <b>
        return text ? text : null;
      },

      "Median condo value in 2023": ($: cheerio.Root) => {
        const text = $("#median-income").contents().eq(25).text().trim(); // Target the text node after the third <b>
        const match = text.match(/\$\d{1,3}(?:,\d{3})*/);
        return match ? match[0] : null;
      },

      "Median condo value in 2000": ($: cheerio.Root) => {
        const text = $("#median-income").contents().eq(27).text().trim(); // Target the text node after the third <b>
        return text ? text : null;
      },

      "Median contract rent": ($: cheerio.Root) => {
        const text = $("#median-rent").find("p").first().text();
        if (text) {
          const match = text.match(/Median gross rent in 2023:.*?(\$[\d,]+)/);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
        return null;
      },

      "Poverty percentage": ($: cheerio.Root) => {
        const section = $("#poverty-level");
        if (section.length) {
          const html = section.html();
          if (html) {
            const match = html.match(
              /Percentage of residents living in poverty in 2023.*?:<\/b>(.*?)%/
            );
            if (match && match[1]) {
              return match[1].trim() + "%";
            }
          }
        }
        return null;
      },

      "Largest ethnicity percentage": ($: cheerio.Root) => {
        const racesGraph = $("#races-graph");
        if (racesGraph.length) {
          const listItems = racesGraph.find("ul li ul li");
          if (listItems.length > 0) {
            const firstItem = listItems.first();
            const percentage = firstItem.find("span").last().text();
            return percentage.trim();
          }
        }
        return null;
      },

      "Largest ethnicity slice": ($: cheerio.Root) => {
        const racesGraph = $("#races-graph");
        if (racesGraph.length) {
          const listItems = racesGraph.find("ul li ul li");
          if (listItems.length > 0) {
            const firstItem = listItems.first();
            const ethnicity = firstItem.find("b").text();
            return ethnicity.trim();
          }
        }
        return null;
      },

      "Most recent crime index": ($: cheerio.Root) => {
        const crimeTab = $("#crimeTab");
        if (crimeTab.length) {
          const lastCell = crimeTab.find("tfoot tr td").last();
          if (lastCell.length) {
            return lastCell.text().trim();
          }
        }
        return null;
      },

      "Unemployment rate": ($: cheerio.Root) => {
        const unemploymentRate = $("#unemployment .hgraph table tr")
          .first() // First row (contains "Here: 4.4%")
          .find("td")
          .last() // Last <td> in the first row
          .text() // Get the text content
          .trim(); // Remove extra whitespace
        return unemploymentRate || null;
      },
    };

    // Track generated files
    const generatedFiles = [];

    // Process each state
    for (const state of statesToAnalyze) {
      const url = `https://www.city-data.com/city/${state.replace(
        / /g,
        "-"
      )}.html`;

      console.log(`Scraping cities for ${state} from ${url}`);
      const citiesData = await scrapeCities(url, state, minPopulation);

      if (!citiesData || Object.keys(citiesData).length === 0) {
        console.log(
          `No cities found for ${state} with population > ${minPopulation}`
        );
        continue;
      }

      console.log(
        `Found ${
          Object.keys(citiesData).length
        } cities for ${state} with population > ${minPopulation}`
      );

      // Save cities data to JSON file in MongoDB
      const timestamp = new Date()
        .toISOString() // Get the ISO string (e.g., "2025-03-19T12:34:56.789Z")
        .split(".")[0]; // Remove milliseconds and "Z"

      const citiesJsonFilename = `${state
        .replace(/ /g, "")
        .toLowerCase()}_cities_population_min_${minPopulation}_${timestamp}.json`;

      const jsonFile = await saveFileToDB(
        citiesJsonFilename,
        citiesData,
        "application/json",
        { state, type: "cities-population" }
      );

      generatedFiles.push(jsonFile);

      // Setup data structure for results
      const data: Record<string, (string | number | null)[]> = {
        City: [],
        "Closest Metro Area": [],
        "Job Growth (%)": [],
        "City Data URL": [],
        "BLS URL": [],
      };

      // Add fields for city data
      for (const field of Object.keys(cityFields)) {
        data[field] = [];
      }

      // Process each city
      const baseUrlCity = "https://www.city-data.com/city/";
      for (const city of Object.keys(citiesData)) {
        console.log(`Scraping ${city}, ${state}`);

        const urlCity = `${baseUrlCity}${city
          .replace(/ /g, "-")
          .replace(/'/g, "")}-${state.replace(/ /g, "-")}.html`;
        const cityDataResult = await scrapeCityData(urlCity, cityFields);

        if (cityDataResult) {
          data["City"].push(city);

          // Add city data
          for (const [field, value] of Object.entries(cityDataResult)) {
            console.log(`Adding ${field} to data with value ${value}`);
            data[field].push(value);
          }

          // Find closest metro area and get job data
          const cityState = `${city}, ${stateInitials[state]}`;
          const closestMetroArea = await findClosestMetroArea(
            cityState,
            cityData,
            areaData,
            apiKey
          );
          data["City Data URL"].push(urlCity);

          if (
            closestMetroArea &&
            areaData[closestMetroArea] &&
            areaData[closestMetroArea].area_code
          ) {
            const blsUrl = constructBLSUrl(
              state,
              areaData[closestMetroArea].area_code
            );
            const jobData = await scrapeBLSData(blsUrl);

            if (jobData) {
              const jobGrowth = calculateJobGrowth(
                jobData.mostRecentValue,
                jobData.previousYearValue
              );
              data["Job Growth (%)"].push(jobGrowth);
              data["Closest Metro Area"].push(closestMetroArea);
              console.log(
                `Adding job growth % to data with value ${jobGrowth}`
              );
            } else {
              data["Job Growth (%)"].push(null);
              data["Closest Metro Area"].push(closestMetroArea);
            }
            data["BLS URL"].push(blsUrl);
            console.log(
              `Adding closest metro area to data with value ${closestMetroArea}`
            );
          } else {
            data["Job Growth (%)"].push(null);
            data["Closest Metro Area"].push(null);
            data["BLS URL"].push(null);
          }
        }
      }

      // Save results to Excel file if we have data
      if (data["City"].length > 0) {
        console.log(`Scraping complete for ${state}`);
        const excelFilename = `market_research_${state
          .replace(/ /g, "")
          .toLowerCase()}_min_${minPopulation}_${timestamp}.xlsx`;

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(state);

        // Add headers
        const headers = Object.keys(data);
        worksheet.columns = headers.map((header) => ({
          header,
          key: header,
          width: 20,
        }));

        // Add rows
        for (let i = 0; i < data["City"].length; i++) {
          const row: Record<string, string | number | null> = {};
          headers.forEach((header) => {
            row[header] = data[header][i];
          });
          worksheet.addRow(row);
        }

        // Style the header row
        worksheet.getRow(1).font = { bold: true };

        // Save the workbook to MongoDB
        const excelFile = await saveFileToDB(
          excelFilename,
          workbook,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          { state, type: "excel-report" }
        );

        generatedFiles.push(excelFile);
      }
    }

    return generatedFiles;
  } catch (error) {
    console.error("Error running scraper:", error);
    throw error;
  }
}

// Function to get a list of generated files from MongoDB
export async function listGeneratedFiles() {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(FILES_COLLECTION);

    // Get file list without the content field
    const files = await collection
      .find(
        {},
        {
          projection: { content: 0 },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    return files.map((file) => ({
      name: file.filename,
      size: file.size,
      created: file.createdAt,
      type: file.contentType.split("/").pop().toUpperCase(),
      id: file._id.toString(),
    }));
  } catch (error) {
    console.error("Error listing files:", error);
    return [];
  }
}

// Function to get a file from MongoDB by filename
export async function getFileByName(filename: string) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(FILES_COLLECTION);

    const file = await collection.findOne({ filename });
    if (!file) {
      throw new Error(`File not found: ${filename}`);
    }

    // Convert base64 back to buffer
    const buffer = Buffer.from(file.content, "base64");

    return {
      buffer,
      contentType: file.contentType,
      filename: file.filename,
    };
  } catch (error) {
    console.error(`Error getting file ${filename}:`, error);
    throw error;
  }
}
