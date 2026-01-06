# Multi-Method Payment Gateway

A fully functional payment gateway similar to Razorpay or Stripe, built with Node.js, React, and PostgreSQL. This system supports merchant onboarding, payment order management, multi-method payment processing (UPI and Cards), and a hosted checkout page.

## 🏗️ Architecture Overview

The system consists of four main components:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   PostgreSQL    │────▶│   API Backend    │────▶│    Dashboard    │
│   Database      │     │  (Node.js/Express)│     │   (React App)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               │
                        ┌──────────────────┐
                        │  Checkout Page   │
                        │   (React App)    │
                        └──────────────────┘
```

### Components

1. **PostgreSQL Database** (Port 5432)
   - Stores merchants, orders, and payments
   - Automatically seeded with test merchant credentials

2. **API Backend** (Port 8000)
   - RESTful API with authentication
   - Payment processing with validation
   - Supports UPI and Card payments

3. **Dashboard** (Port 3000)
   - Merchant login and authentication
   - API credentials display
   - Transaction statistics and history

4. **Checkout Page** (Port 3001)
   - Public-facing payment interface
   - Multi-method payment forms
   - Real-time payment status updates

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git (for cloning the repository)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd multi-method-payment-gateway
```

2. Copy environment file (optional - defaults are pre-configured):
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Wait for services to initialize (about 30-60 seconds)

5. Access the applications:
   - API: http://localhost:8000
   - Dashboard: http://localhost:3000
   - Checkout: http://localhost:3001

### Stopping the Application

```bash
docker-compose down
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f dashboard
docker-compose logs -f checkout
```

## 🔑 Test Credentials

A test merchant is automatically created on application startup:

- **Email**: test@example.com
- **API Key**: key_test_abc123
- **API Secret**: secret_test_xyz789
- **Merchant ID**: 550e8400-e29b-41d4-a716-446655440000

Use these credentials to:
1. Log into the dashboard at http://localhost:3000/login
2. Make API calls for creating orders and payments

## 📊 Database Schema

### Merchants Table
```sql
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  api_key VARCHAR(64) NOT NULL UNIQUE,
  api_secret VARCHAR(64) NOT NULL,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id VARCHAR(64) PRIMARY KEY,  -- Format: order_XXXXXXXXXXXXXXXX
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount INTEGER NOT NULL CHECK (amount >= 100),
  currency VARCHAR(3) DEFAULT 'INR',
  receipt VARCHAR(255),
  notes JSONB,
  status VARCHAR(20) DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id VARCHAR(64) PRIMARY KEY,  -- Format: pay_XXXXXXXXXXXXXXXX
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  method VARCHAR(20) NOT NULL,  -- 'upi' or 'card'
  status VARCHAR(20) DEFAULT 'processing',  -- 'processing', 'success', 'failed'
  vpa VARCHAR(255),  -- For UPI payments
  card_network VARCHAR(20),  -- For card payments: 'visa', 'mastercard', 'amex', 'rupay'
  card_last4 VARCHAR(4),  -- Last 4 digits only
  error_code VARCHAR(50),
  error_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- `idx_orders_merchant_id` on orders(merchant_id)
- `idx_payments_order_id` on payments(order_id)
- `idx_payments_status` on payments(status)

## 🔌 API Documentation

### Base URL
```
http://localhost:8000
```

### Authentication

All protected endpoints require the following headers:
```
X-Api-Key: key_test_abc123
X-Api-Secret: secret_test_xyz789
```

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response (200)**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2. Create Order
```http
POST /api/v1/orders
Headers:
  X-Api-Key: key_test_abc123
  X-Api-Secret: secret_test_xyz789
  Content-Type: application/json

