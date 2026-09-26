import { createApp } from './app';
import { config } from './config';
import { getDb } from './db/database';

const app = createApp();

// Verify database connection and schema on startup
try {
  getDb();
  console.log('✓ SQLite database initialized with WAL mode and schema integrity');
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(` StockSense API Server running at http://localhost:${config.port}`);
  console.log(` Health check: http://localhost:${config.port}/health`);
  console.log(` Base API path: http://localhost:${config.port}/api/v1`);
  console.log(`=======================================================`);
});
