import { isAdmin } from '../config.js';
import { addService, addVouch, getOrders } from '../db.js';

function requireAdmin(ctx) {
  if (!isAdmin(ctx.from.id)) {
    ctx.reply('You are not authorized to use admin commands.');
    return false;
  }
  return true;
}

function parsePipeArgs(text, expectedParts) {
  const parts = text.split('|').map((part) => part.trim());
  if (parts.length < expectedParts) {
    return null;
  }
  return parts;
}

function formatOrder(order) {
  return [
    `#${order.id} | ${order.status.toUpperCase()}`,
    `User: ${order.username ? `@${order.username}` : order.user_id}`,
    `Service: ${order.service_name}`,
    `Amount: $${Number(order.amount_usd).toFixed(2)}`,
    `Created: ${order.created_at}`,
    order.paid_at ? `Paid: ${order.paid_at}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function registerAdminHandlers(bot) {
  bot.command('admin', async (ctx) => {
    if (!requireAdmin(ctx)) return;

    await ctx.reply(
      [
        '*Admin commands*',
        '',
        '/addservice `<name> | <price> | <description>`',
        '/addvouch `<name> | <rating 1-5> | <review>`',
        '/orders `[pending|paid|all]`',
        '',
        'Example:',
        '/addservice `Premium Boost | 49.99 | 24h delivery`',
        '/addvouch `Alex | 5 | Fast and reliable!`',
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('addservice', async (ctx) => {
    if (!requireAdmin(ctx)) return;

    const input = ctx.message.text.replace(/^\/addservice\s*/i, '').trim();
    const parts = parsePipeArgs(input, 3);

    if (!parts) {
      return ctx.reply('Usage: /addservice <name> | <price> | <description>');
    }

    const [name, priceRaw, description] = parts;
    const price = Number(priceRaw);

    if (!name || !Number.isFinite(price) || price <= 0) {
      return ctx.reply('Invalid name or price. Price must be a positive number.');
    }

    const id = addService(name, description, price);
    await ctx.reply(`Service added (#${id}): ${name} — $${price.toFixed(2)}`);
  });

  bot.command('addvouch', async (ctx) => {
    if (!requireAdmin(ctx)) return;

    const input = ctx.message.text.replace(/^\/addvouch\s*/i, '').trim();
    const parts = parsePipeArgs(input, 3);

    if (!parts) {
      return ctx.reply('Usage: /addvouch <name> | <rating 1-5> | <review>');
    }

    const [customerName, ratingRaw, reviewText] = parts;
    const rating = Number(ratingRaw);

    if (!customerName || !reviewText || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return ctx.reply('Invalid input. Rating must be an integer from 1 to 5.');
    }

    const id = addVouch(customerName, reviewText, rating);
    await ctx.reply(`Vouch added (#${id}) for ${customerName}.`);
  });

  bot.command('orders', async (ctx) => {
    if (!requireAdmin(ctx)) return;

    const arg = ctx.message.text.replace(/^\/orders\s*/i, '').trim().toLowerCase();
    const status = arg && arg !== 'all' ? arg : undefined;
    const orders = getOrders({ status, limit: 25 });

    if (orders.length === 0) {
      return ctx.reply(status ? `No ${status} orders found.` : 'No orders found.');
    }

    const message = orders.map(formatOrder).join('\n\n');
    await ctx.reply(message);
  });
}
