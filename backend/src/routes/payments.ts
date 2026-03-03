import express from 'express';

const router = express.Router();

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { tier } = req.body;

    // Block ₹399 tier (Pro plan)
    if (tier && (tier.toLowerCase() === 'pro' || tier === '399')) {
       return res.status(403).json({ error: 'The Pro plan (₹399) is currently unavailable. Please select another plan.' });
    }

    // Mock successful checkout session for other tiers
    // In a real app, this would interact with Stripe
    res.json({ 
      id: 'cs_test_' + Math.random().toString(36).substring(7),
      url: 'http://localhost:5173/success' // Mock success URL
    });
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
