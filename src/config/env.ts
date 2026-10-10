import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const config = {
  rawgApiKey: process.env.RAWG_API_KEY || '',
  // Optional override for the day's recommendation mode: "popular" or "hidden-gem"
  recommendationMode: process.env.RECOMMENDATION_MODE || '',
  twitterApiKey: process.env.TWITTER_API_KEY || '',
  twitterApiSecret: process.env.TWITTER_API_SECRET || '',
  twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN || '',
  twitterAccessSecret: process.env.TWITTER_ACCESS_SECRET || '',
};
