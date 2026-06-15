import { getActiveServices } from '../db.js';
import { createPaymentInvoice } from '../payments.js';
import { mainMenuKeyboard, paymentKeyboard, servicesKeyboard } from '../keyboards.js';

function formatPaymentMessage(order) {
  const lines = [
    `Order #${order.orderId} created for *${order.service.name}*.`,
    '',
    `Amount: *$${order.service.price_usd.toFixed(2)} USD*`,
  ];

  if (order.payAmount && order.payCurrency) {
    lines.push(`Pay: *${order.payAmount} ${order.payCurrency.toUpperCase()}*`);
  }

  if (order.payAddress) {
    lines.push('', `Address:\n\`${order.payAddress}\``);
  }

  lines.push('', 'Your order will be marked paid automatically once payment is confirmed.');

  return lines.join('\n');
}

export async function showServiceList(ctx) {
  const services = getActiveServices();

  if (services.length === 0) {
    return ctx.reply(
      'No services are available right now. Please check back later.',
      mainMenuKeyboard()
    );
  }

  return ctx.reply('Select a service:', servicesKeyboard(services));
}

export function registerOrderHandlers(bot) {
  bot.hears('Order', async (ctx) => showServiceList(ctx));

  bot.action(/^service:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery('Creating invoice...');

    const serviceId = Number(ctx.match[1]);
    const user = ctx.from;

    try {
      const order = await createPaymentInvoice({
        userId: user.id,
        username: user.username,
        serviceId,
      });

      await ctx.editMessageText(formatPaymentMessage(order), {
        parse_mode: 'Markdown',
        ...paymentKeyboard(order.paymentUrl),
      });
    } catch (error) {
      await ctx.reply(`Could not create order: ${error.message}`, mainMenuKeyboard());
    }
  });
}

export function formatPaidNotification(order) {
  return [
    `Payment received for order #${order.id}.`,
    `Service: ${order.service_name}`,
    `Amount: $${Number(order.amount_usd).toFixed(2)} USD`,
    '',
    'Thank you! We will process your order shortly.',
  ].join('\n');
}
