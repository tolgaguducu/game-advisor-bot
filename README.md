# 🎮 Daily Game Recommendation Bot

A TypeScript-based bot that recommends a unique game every day and posts it to Twitter (X).

## Features

- **Daily Recommendations:** Fetches a highly-rated game from [RAWG.io](https://rawg.io/).
- **Smart Filtering:** Skips games without descriptions and ensures no duplicates are recommended.
- **Twitter Integration:** Automatically posts the game details (Title, Rating, Genre, Description) to Twitter.
- **Automated:** Runs daily via GitHub Actions.

## Setup

### Prerequisites

- Node.js (v18+)
- RAWG API Key (Get it from [rawg.io/apidocs](https://rawg.io/apidocs))
- Twitter Developer Account (API Key, Secret, Access Token, Access Secret)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd automatedrecommendation
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

Create a `.env` file in the root directory:

```env
RAWG_API_KEY=your_rawg_key
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
```

### Running Locally

To test the bot locally:

```bash
npm start
# or
npx ts-node src/index.ts
```


## Deployment (GitHub Actions)

This project is configured to run automatically on GitHub.

1. Push the code to a GitHub repository.
2. Go to **Settings > Secrets and variables > Actions**.
3. Add the following repository secrets:
   - `RAWG_API_KEY`
   - `TWITTER_API_KEY`
   - `TWITTER_API_SECRET`
   - `TWITTER_ACCESS_TOKEN`
   - `TWITTER_ACCESS_SECRET`
4. The workflow will run automatically every day at 12:00 TRT (09:00 UTC).
