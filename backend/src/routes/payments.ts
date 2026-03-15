import express from 'express';
import Stripe from 'stripe';
import { setResponseMeta } from '../middleware/responseMeta';

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

router.post('/create-checkout-session', async (req, res) => {
  try {
    setResponseMeta(res, { data_source: 'payments:stripe', quality_status: 'ok' });
    const { tier } = req.body;
    if (!stripe) {
      setResponseMeta(res, { data_source: 'payments:stripe', quality_status: 'unavailable' });
      res.status(503).json({ error: 'Stripe is not configured on this server.' });
      return;
    }

    const normalizedTier = String(tier ?? 'starter').trim().toLowerCase();
    const priceMap: Record<string, string | undefined> = {
      starter: process.env.STRIPE_PRICE_STARTER,
      growth: process.env.STRIPE_PRICE_GROWTH,
      premium: process.env.STRIPE_PRICE_PREMIUM,
      pro: process.env.STRIPE_PRICE_PRO,
    };

    const priceId = priceMap[normalizedTier];
    if (!priceId) {
      res.status(400).json({ error: `Stripe price not configured for tier '${normalizedTier}'` });
      return;
    }

    const successUrl = process.env.PAYMENT_SUCCESS_URL ?? 'http://localhost:5173/success';
    const cancelUrl = process.env.PAYMENT_CANCEL_URL ?? 'http://localhost:5173/settings';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    res.json({
      id: session.id,
      url: session.url,
    });
    return;
  } catch (error) {
    console.error('Payment error:', error);
    setResponseMeta(res, { data_source: 'payments:stripe', quality_status: 'unavailable' });
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
});

export default router;
