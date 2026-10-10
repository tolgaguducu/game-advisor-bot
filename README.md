# 🎮 Daily Game Recommendation Bot

A TypeScript bot that picks a well-rated game from [RAWG.io](https://rawg.io/) every day and posts it to X (Twitter), running for free on GitHub Actions.

## Features

- **Daily recommendations:** Picks a random, highly-rated game released since 2015 (up to today).
- **No duplicates:** Every posted game is stored in `data/history.json`, which the workflow commits back to the repo.
- **Rich posts:** Release date, Metacritic score, playtime, developer and platforms, with the game's cover image.
- **Fails loudly:** If posting fails, the run turns red and the game is *not* marked as used, so nothing is skipped silently.

## Requirements

- Node.js 20+
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
