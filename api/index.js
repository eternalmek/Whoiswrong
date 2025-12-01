let app;
try {
  app = require('../src/server');
} catch (error) {
  console.error('Failed to initialize Express app:', error);
  throw error;
}

module.exports = app;
