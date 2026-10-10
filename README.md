# 🎮 Daily Game Recommendation Bot

A TypeScript bot that picks a well-rated game from [RAWG.io](https://rawg.io/) every day and posts it to X (Twitter) and/or Bluesky, running for free on GitHub Actions.

## Features

- **Two kinds of picks:**
  - **Popular** (most days): critically acclaimed games (Metacritic 80+) that players also rate well.
  - **Hidden gem** (Wednesdays and Saturdays, UTC): highly rated by players (4.0+, at least 30 ratings) but outside the most popular games, excluding free-to-play titles. Falls back to a popular pick if none is found.
- **Sensible filtering:** Games released since 2010 only. DLCs, adult-only titles, mobile-only games and games not sold in any store are skipped.
- **Blocked companies:** Games developed or published by companies in `BLOCKED_COMPANIES` (`src/services/gameService.ts`) are never recommended. Currently: Paradox Interactive and its studios.
- **Independent platforms:** Each platform has its own workflow, schedule and history, so one can fail or be disabled without affecting the others.
- **No duplicates:** Every posted game is stored in `data/history/<platform>.json`, which the workflow commits back to the repo.
- **Rich posts:** Labelled as "Game of the Day" or "Hidden Gem", with release year, Metacritic score, playtime, developer, main platforms, hashtags picked from the game's genres and tags, and the game's artwork:

  ```
  🎮 Game of the Day: Metro Exodus (2019)

  ⭐️ Metacritic 81 · ⏱️ 6 hours
  👨‍💻 4A Games
  🕹️ PC, PlayStation 5, PlayStation 4

  #HorrorGame #Shooter #OyunumaDokunma
  ```
- **Fails loudly:** If posting fails, the run turns red and the game is *not* marked as used, so nothing is skipped silently.

## Requirements

- Node.js 22+
- A RAWG API key ([rawg.io/apidocs](https://rawg.io/apidocs))
- For X: a developer app with **Read and Write** permissions and credits on your account
- For Bluesky: an account and an [app password](https://bsky.app/settings/app-passwords) (free)

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
| `BLUESKY_IDENTIFIER` | Bluesky handle without `@` (e.g. `name.bsky.social`) |
| `BLUESKY_APP_PASSWORD` | App password from **Settings → Privacy and Security → App Passwords** (not your account password) |
| `RECOMMENDATION_MODE` | Optional: `popular` or `hidden-gem` to override the day's mode |

The thresholds (minimum Metacritic score, hidden gem days, rating limits) are constants at the top of `src/services/gameService.ts`.

## Running locally

```bash
npm start -- x         # or: npm start -- bluesky
```

Without the platform's keys the bot runs in **dry-run mode**: it prints the post it would send and leaves the history untouched. To start with a clean slate, replace the contents of `data/history/<platform>.json` with `[]`.

## Deployment (GitHub Actions)

1. Fork or push the repository to GitHub.
2. Under **Settings → Secrets and variables → Actions**, add `RAWG_API_KEY` and the keys of the platforms you use.
3. Each platform has its own workflow that runs on its own schedule and can also be started manually from the **Actions** tab:

| Workflow | File | Schedule |
| --- | --- | --- |
| Post to X | `.github/workflows/post-x.yml` | Daily at 09:00 UTC |
| Post to Bluesky | `.github/workflows/post-bluesky.yml` | Daily at 10:00 UTC |

Platforms are independent: they pick their own games and keep their own history. To use only one platform, add only its secrets and disable (or delete) the other workflow. To stop posting to a platform, disable its workflow in the **Actions** tab (or delete its file). To change the time, edit the `cron` line in its file. The shared steps live in `.github/workflows/post.yml`.

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
├── index.ts            # Entry point: loads config for the given platform, wires everything together
├── bot.ts              # Picks a game, posts it, updates history
├── post.ts             # Builds the platform-independent post text and image
├── config/env.ts       # Reads and validates the platform argument and environment variables
├── services/
│   ├── gameService.ts      # Game selection from RAWG (modes, thresholds, filters)
│   └── historyService.ts   # data/history/<platform>.json
├── publishers/
│   ├── publisher.ts        # Interface every platform implements
│   ├── twitterPublisher.ts
│   └── blueskyPublisher.ts
└── utils/              # Error formatting, image download
```

To add a platform:

1. Implement `Publisher` in `src/publishers/`.
2. Add it to `PLATFORMS` and read its credentials in `src/config/env.ts`.
3. Create it in `createPublisher` in `src/index.ts`.
4. Add a `.github/workflows/post-<platform>.yml` like `post-x.yml` and pass its secrets in `post.yml`.
