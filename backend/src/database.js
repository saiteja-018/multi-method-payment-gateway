const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create merchants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        api_key VARCHAR(64) NOT NULL UNIQUE,
        api_secret VARCHAR(64) NOT NULL,
        webhook_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        merchant_id UUID NOT NULL REFERENCES merchants(id),
        amount INTEGER NOT NULL CHECK (amount >= 100),
        currency VARCHAR(3) DEFAULT 'INR',
        receipt VARCHAR(255),
        notes JSONB,
        status VARCHAR(20) DEFAULT 'created',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
        merchant_id UUID NOT NULL REFERENCES merchants(id),
        amount INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        method VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'processing',
        vpa VARCHAR(255),
        card_network VARCHAR(20),
        card_last4 VARCHAR(4),
        error_code VARCHAR(50),
        error_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)
    `);

    // Seed test merchant
    await client.query(`
      INSERT INTO merchants (id, name, email, api_key, api_secret, is_active, created_at, updated_at)
      VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'Test Merchant',
        'test@example.com',
        'key_test_abc123',
        'secret_test_xyz789',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
