import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

async function fetchGame() {
  if (!apiKey) {
    console.error('No API Key found');
    return;
  }

  try {
    // Fetch The Witcher 3 (ID: 3328) as a sample
    const response = await axios.get(`${RAWG_BASE_URL}/games/3328`, {
      params: { key: apiKey }
    });

    console.log('Available keys in game details response:');
    console.log(JSON.stringify(Object.keys(response.data), null, 2));
    
    const interestingFields = ['released', 'metacritic', 'playtime', 'platforms', 'developers', 'publishers', 'esrb_rating', 'website', 'reddit_url'];
    console.log('\nValues for interesting fields:');
    interestingFields.forEach(field => {
        // Just print a summary or the value
        const value = response.data[field];
        if (Array.isArray(value)) {
             console.log(`${field}: Array of ${value.length} items. First item:`, JSON.stringify(value[0], null, 2));
        } else {
             console.log(`${field}:`, JSON.stringify(value, null, 2));
        }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

fetchGame();
