# Telegram Order Bot

A Telegram bot built with Node.js and Telegraf. Users can browse services, pay with crypto, and read customer vouches. Admins manage services, vouches, and orders via commands.

## Features

- **Order** — select a service, create an order, receive a crypto payment invoice
- **Vouches** — browse stored customer reviews
- **Automatic payment confirmation** — NOWPayments IPN webhook marks orders as paid and notifies the customer
- **Admin panel** — commands to add services, add vouches, and view orders
- **SQLite storage** — lightweight local database (Node.js built-in `node:sqlite`)

## Setup

### 1. Create a Telegram bot

1. Open [@BotFather](https://t.me/BotFather) on Telegram
2. Run `/newbot` and copy the bot token

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Telegram bot token from BotFather |
| `ADMIN_IDS` | Comma-separated Telegram user IDs allowed to run admin commands |
| `PORT` | HTTP port for payment webhooks (default `3000`) |
| `WEBHOOK_BASE_URL` | Public HTTPS URL where this app is reachable |
| `NOWPAYMENTS_API_KEY` | API key from [NOWPayments](https://nowpayments.io) |
| `NOWPAYMENTS_IPN_SECRET` | IPN secret from NOWPayments dashboard |
| `PAY_CURRENCY` | Crypto currency for invoices (e.g. `btc`, `eth`, `ltc`) |
| `MOCK_PAYMENTS` | Set to `true` for local testing without NOWPayments |

To find your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

### 3. Install and run

Requires **Node.js 22.5+** (uses the built-in `node:sqlite` module).

```bash
npm install
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 4. Expose webhooks (production)

NOWPayments must reach your server at:

```
https://your-domain.com/webhook/nowpayments
```

Use a reverse proxy (nginx, Caddy) or a tunnel (ngrok, Cloudflare Tunnel) and set `WEBHOOK_BASE_URL` accordingly.

## Local testing (mock payments)

Set in `.env`:

```
MOCK_PAYMENTS=true
WEBHOOK_BASE_URL=http://localhost:3000
```

When a user creates an order, the "Pay with crypto" button opens a mock payment page. Visiting that URL marks the order paid and sends a Telegram confirmation.

## User flow

1. `/start` shows two buttons: **Order** and **Vouches**
2. **Order** lists active services
3. Selecting a service creates an order and sends a crypto invoice link
4. After payment, the webhook marks the order paid and notifies the user

## Admin commands

Only users listed in `ADMIN_IDS` can run these:

| Command | Usage |
|---|---|
| `/admin` | Show admin help |
| `/addservice` | `/addservice Name \| 29.99 \| Description here` |
| `/addvouch` | `/addvouch Alex \| 5 \| Great service!` |
| `/orders` | `/orders` or `/orders pending` or `/orders paid` |

## Project structure

```
src/
  index.js          Entry point
  bot.js            Telegraf setup
  config.js         Environment config
  db.js             SQLite schema and queries
  payments.js       NOWPayments invoice creation
  webhook.js        Express webhook server
  keyboards.js      Reply and inline keyboards
  handlers/
    menu.js         Start and navigation
    order.js        Order flow
    vouches.js      Vouch display
    admin.js        Admin commands
```

## Database

SQLite file is stored at `./data/bot.db` by default. Tables:

- `services` — sellable services
- `orders` — user orders and payment metadata
- `vouches` — customer reviews
