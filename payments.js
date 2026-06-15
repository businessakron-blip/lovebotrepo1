import crypto from 'crypto';
import { config } from './config.js';
import {
  createOrder,
  getServiceById,
  updateOrderPayment,
} from './db.js';

const NOWPAYMENTS_API = 'https://api.nowpayments.io/v1';

async function nowPaymentsRequest(path, options = {}) {
  const response = await fetch(`${NOWPAYMENTS_API}${path}`, {
    ...options,
    headers: {
      'x-api-key': config.nowPaymentsApiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body.message || body.error || response.statusText;
    throw new Error(`NOWPayments error: ${message}`);
  }

  return body;
}

function buildMockPayment(orderId, amountUsd) {
  const paymentId = `mock_${orderId}_${Date.now()}`;
  return {
    invoiceId: paymentId,
    paymentId,
    paymentUrl: `${config.webhookBaseUrl}/mock-pay/${paymentId}`,
    payAddress: 'bc1qmockaddress000000000000000000000',
    payAmount: Number((amountUsd * 0.000015).toFixed(8)),
    payCurrency: config.payCurrency,
  };
}

export async function createPaymentInvoice({ userId, username, serviceId }) {
  const service = getServiceById(serviceId);

  if (!service || !service.active) {
    throw new Error('Service not found or inactive');
  }

  const orderId = createOrder({
    userId,
    username,
    serviceId,
    amountUsd: service.price_usd,
  });

  let payment;

  if (config.mockPayments) {
    payment = buildMockPayment(orderId, service.price_usd);
  } else {
    const ipnCallbackUrl = `${config.webhookBaseUrl}/webhook/nowpayments`;

    const invoice = await nowPaymentsRequest('/invoice', {
      method: 'POST',
      body: JSON.stringify({
        price_amount: service.price_usd,
        price_currency: 'usd',
        pay_currency: config.payCurrency,
        order_id: String(orderId),
        order_description: `${service.name} (Order #${orderId})`,
        ipn_callback_url: ipnCallbackUrl,
        success_url: 'https://t.me',
        cancel_url: 'https://t.me',
      }),
    });

    payment = {
      invoiceId: String(invoice.id),
      paymentId: invoice.payment_id ? String(invoice.payment_id) : String(invoice.id),
      paymentUrl: invoice.invoice_url,
      payAddress: invoice.pay_address || null,
      payAmount: invoice.pay_amount || null,
      payCurrency: invoice.pay_currency || config.payCurrency,
    };
  }

  updateOrderPayment(orderId, payment);

  return {
    orderId,
    service,
    ...payment,
  };
}

export function verifyNowPaymentsSignature(rawBody, signature) {
  if (!config.nowPaymentsIpnSecret) {
    return false;
  }

  const expected = crypto
    .createHmac('sha512', config.nowPaymentsIpnSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature || '', 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export const PAID_STATUSES = new Set([
  'finished',
  'confirmed',
  'sending',
]);

export function isPaidStatus(status) {
  return PAID_STATUSES.has(String(status || '').toLowerCase());
}
