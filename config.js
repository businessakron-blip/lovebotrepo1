import 'dotenv/config';

function parseAdminIds(value) {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map(Number)
      .filter((id) => Number.isFinite(id))
  );
}

export const config = {
  botToken: process.env.BOT_TOKEN,
  adminIds: parseAdminIds(process.env.ADMIN_IDS),
  port: Number(process.env.PORT) || 3000,
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  nowPaymentsApiKey: process.env.NOWPAYMENTS_API_KEY,
  nowPaymentsIpnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
  payCurrency: (process.env.PAY_CURRENCY || 'btc').toLowerCase(),
  mockPayments: process.env.MOCK_PAYMENTS === 'true',
  dbPath: process.env.DB_PATH || './data/bot.db',
};

export function assertConfig() {
  if (!config.botToken) {
    throw new Error('BOT_TOKEN is required in .env');
  }

  const placeholderTokens = new Set([
    'your_telegram_bot_token',
    'your_bot_token',
    'replace_me',
  ]);

  if (placeholderTokens.has(config.botToken.trim())) {
    throw new Error(
      'BOT_TOKEN is still the placeholder value. Open .env and paste the token from @BotFather (looks like 123456789:AAH...).'
    );
  }

  if (!/^\d+:[A-Za-z0-9_-]+$/.test(config.botToken.trim())) {
    throw new Error(
      'BOT_TOKEN looks invalid. Copy the full token from @BotFather — format should be 123456789:AAH...'
    );
  }

  if (!config.mockPayments && !config.nowPaymentsApiKey) {
    throw new Error('NOWPAYMENTS_API_KEY is required unless MOCK_PAYMENTS=true');
  }
}

export function isAdmin(userId) {
  return config.adminIds.has(userId);
}
