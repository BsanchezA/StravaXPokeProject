# PokéRun | Strava x PokéAPI

Turn your runs into Pokémon catches. PokéRun connects to your Strava account, and allows you to pick a run, and uses the [PokéAPI](https://pokeapi.co/) to "catch" a Pokémon based on it. The catch is then written back to your Strava activity.

Built with plain **Node.js** using the core `http`/`https` modules, with no frameworks. Every request, redirect and OAuth step is handled by hand.

---

## How it works

1. **Authorize:** You sign in with Strava through OAuth 2.0. The app exchanges the authorization code for access and refresh tokens.
2. **Fetch:** It pulls your most recent run from the Strava API.
3. **Catch:** The run data decides which Pokémon you catch, fetched from PokéAPI.
4. **Write back:** The catch is posted to your Strava activity.

```
Strava (OAuth) ──► Stravamain.js ──► Pokerunlogic.js ──► PokéAPI
       ▲                                                   │
       └──────────── catch written to activity ◄───────────┘
```
**Cache**: Cache is built to keep authorization and sign in if once authorized.
## Project structure

| File | Purpose |
|------|---------|
| `Stravamain.js` | Server entry point: OAuth flow, Strava API requests, token handling |
| `Pokerunlogic.js` | Turns run data into a Pokémon catch via PokéAPI |
| `gen.html` | Front-end page |
| `credentials.example.json` | Template for your Strava API credentials |

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- A Strava account and a [Strava API application](https://www.strava.com/settings/api)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/<your-username>/StravaXPokeProject.git
   cd StravaXPokeProject
   ```
2. Copy the credentials template and fill in your Strava app's values:
   ```bash
   cp credentials.example.json credentials.json
   ```
3. In your Strava API settings, set the **Authorization Callback Domain** to `localhost`.
4. Run it:
   ```bash
   node Stravamain.js
   ```
5. Open the URL printed in the terminal and authorize with Strava.

> `credentials.json` and the token cache are git-ignored and should never be committed.

## Tech stack
- Node.js (core `http` / `https`)
- Strava API v3 with OAuth 2.0
- PokéAPI

## Roadmap
- [ ] _Add planned features here_

## Author
**Bryan Sanchez**, CS @ Queens College (CUNY)
