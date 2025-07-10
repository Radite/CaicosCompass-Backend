// tests/integration/payment.test.js - Payment integration tests
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_payment_intent',
        client_secret: 'pi_test_payment_intent_secret',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_payment_intent',
        status: 'succeeded',
        amount: 10000,
        currency: 'usd'
      })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test_refund',
        amount: 10000,
        status: 'succeeded'
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent',
            amount: 10000,
            metadata: {
              userId: 'test_user_id',
              bookingType: 'activity'
            }
          }
        }
      })
    }
  }));
});

describe('Payment Endpoints', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = await new User({
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      isVerified: true
    }).save();

    authToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/payments/create-payment-intent', () => {
    test('should create payment intent', async () => {
      const paymentData = {
        amount: 100,
        currency: 'usd',
        metadata: {
          bookingType: 'activity',
          serviceId: 'test_service_id'
        }
      };

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.clientSecret).toBeDefined();
      expect(response.body.paymentIntentId).toBeDefined();
    });

    test('should require authentication', async () => {
      await request(app)
        .post('/api/payments/create-payment-intent')
        .send({ amount: 100 })
        .expect(401);
    });

    test('should validate amount', async () => {
      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -10 })
        .expect(400);

      expect(response.body.error).toContain('positive');
    });
  });

  describe('POST /api/payments/confirm-payment', () => {
    test('should confirm payment and create booking', async () => {
      const confirmData = {
        paymentIntentId: 'pi_test_payment_intent',
        bookingData: {
          category: 'activity',
          paymentDetails: {
            totalAmount: 100,
            paymentMethod: 'card'
          }
        }
      };

      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send(confirmData)
        .expect(201);

      expect(response.body.booking).toBeDefined();
      expect(response.body.booking.status).toBe('confirmed');
    });
  });

  describe('POST /api/payments/refund', () => {
    test('should process refund', async () => {
      const refundData = {
        paymentIntentId: 'pi_test_payment_intent',
        amount: 50,
        reason: 'requested_by_customer'
      };

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(200);

      expect(response.body.refund).toBeDefined();
      expect(response.body.message).toContain('processed successfully');
    });
  });
});
