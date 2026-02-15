# ChoreBoard

A fun, colorful chore tracking app for kids. Parents set up chores and rewards, kids mark them done and earn points to claim prizes.

## Goals

ChoreBoard is designed to make household chores engaging for children. The core loop is simple: complete chores, earn points, redeem rewards. The app is intentionally lightweight — a single binary with no external dependencies beyond SQLite — so it can run on a Raspberry Pi, a home server, or anywhere Docker is available.

Key design goals:

- **Kid-friendly UI** — Large tap targets, emoji-heavy, colorful cards, confetti on completion. Designed to work well on tablets and phones.
- **Parent-controlled** — Parents configure chores, rewards, and children through the Settings tab. Kids interact mainly with the Chores and Rewards tabs.
- **Self-hosted** — No accounts, no cloud. All data lives in a local SQLite database. Export/import for backups.
- **Zero JavaScript frameworks** — The frontend is vanilla JS with no build step. One HTML file, one CSS file, one JS file.

## Features

### Chores Tab
Daily chore checklist per child with date navigation. Tap "Done!" to complete a chore, which triggers a confetti animation and awards points. Chores can be marked as **recurring**, allowing unlimited completions per day (e.g., "Brush Teeth", "Wash Hands Before Meals"). Recurring chores show a completion count badge instead of a single checkmark.

### Calendar Tab
Monthly calendar view showing activity per day. Tap a day to see the detail breakdown, split into two separate cards:
- **Chores Completed** — each completion with points earned and an undo button
- **Rewards Claimed** — each redemption with points spent and an undo button

Emoji dots on each calendar day give a quick visual summary of activity.

### Rewards Tab
Browse available rewards with progress bars showing how close the child is to affording each one. Claim rewards by spending earned points. Today's claimed rewards are shown at the top; full reward history is visible in the Calendar tab.

Rewards support **claim frequency limits**:
- **Unlimited** — can be claimed any number of times
- **Once per day** — one claim per child per day
- **Once per week** — one claim per child per rolling 7-day window

### Print Tab
Generate a printable weekly chore chart (A4-sized table) with checkboxes for each day. Filterable by chore frequency. Useful for families that want a physical chart on the fridge alongside the digital version.

### Settings Tab
Full CRUD management for:
- **Children** — name, emoji avatar, accent color
- **Chores** — name, emoji, point value, frequency (daily/weekly/bi-weekly/monthly/once), recurring toggle
- **Rewards** — name, emoji, point cost, claim frequency

Includes an emoji picker with a large selection per category plus custom emoji input.

**Data management**: Export the entire database as a JSON file, or import a previously exported backup (replaces all data).

## Architecture

### Backend

A single Go binary serving both the API and the static frontend.

| Component | Technology |
|-----------|-----------|
| Language | Go 1.22 |
| Router | [chi](https://github.com/go-chi/chi) v5 |
| Database | SQLite via [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) (pure Go, no CGO) |
| Static files | Embedded via `go:embed` |

The backend is three files:
- **`main.go`** — HTTP server setup, routing, static file serving
- **`db.go`** — Schema migrations (with safe `ALTER TABLE` for new columns), seed data for a default child, 30 chores, and 18 rewards
- **`handlers.go`** — REST API handlers for all CRUD operations, point calculations, export/import

### Frontend

Vanilla JavaScript single-page application with no build tools or framework dependencies.

- **`static/index.html`** — Shell with header, nav, content area, emoji picker modal, toast container, confetti canvas
- **`static/app.js`** — All application logic: data loading, tab rendering, optimistic UI updates, confetti animation, toast notifications
- **`static/style.css`** — Colorful design using CSS custom properties, responsive layout, print styles for the chore chart

### Database Schema

Five tables:

- **`children`** — id, name, emoji, color
- **`chores`** — id, name, emoji, points, frequency, recurring
- **`rewards`** — id, name, emoji, points_cost, claim_frequency
- **`completions`** — id, child_id, chore_id, date, completed_at (foreign keys to children and chores)
- **`redemptions`** — id, child_id, reward_id, points_cost, redeemed_at (foreign keys to children and rewards)

Points are calculated on the fly: sum of chore points from completions minus sum of points_cost from redemptions.

### API

All endpoints are under `/api`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/children` | List all children |
| POST | `/api/children` | Add a child |
| PUT | `/api/children/{id}` | Update a child |
| DELETE | `/api/children/{id}` | Delete a child and their history |
| GET | `/api/children/{id}/points` | Get earned/spent/balance |
| GET | `/api/chores` | List all chores |
| POST | `/api/chores` | Add a chore |
| PUT | `/api/chores/{id}` | Update a chore |
| DELETE | `/api/chores/{id}` | Delete a chore |
| GET | `/api/rewards` | List all rewards |
| POST | `/api/rewards` | Add a reward |
| PUT | `/api/rewards/{id}` | Update a reward |
| DELETE | `/api/rewards/{id}` | Delete a reward |
| GET | `/api/completions` | List completions (supports `child_id`, `from`, `to` filters) |
| POST | `/api/completions` | Record a chore completion |
| DELETE | `/api/completions/{id}` | Undo a completion |
| GET | `/api/redemptions` | List redemptions (supports `child_id`, `from`, `to` filters) |
| POST | `/api/redemptions` | Claim a reward (checks balance and claim frequency) |
| DELETE | `/api/redemptions/{id}` | Undo a redemption |
| GET | `/api/export` | Download full database as JSON |
| POST | `/api/import` | Replace all data from JSON upload |

## Running

### Direct

```sh
go build -o choreboard .
./choreboard
```

Open `http://localhost:8080`. Set a custom port with the `PORT` environment variable and a custom database path with `DB_PATH`.

### Docker Compose

```sh
docker compose up -d
```

Open `http://localhost:8888`. Data is persisted in a named Docker volume.