Body:
{
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_123",
  "notes": {
    "customer_name": "John Doe"
  }
}
```

**Response (201)**:
```json
{
  "id": "order_NXhj67fGH2jk9mPq",
  "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_123",
  "notes": {
    "customer_name": "John Doe"
  },
  "status": "created",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### 3. Get Order
```http
GET /api/v1/orders/{order_id}
Headers:
  X-Api-Key: key_test_abc123
  X-Api-Secret: secret_test_xyz789
```

**Response (200)**:
```json
{
  "id": "order_NXhj67fGH2jk9mPq",
  "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_123",
  "notes": {},
  "status": "created",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### 4. Create Payment (UPI)
```http
POST /api/v1/payments
Headers:
  X-Api-Key: key_test_abc123
  X-Api-Secret: secret_test_xyz789
  Content-Type: application/json

Body:
{
  "order_id": "order_NXhj67fGH2jk9mPq",
  "method": "upi",
  "vpa": "user@paytm"
}
```

**Response (201)**:
```json
{
  "id": "pay_H8sK3jD9s2L1pQr",
  "order_id": "order_NXhj67fGH2jk9mPq",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "user@paytm",
  "status": "processing",
  "created_at": "2024-01-15T10:31:00Z"
}
```

#### 5. Create Payment (Card)
```http
POST /api/v1/payments
Headers:
  X-Api-Key: key_test_abc123
  X-Api-Secret: secret_test_xyz789
  Content-Type: application/json

Body:
{
  "order_id": "order_NXhj67fGH2jk9mPq",
  "method": "card",
  "card": {
    "number": "4111111111111111",
    "expiry_month": "12",
    "expiry_year": "2025",
    "cvv": "123",
    "holder_name": "John Doe"
  }
}
```

**Response (201)**:
```json
{
  "id": "pay_H8sK3jD9s2L1pQr",
  "order_id": "order_NXhj67fGH2jk9mPq",
  "amount": 50000,
  "currency": "INR",
  "method": "card",
  "card_network": "visa",
  "card_last4": "1111",
  "status": "processing",
  "created_at": "2024-01-15T10:31:00Z"
}
```

#### 6. Get Payment
```http
GET /api/v1/payments/{payment_id}
Headers:
  X-Api-Key: key_test_abc123
  X-Api-Secret: secret_test_xyz789
```

**Response (200)**:
```json
{
  "id": "pay_H8sK3jD9s2L1pQr",
  "order_id": "order_NXhj67fGH2jk9mPq",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "user@paytm",
  "status": "success",
  "created_at": "2024-01-15T10:31:00Z",
  "updated_at": "2024-01-15T10:31:10Z"
}
```

### Error Codes

- `AUTHENTICATION_ERROR` - Invalid API credentials
- `BAD_REQUEST_ERROR` - Validation errors
- `NOT_FOUND_ERROR` - Resource not found
- `PAYMENT_FAILED` - Payment processing failed
- `INVALID_VPA` - VPA format invalid
- `INVALID_CARD` - Card validation failed
- `EXPIRED_CARD` - Card expiry date invalid

## 💳 Payment Validation

### UPI Validation
- Pattern: `^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$`
- Examples: `user@paytm`, `john.doe@okhdfcbank`, `user_123@phonepe`

### Card Validation

#### Luhn Algorithm
All card numbers are validated using the Luhn algorithm to ensure validity.

#### Card Network Detection
- **Visa**: Starts with 4
- **Mastercard**: Starts with 51-55
- **Amex**: Starts with 34 or 37
- **RuPay**: Starts with 60, 65, or 81-89

#### Test Cards
```
Visa: 4111111111111111
Mastercard: 5555555555554444
Amex: 378282246310005
RuPay: 6076260000000000
```

### Expiry Date Validation
- Must be in future (month/year)
- Accepts both 2-digit (25) and 4-digit (2025) year formats

## 🎯 Features

### Security
- ✅ API key/secret authentication
- ✅ Never stores full card numbers or CVV
- ✅ Only last 4 digits of cards stored
- ✅ VPA and card validation

### Payment Processing
- ✅ Simulated payment processing (5-10 seconds)
- ✅ 90% success rate for UPI
- ✅ 95% success rate for Card
- ✅ Real-time status updates

### Dashboard
- ✅ Merchant login
- ✅ API credentials display
- ✅ Transaction statistics
- ✅ Transaction history with filters

### Checkout Page
- ✅ Order details display
- ✅ Payment method selection
- ✅ UPI and Card payment forms
- ✅ Real-time payment status
- ✅ Success/failure handling

## 🧪 Testing

### Test the API with cURL

1. **Create an Order**:
```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_001"
  }'
```

2. **Create UPI Payment**:
```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_XXXXXXXXXXXXXXXX",
    "method": "upi",
    "vpa": "test@paytm"
  }'
```

3. **Check Payment Status**:
```bash
curl http://localhost:8000/api/v1/payments/pay_XXXXXXXXXXXXXXXX \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

