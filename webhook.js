import express from 'express';
import { Telegraf } from 'telegraf';
import { config } from './config.js';
import {
  getOrderById,
  getOrderByPaymentId,
  markOrderPaid,
} from './db.js';
import { formatPaidNotification } from './handlers/order.js';
import { isPaidStatus, verifyNowPaymentsSignature } from './payments.js';

export function createWebhookServer(bot) {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  if (config.mockPayments) {
    app.get('/mock-pay/:paymentId', async (req, res) => {
      const paymentId = req.params.paymentId;
      const order = getOrderByPaymentId(paymentId);

      if (!order) {
        return res.status(404).send('Order not found');
      }

      if (order.status !== 'paid') {
        markOrderPaid(order.id);
        await notifyUserPaid(bot, order.id);
      }

      res.send(
        `<html><body style="font-family:sans-serif;padding:2rem">
          <h1>Mock payment complete</h1>
          <p>Order #${order.id} is now marked as paid.</p>
          <p>You can close this tab and return to Telegram.</p>
        </body></html>`
      );
    });
  }

  app.post(
    '/webhook/nowpayments',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        const rawBody = req.body.toString('utf8');
        const signature = req.headers['x-nowpayments-sig'];

        if (!verifyNowPaymentsSignature(rawBody, signature)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }

        const payload = JSON.parse(rawBody);
        const paymentStatus = payload.payment_status;
        const paymentId = String(payload.payment_id || payload.invoice_id || '');

        if (!isPaidStatus(paymentStatus)) {
          return res.json({ ok: true, ignored: true });
        }

        let order = paymentId ? getOrderByPaymentId(paymentId) : null;

        if (!order && payload.order_id) {
          order = getOrderById(Number(payload.order_id));
        }

        if (!order) {
          return res.json({ ok: true, missing_order: true });
        }

        if (order.status !== 'paid') {
          markOrderPaid(order.id);
          await notifyUserPaid(bot, order.id);
        }

        return res.json({ ok: true });
      } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
      }
    }
  );

  return app;
}

async function notifyUserPaid(bot, orderId) {
  const order = getOrderById(orderId);

  if (!order) {
    return;
  }

  try {
    await bot.telegram.sendMessage(order.user_id, formatPaidNotification(order));
  } catch (error) {
    console.error(`Failed to notify user ${order.user_id}:`, error.message);
  }
}

export function startWebhookServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(config.port, () => {
      console.log(`Webhook server listening on port ${config.port}`);
      resolve(server);
    });
  });
}
