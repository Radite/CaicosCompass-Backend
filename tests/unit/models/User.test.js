// tests/unit/models/User.test.js - User model tests
const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('User creation', () => {
    test('should create a valid user', async () => {
      const userData = {
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.role).toBe('user'); // Default role
      expect(savedUser.isVerified).toBe(false); // Default verification
    });

    test('should hash password before saving', async () => {
      const password = 'plainTextPassword';
      const user = new User({
        name: 'Jane Doe',
        username: 'janedoe',
        email: 'jane@example.com',
        password
      });

      await user.save();
      
      expect(user.password).not.toBe(password);
      expect(await bcrypt.compare(password, user.password)).toBe(true);
    });

    test('should require required fields', async () => {
      const user = new User({});
      
      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.username).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    test('should enforce unique email', async () => {
      const userData = {
        name: 'User One',
        username: 'userone',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      await new User(userData).save();

      const duplicateUser = new User({
        ...userData,
        username: 'usertwo',
        name: 'User Two'
      });

      let error;
      try {
        await duplicateUser.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });
  });

  describe('User methods', () => {
    test('should validate correct password', async () => {
      const password = 'testPassword123';
      const user = new User({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password
      });

      await user.save();
      
      const isValid = await bcrypt.compare(password, user.password);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const user = new User({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'correctPassword'
      });

      await user.save();
      
      const isValid = await bcrypt.compare('wrongPassword', user.password);
      expect(isValid).toBe(false);
    });
  });
});