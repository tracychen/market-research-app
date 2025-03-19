// This script is used to update the area data for each area in the areaData.json file
// It uses the https://www.bls.gov/cew/classifications/areas/qcew-area-titles.htm csv export to get the area codes
// If there are areas in areaData that are not in the csv, it will remove them
// If there are areas in the csv that are not in areaData, it will add them with coordinates from geocoding
// It then saves the updated areaData to the areaData.json file

import path from "path";
import data from "../data/areaData.json";
import fs from "fs";
import { getCityLatLng } from "../lib/geocoder";

// Insert your Google API key here
const GOOGLE_API_KEY = "";

async function updateAreaData() {
  const csv = fs.readFileSync(
    path.resolve(__dirname, "./area-titles-csv.csv"),
    "utf8"
  );
  const areaCodes: Record<string, string> = {};
  const rows = csv.split("\n");
  for (const row of rows) {
    // Split on first comma only since area titles may contain commas
    const [areaFips, ...titleParts] = row.split(",");
    const areaTitle = titleParts.join(",").replace(/\r/g, "");
    const formattedAreaTitle = areaTitle.replaceAll(/"/g, "");
    if (formattedAreaTitle.includes("MSA")) {
      areaCodes[formattedAreaTitle] = areaFips;
    }
  }
  const areaData: Record<
    string,
    {
      area_code: string;
      coordinates: number[];
    }
  > = data;

  // Go through cities listed in areaData
  for (const [area, areaInfo] of Object.entries(areaData)) {
    // console.log(area);
    const areaCode = areaCodes[`${area} MSA`];
    if (areaCode) {
      // Check if area code is the same as the area code in areaData
      const newAreaCode = areaCode.slice(1) + "0";
      if (areaInfo.area_code !== newAreaCode) {
        // To make up the full 5 character QCEW area code field, the letter C precedes the first 4-digits of the Census MSA
        // code to make up the 5 character QCEW MSA area code. https://www.bls.gov/cew/classifications/areas/area-guide.htm
        console.log(
          `Updating area code for ${area} from ${areaInfo.area_code} to ${newAreaCode}`
        );
        areaInfo.area_code = newAreaCode;
      }
    } else {
      console.warn(`No area code found for ${area}, deleting it`);
      // remove from areaData
      delete areaData[area];
    }
  }

  // Go through areaCodes areas and see which are not in areaData
  for (const [area] of Object.entries(areaCodes)) {
    const formattedArea = area.replace(" MSA", "");
    if (
      !(
        areaData as Record<
          string,
          {
            area_code: string;
            coordinates: number[];
          }
        >
      )[formattedArea]
    ) {
      // Fetch the lat/lng from geocoding
      const geoResults = await getCityLatLng(formattedArea, GOOGLE_API_KEY);
      if (geoResults) {
        // Add to areaData
        console.log(
          `Area ${formattedArea} not found in areaData, adding it with coordinates ${geoResults}`
        );
        areaData[formattedArea] = {
          area_code: areaCodes[area].slice(1) + "0",
          coordinates: geoResults,
        };
      } else {
        console.warn(`No coordinates found for ${formattedArea}`);
      }
    }
  }

  // Sort areaData by alphabetical order
  const updatedAreaData = Object.fromEntries(
    Object.entries(areaData).sort((a, b) => a[0].localeCompare(b[0]))
  );

  // Save the updated areaData to the file
  fs.writeFileSync(
    path.resolve(__dirname, "../data/areaData.json"),
    JSON.stringify(updatedAreaData, null, 2)
  );
}

updateAreaData();
