// tests/integration/auth.test.js - Authentication integration tests
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');

describe('Authentication Endpoints', () => {
  describe('POST /api/users/register', () => {
    test('should register a new user', async () => {
      const userData = {
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully. Please check your email for verification link.');
      
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.name).toBe(userData.name);
      expect(user.isVerified).toBe(false);
    });

    test('should not register user with existing email', async () => {
      const userData = {
        name: 'John Doe',
        username: 'johndoe',
        email: 'existing@example.com',
        password: 'password123'
      };

      // Create user first
      await new User(userData).save();

      // Try to register with same email
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...userData,
          username: 'differentusername'
        })
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('required');
    });
  });

  describe('POST /api/users/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await new User({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        isVerified: true
      }).save();
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.password).toBeUndefined();
    });

    test('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid');
    });

    test('should not login unverified user', async () => {
      const unverifiedUser = await new User({
        name: 'Unverified User',
        username: 'unverified',
        email: 'unverified@example.com',
        password: 'password123',
        isVerified: false
      }).save();

      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'unverified@example.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body.message).toContain('verify');
    });
  });
});
