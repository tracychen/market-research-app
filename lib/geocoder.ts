import NodeGeocoder from "node-geocoder";
import fetch from "node-fetch";

export async function getCityLatLng(cityName: string, googleApiKey: string) {
  // Set up geocoder
  const geocoder = NodeGeocoder({
    provider: "google",
    fetch: fetch,
    apiKey: googleApiKey,
  });

  // Get target city coordinates
  const geoResults = await geocoder.geocode(cityName);
  if (
    geoResults &&
    geoResults.length > 0 &&
    geoResults[0].latitude &&
    geoResults[0].longitude
  ) {
    const targetCoords = [geoResults[0].latitude, geoResults[0].longitude];

    return targetCoords;
  }

  return null;
}