### Test the Checkout Flow

1. Create an order using the API
2. Navigate to: `http://localhost:3001/checkout?order_id=order_XXXXXXXXXXXXXXXX`
3. Select payment method (UPI or Card)
4. Enter payment details
5. Click "Pay" and wait for processing
6. View success/failure result

### Test the Dashboard

1. Navigate to: http://localhost:3000/login
2. Enter email: test@example.com
3. Enter any password (validation not required)
4. View dashboard with API credentials and stats
5. Navigate to Transactions page to see payment history

## 🔧 Configuration

### Environment Variables

Create a `.env` file (or modify `.env.example`) to customize:

```env
# Database
DATABASE_URL=postgresql://gateway_user:gateway_pass@postgres:5432/payment_gateway

# Server
PORT=8000

# Test Merchant
TEST_MERCHANT_EMAIL=test@example.com
TEST_API_KEY=key_test_abc123
TEST_API_SECRET=secret_test_xyz789

# Payment Simulation
UPI_SUCCESS_RATE=0.90
CARD_SUCCESS_RATE=0.95
PROCESSING_DELAY_MIN=5000
PROCESSING_DELAY_MAX=10000

# Test Mode (for automated testing)
TEST_MODE=false
TEST_PAYMENT_SUCCESS=true
TEST_PROCESSING_DELAY=1000
```

## 📁 Project Structure

```
multi-method-payment-gateway/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js              # Main application
│       ├── database.js           # Database setup & seeding
│       ├── middleware.js         # Authentication middleware
│       └── utils.js              # Validation utilities
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── index.js
│       └── pages/
│           ├── Login.js          # Login page
│           ├── Dashboard.js      # Dashboard home
│           └── Transactions.js   # Transaction history
└── checkout-page/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.js
        ├── index.js
        └── pages/
            └── Checkout.js       # Checkout page
```

## 🧪 Automated Testing

### Running E2E Tests

The project includes comprehensive end-to-end tests using **Playwright** (automated browser testing like Comet/Selenium).

**Quick Start:**

```powershell
# Run all tests (30 tests in 3-4 minutes)
npx playwright test

# Run with visible browser
npx playwright test --headed

# View HTML report with screenshots
npx playwright show-report
```

**What Gets Tested:**

✅ **API Endpoints** (12 tests) - Health check, orders, payments, authentication  
✅ **Dashboard UI** (5 tests) - Login, credentials, stats, transactions  
✅ **Checkout Flow** (7 tests) - Order display, UPI/Card payments, validation  
✅ **Payment Validation** (6 tests) - Luhn algorithm, VPA format, expiry, errors

**Test Coverage:**
- Complete payment flows (UPI & Card)
- Input validation and error handling
- Authentication and authorization
- Real-time payment processing
- Success/Error state handling

**Detailed Documentation:**
- [TEST_PROMPT.md](TEST_PROMPT.md) - Complete testing guide
- [e2e-tests/README.md](e2e-tests/README.md) - Technical details
- [TESTING_QUICK_REF.txt](TESTING_QUICK_REF.txt) - Quick reference

**Automated Feedback:**
- Real-time console output with pass/fail status
- HTML report with screenshots and videos
- Execution traces for debugging
- Performance metrics

## 🐛 Troubleshooting

### Services not starting

1. Check if ports are already in use:
```bash
netstat -ano | findstr "8000 3000 3001 5432"
```

2. Stop conflicting services or change ports in docker-compose.yml

### Database connection errors

1. Wait for database to be fully initialized (30-60 seconds)
2. Check logs: `docker-compose logs postgres`
3. Restart services: `docker-compose restart api`

### Frontend not loading

1. Check if containers are running: `docker ps`
2. View logs: `docker-compose logs dashboard` or `docker-compose logs checkout`
3. Rebuild containers: `docker-compose up -d --build`

### Tests failing

1. Ensure all containers are running: `docker-compose ps`
2. Verify API health: `curl http://localhost:8000/health`
3. Reinstall Playwright: `npx playwright install --force`
4. Check detailed report: `npx playwright show-report`

## 🚀 Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React, React Router
- **Database**: PostgreSQL 15
- **Containerization**: Docker, Docker Compose
- **Web Server**: Nginx (for serving React apps)

## 📄 License

This project is for educational purposes.

## 👥 Contributors

Built as part of the Payment Gateway project requirements.
