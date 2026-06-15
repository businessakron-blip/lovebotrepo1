import { Markup } from 'telegraf';

export const mainMenuKeyboard = () =>
  Markup.keyboard([['Order', 'Vouches']]).resize();

export const servicesKeyboard = (services) => {
  const rows = services.map((service) => [
    Markup.button.callback(
      `${service.name} — $${service.price_usd.toFixed(2)}`,
      `service:${service.id}`
    ),
  ]);

  rows.push([Markup.button.callback('Back to menu', 'back:menu')]);

  return Markup.inlineKeyboard(rows);
};

export const paymentKeyboard = (paymentUrl) =>
  Markup.inlineKeyboard([
    [Markup.button.url('Pay with crypto', paymentUrl)],
    [Markup.button.callback('Back to menu', 'back:menu')],
  ]);
