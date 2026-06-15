import { Telegraf } from 'telegraf';
import { registerAdminHandlers } from './handlers/admin.js';
import { registerMenuHandlers } from './handlers/menu.js';
import { registerOrderHandlers } from './handlers/order.js';
import { registerVouchHandlers } from './handlers/vouches.js';

export function createBot(token) {
  const bot = new Telegraf(token);

  registerMenuHandlers(bot);
  registerOrderHandlers(bot);
  registerVouchHandlers(bot);
  registerAdminHandlers(bot);

  bot.catch((error, ctx) => {
    console.error(`Bot error for update ${ctx.updateType}:`, error);
  });

  return bot;
}
