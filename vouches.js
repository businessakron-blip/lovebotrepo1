import { getVouches } from '../db.js';
import { mainMenuKeyboard } from '../keyboards.js';

function stars(rating) {
  const value = Math.max(1, Math.min(5, Number(rating) || 5));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

export async function showVouches(ctx) {
  const vouches = getVouches(15);

  if (vouches.length === 0) {
    return ctx.reply('No vouches yet. Be the first to order!', mainMenuKeyboard());
  }

  const message = vouches
    .map(
      (vouch) =>
        `*${vouch.customer_name}* ${stars(vouch.rating)}\n${vouch.review_text}`
    )
    .join('\n\n');

  return ctx.reply(`*Customer Vouches*\n\n${message}`, {
    parse_mode: 'Markdown',
    ...mainMenuKeyboard(),
  });
}

export function registerVouchHandlers(bot) {
  bot.hears('Vouches', async (ctx) => showVouches(ctx));
}
