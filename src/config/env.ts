import dotenv from 'dotenv';

dotenv.config();

export const config = {
  rawgApiKey: process.env.RAWG_API_KEY || '',
  twitterApiKey: process.env.TWITTER_API_KEY || '',
  twitterApiSecret: process.env.TWITTER_API_SECRET || '',
  twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  twitterAccessSecret: process.env.TWITTER_ACCESS_SECRET || '',
};
