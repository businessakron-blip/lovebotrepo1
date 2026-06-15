import { assertConfig, config } from './config.js';
import { createBot } from './bot.js';
import { createWebhookServer, startWebhookServer } from './webhook.js';

async function main() {
  assertConfig();

  const bot = createBot(config.botToken);
  const app = createWebhookServer(bot);

  await startWebhookServer(app);

  console.log('Starting Telegram bot...');
  await bot.launch();

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
