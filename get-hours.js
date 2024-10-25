const axios = require('axios');
const fs = require('fs');

// Replace with your own Google API key
const API_KEY = process.env.GOOGLE_API_KEY;

// Place IDs for 4th and Foothill locations
const fourthPlaceId = 'ChIJRYa2xUlBmYARjYfP8QWaWfQ';
const foothillPlaceId = 'ChIJy2IdIjwVmYARcJ7NkrHy1-I';

// Utility function to get the current time in the business's timezone
function getCurrentPacificTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

// Function to format time from 'HHMM' to an integer hour
function parseHour(time) {
  return parseInt(time.slice(0, 2), 10);
}

// Function to fetch business hours
async function fetchBusinessHours(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?fields=name,current_opening_hours,opening_hours&place_id=${placeId}&key=${API_KEY}`;
    const response = await axios.get(url);
    return response.data.result;
  } catch (error) {
    console.error(`Error fetching data for place_id ${placeId}:`, error);
    return null;
  }
}

// Function to calculate the business status in the required format
function getBusinessStatus(periods) {
  const now = getCurrentPacificTime();
  const currentDay = now.getDay(); 

  const todayPeriod = periods.find(p => p.open.day === currentDay);
  if (!todayPeriod) return { "opening-soon": null, "open": null, "closing-soon": null, "close": null };

  // Convert to integer hours for JSON output
  const openHour = parseHour(todayPeriod.open.time);
  const closeHour = parseHour(todayPeriod.close.time);
  
  return {
    "opening-soon": openHour - 1, // 1 hour before opening
    "open": openHour,
    "closing-soon": closeHour - 1, // 1 hour before closing
    "close": closeHour
  };
}

// Main function to fetch and process business hours
(async function () {
  // Fetch hours for both locations
  const [fourth, foothill] = await Promise.all([
    fetchBusinessHours(fourthPlaceId),
    fetchBusinessHours(foothillPlaceId),
  ]);

  // Process the hours and calculate status
  const fourthHours = fourth ? getBusinessStatus(fourth.current_opening_hours.periods) : { "opening-soon": null, "open": null, "closing-soon": null, "close": null };
  const foothillHours = foothill ? getBusinessStatus(foothill.current_opening_hours.periods) : { "opening-soon": null, "open": null, "closing-soon": null, "close": null };

  // Create the JSON output
  const hoursToday = {
    fourth: fourthHours,
    foothill: foothillHours
  };

  // Save to hours_today.json
  fs.writeFileSync('hours_today.json', JSON.stringify(hoursToday, null, 2));

  console.log('Business hours for today saved to hours_today.json');
})();
