import { mainMenuKeyboard } from '../keyboards.js';

export function registerMenuHandlers(bot) {
  bot.start(async (ctx) => {
    await ctx.reply(
      'Welcome! Use the buttons below to place an order or read customer vouches.',
      mainMenuKeyboard()
    );
  });

  bot.action('back:menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Main menu:', mainMenuKeyboard());
  });
}
