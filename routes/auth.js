const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth.js'); // Import the auth middleware
const stripe = require('stripe')('sk_test_51RAia6Q23ToESyf586UeaNTjgsVCG9jNswh5BSl7ORYGZQae1YiPldQU2cez5HyQMJe8UqaCIsHDqFLgMIyjXG3u00f6W0IgDj'); // Use environment variables for security

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      user = new User({
        name,
        email,
        password,
        isPro: false, // Initialize isPro to false
      });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        'your_secret_jwt_key',
        { expiresIn: '1h' }, // Token expires in 1 hour
        (err, token) => {
          if (err) throw err;
          res.json({ token, user: { id: user.id } }); // Include user ID in register response as well
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
      }

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        'your_secret_jwt_key',
        { expiresIn: '30d' },
        (err, token) => {
          if (err) throw err;
          res.json({ token, user: { id: user.id } });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET /api/auth/user
// @desc    Get user data by token
// @access  Private
router.get('/user', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // Exclude password
    res.json({ user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/auth/subscribe
// @desc    Toggle user's pro subscription status
// @access  Private
/* router.post('/subscribe', auth, async (req, res) => {
  try {
      const user = await User.findById(req.user.id);
      if (!user) {
          return res.status(404).json({ msg: 'User not found' });
      }

      const { paymentMethodId, amount, currency, billingDetails } = req.body;

      try {
          // 1. Create a Customer in Stripe if they don't have one
          let customer;
          if (!user.stripeCustomerId) {
              customer = await stripe.customers.create({
                  payment_method: paymentMethodId,
                  email: billingDetails.email || user.email,
                  name: billingDetails.name,
                  address: billingDetails.address,
              });
              user.stripeCustomerId = customer.id;
              await user.save();
          } else {
              customer = await stripe.customers.retrieve(user.stripeCustomerId);
              // Optionally update payment method if needed
              await stripe.customers.update(user.stripeCustomerId, {
                  payment_method: paymentMethodId,
              });
          }

          // 2. Create a Subscription in Stripe
          const subscription = await stripe.subscriptions.create({
              customer: customer.id,
              items: [
                  {
                      price_data: {
                          currency: currency,
                          product_data: {
                              name: 'Pro Subscription', // Define your product name in Stripe
                          },
                          unit_amount: amount, // Amount in cents
                          recurring: {
                              interval: 'month', // Or 'year', etc. - should match your Stripe Price
                          },
                      },
                  },
              ],
          });

          // 3. Update user's isPro status in your database
          user.isPro = true;
          user.stripeSubscriptionId = subscription.id;
          await user.save();

          res.json({ isPro: user.isPro, subscriptionId: subscription.id });

      } catch (stripeError) {
          console.error('Error creating Stripe subscription:', stripeError);
          return res.status(400).json({ msg: 'Failed to create subscription.', error: stripeError.message });
      }

  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
  }
}); */

router.post('/subscribe', async (req, res) => {
  try {
      const user = await User.findById(req.user.id);
      if (!user) {
          return res.status(404).json({ msg: 'User not found' });
      }

      const { paymentMethodId, amount, currency, billingDetails } = req.body;
      const amountInPaise = amount * 100;

      try {
          let customer;
          if (!user.stripeCustomerId) {
              customer = await stripe.customers.create({
                  payment_method: paymentMethodId,
                  email: billingDetails.email || user.email,
                  name: billingDetails.name,
                  address: billingDetails.address,
              });
              user.stripeCustomerId = customer.id;
              await user.save();
          } else {
              customer = await stripe.customers.retrieve(user.stripeCustomerId);
              // Attach the new payment method if provided
              if (paymentMethodId) {
                  await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
                  await stripe.customers.update(customer.id, {
                      default_payment_method: paymentMethodId,
                  });
              }
          }

          // Create a Payment Intent
          const paymentIntent = await stripe.paymentIntents.create({
              amount: amountInPaise,
              currency: currency.toLowerCase(),
              customer: customer.id,
              payment_method: paymentMethodId, // Specify the payment method to use
              off_session: true, // Indicates that the customer is not present in the flow
              confirm: true, // Confirm the Payment Intent immediately
              description: `One-time payment by user ${user.id}`,
          });

          if (paymentIntent.status === 'succeeded') {
              user.isPro = true;
              await user.save();
              res.json({ success: true, paymentIntentId: paymentIntent.id, isPro: user.isPro });
          } else if (paymentIntent.status === 'requires_action') {
              // Handle scenarios like 3D Secure if off_session was false
              res.json({ requiresAction: true, paymentIntentClientSecret: paymentIntent.client_secret });
          } else if (paymentIntent.status === 'requires_payment_method') {
              res.status(400).json({ msg: 'Payment failed', error: 'Payment method is required.' });
          } else {
              res.status(400).json({ msg: 'Payment failed', error: `Payment Intent status: ${paymentIntent.status}` });
          }

      } catch (stripeError) {
          console.error('Error creating Stripe Payment Intent:', stripeError);
          return res.status(400).json({ msg: 'Failed to process payment.', error: stripeError.message });
      }

  } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
  }
});


module.exports = router;