// tests/performance/load.test.js - Performance tests
const request = require('supertest');
const app = require('../../server');

describe('Performance Tests', () => {
  test('should handle concurrent requests', async () => {
    const promises = [];
    const numRequests = 50;

    for (let i = 0; i < numRequests; i++) {
      promises.push(
        request(app)
          .get('/api/activities')
          .expect(200)
      );
    }

    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;

    console.log(`${numRequests} concurrent requests completed in ${duration}ms`);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('should respond quickly to health check', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/')
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should respond within 100ms
  });
});