const axios = require('axios');
const fs = require('fs');

// Replace with your own Google API key
const API_KEY = process.env.GOOGLE_API_KEY;

// Place IDs for 4th and Foothill locations
const fourthPlaceId = 'ChIJRYa2xUlBmYARjYfP8QWaWfQ';
const foothillPlaceId = 'ChIJy2IdIjwVmYARcJ7NkrHy1-I'; // Foothill Place ID

// Utility function to get the current time in the business's timezone
function getCurrentPacificTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
}

// Function to format time from 'HHMM' to 'HH:MM' format
function formatTime(time) {
  return `${time.slice(0, 2)}:${time.slice(2)}`;
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

// Function to calculate the status of the business
function getBusinessStatus(periods) {
  const now = getCurrentPacificTime();
  const currentDay = now.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
  const currentDate = now.toISOString().split('T')[0].replace(/-/g, ''); // 'YYYYMMDD' format
  const currentTime = now.getHours() * 100 + now.getMinutes(); // Current time in 'HHMM' format

  // Find the period for today by matching both day and date
  const todayPeriod = periods.find(p => p.open.day === currentDay && p.open.date === currentDate);

  if (!todayPeriod) return { open: false, status: 'closed' };

  const openTime = parseInt(todayPeriod.open.time, 10);
  const closeTime = parseInt(todayPeriod.close.time, 10);

  // 5-minute leeway
  const openLeeway = openTime - 5;
  const closeLeeway = closeTime;

  // Check "opening soon" (within 30 minutes) and handle leeway for opening
  if (currentTime >= openLeeway - 30 && currentTime < openLeeway) {
    return { open: false, status: 'opening soon' };
  }

  // Check "closing soon" (within 30 minutes) and handle leeway for closing
  if (currentTime >= closeLeeway - 30 && currentTime < closeLeeway) {
    return { open: true, status: 'closing soon' };
  }

  // Check if the business is open
  if (currentTime >= openLeeway && currentTime <= closeLeeway) {
    return { open: true, status: 'open', hours: `${formatTime(todayPeriod.open.time)}-${formatTime(todayPeriod.close.time)}` };
  }

  // Otherwise, the business is closed
  return { open: false, status: 'closed' };
}

// Main function to fetch and process business hours
(async function () {
  const [fourth, foothill] = await Promise.all([
    fetchBusinessHours(fourthPlaceId),
    fetchBusinessHours(foothillPlaceId),
  ]);

  const fourthHours = fourth ? getBusinessStatus(fourth.current_opening_hours.periods) : { open: false, status: 'closed' };
  const foothillHours = foothill ? getBusinessStatus(foothill.current_opening_hours.periods) : { open: false, status: 'closed' };
  console.log(fourthHours);
  const hoursToday = {
    fourth: fourthHours,
    foothill: foothillHours
  };

  fs.writeFileSync('hours_today.json', JSON.stringify(hoursToday, null, 2));

  console.log('Business hours for today saved to hours_today.json');
})();
