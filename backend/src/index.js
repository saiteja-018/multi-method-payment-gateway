require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initDatabase } = require('./database');
const { authenticateMerchant } = require('./middleware');
const {
  validateVPA,
  validateCardNumber,
  detectCardNetwork,
  validateExpiry,
  generateId,
} = require('./utils');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Create Order Endpoint
app.post('/api/v1/orders', authenticateMerchant, async (req, res) => {
  const { amount, currency = 'INR', receipt, notes } = req.body;
  
  // Validate amount
  if (!amount || typeof amount !== 'number' || amount < 100) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'amount must be at least 100'
      }
    });
  }
  
  try {
    // Generate unique order ID
    let orderId;
    let isUnique = false;
    while (!isUnique) {
      orderId = generateId('order_', 16);
      const checkResult = await pool.query('SELECT id FROM orders WHERE id = $1', [orderId]);
      if (checkResult.rows.length === 0) {
        isUnique = true;
      }
    }
    
    // Create order
    const result = await pool.query(
      `INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'created', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [orderId, req.merchant.id, amount, currency, receipt || null, notes ? JSON.stringify(notes) : null]
    );
    
    const order = result.rows[0];
    
    res.status(201).json({
      id: order.id,
      merchant_id: order.merchant_id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes || {},
      status: order.status,
      created_at: order.created_at.toISOString()
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Get Order Endpoint
app.get('/api/v1/orders/:order_id', authenticateMerchant, async (req, res) => {
  const { order_id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND merchant_id = $2',
      [order_id, req.merchant.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }
    
    const order = result.rows[0];
    
    res.status(200).json({
      id: order.id,
      merchant_id: order.merchant_id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes || {},
      status: order.status,
      created_at: order.created_at.toISOString(),
      updated_at: order.updated_at.toISOString()
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Create Payment Endpoint
app.post('/api/v1/payments', authenticateMerchant, async (req, res) => {
  const { order_id, method, vpa, card } = req.body;
  
  try {
    // Verify order exists and belongs to merchant
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND merchant_id = $2',
      [order_id, req.merchant.id]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Order not found or does not belong to merchant'
        }
      });
    }
    
    const order = orderResult.rows[0];
    
    // Validate payment method
    let cardNetwork = null;
    let cardLast4 = null;
    let vpaValue = null;
    
    if (method === 'upi') {
      if (!vpa || !validateVPA(vpa)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VPA',
            description: 'Invalid VPA format'
          }
        });
      }
      vpaValue = vpa;
    } else if (method === 'card') {
      if (!card || !card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.holder_name) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'Invalid card details'
          }
        });
      }
      
      // Validate card number using Luhn algorithm
      if (!validateCardNumber(card.number)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CARD',
            description: 'Card validation failed'
          }
        });
      }
      
      // Validate expiry date
      if (!validateExpiry(card.expiry_month, card.expiry_year)) {
        return res.status(400).json({
          error: {
            code: 'EXPIRED_CARD',
            description: 'Card expiry date invalid'
          }
        });
      }
      
      // Detect card network
      cardNetwork = detectCardNetwork(card.number);
      
      // Store only last 4 digits
      const cleaned = card.number.replace(/[\s-]/g, '');
      cardLast4 = cleaned.slice(-4);
    } else {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Invalid payment method'
        }
      });
    }
    
    // Generate unique payment ID
    let paymentId;
    let isUnique = false;
    while (!isUnique) {
      paymentId = generateId('pay_', 16);
      const checkResult = await pool.query('SELECT id FROM payments WHERE id = $1', [paymentId]);
      if (checkResult.rows.length === 0) {
        isUnique = true;
      }
    }
    
    // Create payment with 'processing' status immediately
    const paymentResult = await pool.query(
      `INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [paymentId, order_id, req.merchant.id, order.amount, order.currency, method, vpaValue, cardNetwork, cardLast4]
    );
    
    const payment = paymentResult.rows[0];
    
    // Return immediate response with processing status
    const response = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: 'processing',
      created_at: payment.created_at.toISOString()
    };
    
    if (method === 'upi') {
      response.vpa = payment.vpa;
    } else if (method === 'card') {
      response.card_network = payment.card_network;
      response.card_last4 = payment.card_last4;
    }
    
    res.status(201).json(response);
    
    // Process payment asynchronously
    processPaymentAsync(paymentId, method);
    
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Async payment processing
async function processPaymentAsync(paymentId, method) {
  try {
    // Determine processing delay
    let delay;
    if (process.env.TEST_MODE === 'true') {
      delay = parseInt(process.env.TEST_PROCESSING_DELAY) || 1000;
    } else {
      const minDelay = parseInt(process.env.PROCESSING_DELAY_MIN) || 5000;
      const maxDelay = parseInt(process.env.PROCESSING_DELAY_MAX) || 10000;
      delay = minDelay + Math.random() * (maxDelay - minDelay);
    }
    
    // Wait for processing delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Determine success/failure
    let isSuccess;
    if (process.env.TEST_MODE === 'true') {
      isSuccess = process.env.TEST_PAYMENT_SUCCESS !== 'false';
    } else {
      const successRate = method === 'upi' 
        ? parseFloat(process.env.UPI_SUCCESS_RATE) || 0.90
        : parseFloat(process.env.CARD_SUCCESS_RATE) || 0.95;
      isSuccess = Math.random() < successRate;
    }
    
    // Update payment status
    if (isSuccess) {
      await pool.query(
        `UPDATE payments SET status = 'success', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [paymentId]
      );
    } else {
      await pool.query(
        `UPDATE payments SET status = 'failed', error_code = 'PAYMENT_FAILED', error_description = 'Payment could not be processed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [paymentId]
      );
    }
  } catch (error) {
    console.error('Error processing payment:', error);
  }
}

