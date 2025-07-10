// tests/unit/models/Booking.test.js - Booking model tests
const Booking = require('../../../models/Booking');
const User = require('../../../models/User');

describe('Booking Model', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await new User({
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    }).save();
  });

  test('should create a valid booking', async () => {
    const bookingData = {
      user: testUser._id,
      category: 'activity',
      status: 'pending',
      paymentDetails: {
        totalAmount: 100,
        amountPaid: 0,
        remainingBalance: 100,
        paymentMethod: 'card'
      }
    };

    const booking = new Booking(bookingData);
    const savedBooking = await booking.save();

    expect(savedBooking._id).toBeDefined();
    expect(savedBooking.user).toEqual(testUser._id);
    expect(savedBooking.category).toBe('activity');
    expect(savedBooking.status).toBe('pending');
    expect(savedBooking.paymentDetails.totalAmount).toBe(100);
  });

  test('should require user field', async () => {
    const booking = new Booking({
      category: 'activity',
      status: 'pending'
    });

    let error;
    try {
      await booking.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.user).toBeDefined();
  });

  test('should validate category enum', async () => {
    const booking = new Booking({
      user: testUser._id,
      category: 'invalid_category',
      status: 'pending'
    });

    let error;
    try {
      await booking.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.category).toBeDefined();
  });
});