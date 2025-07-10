// tests/integration/admin.test.js - Admin integration tests
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const jwt = require('jsonwebtoken');

describe('Admin Endpoints', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let regularUser;

  beforeEach(async () => {
    // Create admin user
    adminUser = await new User({
      name: 'Admin User',
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true
    }).save();

    // Create regular user
    regularUser = await new User({
      name: 'Regular User',
      username: 'user',
      email: 'user@example.com',
      password: 'user123',
      role: 'user',
      isVerified: true
    }).save();

    // Create tokens
    adminToken = jwt.sign(
      { id: adminUser._id },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { id: regularUser._id },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/admin/dashboard-stats', () => {
    beforeEach(async () => {
      // Create test bookings
      await new Booking({
        user: regularUser._id,
        category: 'activity',
        status: 'confirmed',
        paymentDetails: {
          totalAmount: 100,
          amountPaid: 100,
          remainingBalance: 0
        }
      }).save();
    });

    test('should get dashboard stats for admin', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.totalUsers).toBeDefined();
      expect(response.body.totalBookings).toBeDefined();
      expect(response.body.totalRevenue).toBeDefined();
    });

    test('should deny access to regular users', async () => {
      await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/admin/dashboard-stats')
        .expect(401);
    });
  });

  describe('GET /api/admin/users', () => {
    test('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.total).toBeDefined();
    });

    test('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=Regular')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(response.body.users.some(user => user.name.includes('Regular'))).toBe(true);
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    test('should update user role', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'business-manager' })
        .expect(200);

      expect(response.body.user.role).toBe('business-manager');
    });

    test('should validate role', async () => {
      await request(app)
        .put(`/api/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid-role' })
        .expect(400);
    });
  });
});