// Get Payment Endpoint
app.get('/api/v1/payments/:payment_id', authenticateMerchant, async (req, res) => {
  const { payment_id } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
      [payment_id, req.merchant.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Payment not found'
        }
      });
    }
    
    const payment = result.rows[0];
    
    const response = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at.toISOString(),
      updated_at: payment.updated_at.toISOString()
    };
    
    if (payment.method === 'upi') {
      response.vpa = payment.vpa;
    } else if (payment.method === 'card') {
      response.card_network = payment.card_network;
      response.card_last4 = payment.card_last4;
    }
    
    if (payment.error_code) {
      response.error_code = payment.error_code;
      response.error_description = payment.error_description;
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting payment:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Public endpoint to get order details for checkout
app.get('/api/v1/orders/:order_id/public', async (req, res) => {
  const { order_id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }
    
    const order = result.rows[0];
    
    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Public endpoint to create payment from checkout
app.post('/api/v1/payments/public', async (req, res) => {
  const { order_id, method, vpa, card } = req.body;
  
  try {
    // Verify order exists
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
    
    if (orderResult.rows.length === 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Order not found'
        }
      });
    }
    
    const order = orderResult.rows[0];
    
    // Validate payment method
    let cardNetwork = null;
    let cardLast4 = null;
    let vpaValue = null;
    
    if (method === 'upi') {
      if (!vpa || !validateVPA(vpa)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VPA',
            description: 'Invalid VPA format'
          }
        });
      }
      vpaValue = vpa;
    } else if (method === 'card') {
      if (!card || !card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.holder_name) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST_ERROR',
            description: 'Invalid card details'
          }
        });
      }
      
      if (!validateCardNumber(card.number)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CARD',
            description: 'Card validation failed'
          }
        });
      }
      
      if (!validateExpiry(card.expiry_month, card.expiry_year)) {
        return res.status(400).json({
          error: {
            code: 'EXPIRED_CARD',
            description: 'Card expiry date invalid'
          }
        });
      }
      
      cardNetwork = detectCardNetwork(card.number);
      const cleaned = card.number.replace(/[\s-]/g, '');
      cardLast4 = cleaned.slice(-4);
    } else {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Invalid payment method'
        }
      });
    }
    
    // Generate unique payment ID
    let paymentId;
    let isUnique = false;
    while (!isUnique) {
      paymentId = generateId('pay_', 16);
      const checkResult = await pool.query('SELECT id FROM payments WHERE id = $1', [paymentId]);
      if (checkResult.rows.length === 0) {
        isUnique = true;
      }
    }
    
    // Create payment with 'processing' status
    const paymentResult = await pool.query(
      `INSERT INTO payments (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [paymentId, order_id, order.merchant_id, order.amount, order.currency, method, vpaValue, cardNetwork, cardLast4]
    );
    
    const payment = paymentResult.rows[0];
    
    const response = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: 'processing',
      created_at: payment.created_at.toISOString()
    };
    
    if (method === 'upi') {
      response.vpa = payment.vpa;
    } else if (method === 'card') {
      response.card_network = payment.card_network;
      response.card_last4 = payment.card_last4;
    }
    
    res.status(201).json(response);
    
    // Process payment asynchronously
    processPaymentAsync(paymentId, method);
    
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Public endpoint to get payment status
app.get('/api/v1/payments/:payment_id/public', async (req, res) => {
  const { payment_id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [payment_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Payment not found'
        }
      });
    }
    
    const payment = result.rows[0];
    
    const response = {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at.toISOString(),
      updated_at: payment.updated_at.toISOString()
    };
    
    if (payment.method === 'upi') {
      response.vpa = payment.vpa;
    } else if (payment.method === 'card') {
      response.card_network = payment.card_network;
      response.card_last4 = payment.card_last4;
    }
    
    if (payment.error_code) {
      response.error_code = payment.error_code;
      response.error_description = payment.error_description;
    }
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting payment:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Test endpoint to verify test merchant
app.get('/api/v1/test/merchant', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, api_key FROM merchants WHERE email = $1',
      ['test@example.com']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Test merchant not found'
        }
      });
    }
    
    const merchant = result.rows[0];
    
    res.status(200).json({
      id: merchant.id,
      email: merchant.email,
      api_key: merchant.api_key,
      seeded: true
    });
  } catch (error) {
    console.error('Error getting test merchant:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Merchant login endpoint for dashboard
app.post('/api/v1/auth/login', async (req, res) => {
  const { email } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT id, name, email, api_key, api_secret FROM merchants WHERE email = $1 AND is_active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          description: 'Invalid credentials'
        }
      });
    }
    
    const merchant = result.rows[0];
    
    res.status(200).json({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      api_key: merchant.api_key,
      api_secret: merchant.api_secret
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Get dashboard stats
app.get('/api/v1/dashboard/stats', authenticateMerchant, async (req, res) => {
  try {
    // Get total transactions
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count FROM payments WHERE merchant_id = $1',
      [req.merchant.id]
    );
    const totalTransactions = parseInt(totalResult.rows[0].count);
    
    // Get total amount (successful payments only)
    const amountResult = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE merchant_id = $1 AND status = $2',
      [req.merchant.id, 'success']
    );
    const totalAmount = parseInt(amountResult.rows[0].total);
    
    // Get success rate
    const successResult = await pool.query(
      'SELECT COUNT(*) as count FROM payments WHERE merchant_id = $1 AND status = $2',
      [req.merchant.id, 'success']
    );
    const successCount = parseInt(successResult.rows[0].count);
    const successRate = totalTransactions > 0 ? ((successCount / totalTransactions) * 100).toFixed(0) : 0;
    
    res.status(200).json({
      total_transactions: totalTransactions,
      total_amount: totalAmount,
      success_rate: parseInt(successRate)
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Get transactions list
app.get('/api/v1/dashboard/transactions', authenticateMerchant, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC',
      [req.merchant.id]
    );
    
    const transactions = result.rows.map(payment => ({
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at.toISOString()
    }));
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        description: 'Internal server error'
      }
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
