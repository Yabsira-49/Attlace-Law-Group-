const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');

// CREATE CHECKOUT SESSION (TEST VERSION - No Auth Required)
const createCheckoutSession = async (req, res) => {
  try {
    const { formSubmissionId, userId } = req.body; // Get userId from request body for testing
    
    if (!formSubmissionId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'formSubmissionId and userId are required' 
      });
    }

    const submissionQuery = await pool.query(
      'SELECT id, form_type, amount, payment_status FROM form_submissions WHERE id = $1 AND user_id = $2',
      [formSubmissionId, userId]
    );

    if (submissionQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }

    const submission = submissionQuery.rows[0];

    if (submission.payment_status === 'paid') {
      return res.status(400).json({ success: false, error: 'Already paid' });
    }

    const userQuery = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `USCIS Form ${submission.form_type}` },
          unit_amount: Math.round(parseFloat(submission.amount) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
      customer_email: userQuery.rows[0].email,
      metadata: {
        formSubmissionId: formSubmissionId.toString(),
        userId: userId.toString(),
        formType: submission.form_type
      }
    });

    await pool.query('UPDATE form_submissions SET stripe_session_id = $1 WHERE id = $2', [session.id, formSubmissionId]);

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// WEBHOOK HANDLER
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const formSubmissionId = session.metadata.formSubmissionId;
      const amountPaid = session.amount_total / 100;
      await pool.query(
        'UPDATE form_submissions SET payment_status = $1, amount_paid = $2, paid_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['paid', amountPaid, formSubmissionId]
      );
      console.log('✅ Payment completed for submission:', formSubmissionId);
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// GET PAYMENT STATUS (TEST VERSION)
const getPaymentStatus = async (req, res) => {
  try {
    const { formSubmissionId } = req.params;
    const { userId } = req.body; // Get from body for testing
    const result = await pool.query(
      'SELECT payment_status, amount_paid, paid_at FROM form_submissions WHERE id = $1 AND user_id = $2',
      [formSubmissionId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, payment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// VERIFY PAYMENT (TEST VERSION)
const verifyPayment = async (req, res) => {
  try {
    const { formSubmissionId } = req.params;
    const { userId } = req.body; // Get from body for testing
    const result = await pool.query(
      'SELECT payment_status FROM form_submissions WHERE id = $1 AND user_id = $2 AND payment_status = $3',
      [formSubmissionId, userId, 'paid']
    );
    res.json({ success: true, verified: result.rows.length > 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// EXPORTS
module.exports = {
  createCheckoutSession,
  handleWebhook,
  getPaymentStatus,
  verifyPayment
};
