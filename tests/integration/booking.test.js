// tests/integration/booking.test.js - Booking integration tests
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const Activity = require('../../models/Activity');
const jwt = require('jsonwebtoken');

describe('Booking Endpoints', () => {
  let authToken;
  let testUser;
  let testActivity;

  beforeEach(async () => {
    // Create test user
    testUser = await new User({
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      isVerified: true
    }).save();

    // Create auth token
    authToken = jwt.sign(
      { id: testUser._id },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    // Create test activity
    testActivity = await new Activity({
      name: 'Test Activity',
      description: 'A test activity',
      location: 'Test Location',
      island: 'Providenciales',
      price: 100,
      category: 'watersports',
      host: testUser._id
    }).save();
  });

  describe('POST /api/bookings', () => {
    test('should create a new booking', async () => {
      const bookingData = {
        category: 'activity',
        activity: testActivity._id,
        date: '2024-12-25',
        time: '10:00 - 12:00',
        numOfPeople: 2,
        paymentDetails: {
          totalAmount: 200,
          amountPaid: 200,
          remainingBalance: 0,
          paymentMethod: 'card'
        }
      };

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.booking._id).toBeDefined();
      expect(response.body.booking.category).toBe('activity');
      expect(response.body.booking.user).toBe(testUser._id.toString());
    });

    test('should require authentication', async () => {
      const bookingData = {
        category: 'activity',
        activity: testActivity._id
      };

      await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(401);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('required');
    });
  });

  describe('GET /api/bookings', () => {
    beforeEach(async () => {
      // Create test bookings
      await new Booking({
        user: testUser._id,
        category: 'activity',
        activity: testActivity._id,
        status: 'confirmed',
        paymentDetails: {
          totalAmount: 100,
          amountPaid: 100,
          remainingBalance: 0
        }
      }).save();

      await new Booking({
        user: testUser._id,
        category: 'activity',
        activity: testActivity._id,
        status: 'pending',
        paymentDetails: {
          totalAmount: 150,
          amountPaid: 0,
          remainingBalance: 150
        }
      }).save();
    });

    test('should get user bookings', async () => {
      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.bookings).toHaveLength(2);
      expect(response.body.bookings[0].user).toBe(testUser._id.toString());
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/bookings')
        .expect(401);
    });
  });

  describe('PUT /api/bookings/:id', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await new Booking({
        user: testUser._id,
        category: 'activity',
        activity: testActivity._id,
        status: 'pending',
        paymentDetails: {
          totalAmount: 100,
          amountPaid: 0,
          remainingBalance: 100
        }
      }).save();
    });

    test('should update booking', async () => {
      const updateData = {
        numOfPeople: 3,
        requirements: {
          specialNotes: 'Updated notes'
        }
      };

      const response = await request(app)
        .put(`/api/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.booking.numOfPeople).toBe(3);
      expect(response.body.booking.requirements.specialNotes).toBe('Updated notes');
    });

    test('should not update booking of another user', async () => {
      const otherUser = await new User({
        name: 'Other User',
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password123'
      }).save();

      const otherBooking = await new Booking({
        user: otherUser._id,
        category: 'activity',
        activity: testActivity._id,
        status: 'pending',
        paymentDetails: {
          totalAmount: 100,
          amountPaid: 0,
          remainingBalance: 100
        }
      }).save();

      await request(app)
        .put(`/api/bookings/${otherBooking._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ numOfPeople: 5 })
        .expect(403);
    });
  });
});
