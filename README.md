# 🎮 Daily Game Recommendation Bot

A TypeScript bot that picks a well-rated game from [RAWG.io](https://rawg.io/) every day and posts it to X (Twitter), running for free on GitHub Actions.

## Features

- **Two kinds of picks:**
  - **Popular** (most days): critically acclaimed games (Metacritic 80+) that players also rate well.
  - **Hidden gem** (Wednesdays and Saturdays, UTC): highly rated by players (4.0+, at least 30 ratings) but outside the most popular games, excluding free-to-play titles. Falls back to a popular pick if none is found.
- **Sensible filtering:** Games released since 2010 only. DLCs, adult-only titles, mobile-only games and games not sold in any store are skipped.
- **No duplicates:** Every posted game is stored in `data/history.json`, which the workflow commits back to the repo.
- **Rich posts:** Release date, Metacritic score, playtime, developer and platforms, with the game's cover image.
- **Fails loudly:** If posting fails, the run turns red and the game is *not* marked as used, so nothing is skipped silently.

## Requirements

- Node.js 22+
- A RAWG API key ([rawg.io/apidocs](https://rawg.io/apidocs))
- An X developer app with **Read and Write** permissions and credits on your account

> **X API costs:** The X API is pay-per-use. Posting needs prepaid credits in the [X Developer Console](https://console.x.com) (one post is roughly $0.015, plus media upload). When credits run out, the API returns `402 credits depleted` and the workflow run fails.

## Setup

```bash
git clone https://github.com/tolgaguducu/game-advisor-bot.git
cd game-advisor-bot
npm install
cp .env.example .env   # then fill in your keys
```

| Variable | Description |
| --- | --- |
| `RAWG_API_KEY` | RAWG API key (required) |
| `TWITTER_API_KEY` / `TWITTER_API_SECRET` | App's API key and secret (consumer keys) |
| `TWITTER_ACCESS_TOKEN` / `TWITTER_ACCESS_SECRET` | Access token and secret for the posting account (generate them *after* enabling Read and Write) |
| `RECOMMENDATION_MODE` | Optional: `popular` or `hidden-gem` to override the day's mode |

The thresholds (minimum Metacritic score, hidden gem days, rating limits) are constants at the top of `src/services/gameService.ts`.

## Running locally

```bash
npm start
```

Without the X keys the bot runs in **dry-run mode**: it prints the post it would send and leaves `data/history.json` untouched. To start with a clean slate, replace the contents of `data/history.json` with `[]`.

## Deployment (GitHub Actions)

1. Fork or push the repository to GitHub.
2. Under **Settings → Secrets and variables → Actions**, add `RAWG_API_KEY`, `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN` and `TWITTER_ACCESS_SECRET`.
3. The workflow in `.github/workflows/daily-recommendation.yml` runs every day at 09:00 UTC. You can also start it manually from the **Actions** tab.

Notes:

- GitHub can start scheduled runs a few hours late, and it disables schedules in repositories with no activity for 60 days.
- If a run fails, open the **Run Recommendation Bot** step to see the error returned by the API.

## Development

```bash
npm test           # unit tests (Node's built-in test runner)
npm run typecheck  # TypeScript type check
```

```
src/
├── index.ts            # Entry point: loads config, wires everything together
├── bot.ts              # Picks a game, posts it everywhere, updates history
├── post.ts             # Builds the platform-independent post text and image
├── config/env.ts       # Reads and validates environment variables
├── services/
│   ├── gameService.ts      # Game selection from RAWG (modes, thresholds, filters)
│   └── historyService.ts   # data/history.json
├── publishers/
│   ├── publisher.ts        # Interface every platform implements
│   └── twitterPublisher.ts
└── utils/              # Error formatting, image download
```

To add a platform, implement `Publisher` in `src/publishers/`, read its credentials in `src/config/env.ts` and register it in `createPublishers` in `src/index.ts`.
