# Payment Gateway - API Test Collection

This document contains all API test cases in a format that can be easily imported into Postman or used with curl.

## Environment Variables

Set these variables in Postman or export them in your terminal:

```bash
export API_URL=http://localhost:8000
export API_KEY=key_test_abc123
export API_SECRET=secret_test_xyz789
```

## Test Cases

### 1. Health Check

**Request:**
```http
GET {{API_URL}}/health
```

**Expected Response (200):**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**curl:**
```bash
curl http://localhost:8000/health
```

---

### 2. Get Test Merchant

**Request:**
```http
GET {{API_URL}}/api/v1/test/merchant
```

**Expected Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "test@example.com",
  "api_key": "key_test_abc123",
  "seeded": true
}
```

**curl:**
```bash
curl http://localhost:8000/api/v1/test/merchant
```

---

### 3. Create Order - Success

**Request:**
```http
POST {{API_URL}}/api/v1/orders
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
Content-Type: application/json

{
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_001",
  "notes": {
    "customer_name": "John Doe"
  }
}
```

**Expected Response (201):**
```json
{
  "id": "order_XYZ...",
  "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_001",
  "notes": {
    "customer_name": "John Doe"
  },
  "status": "created",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**curl:**
```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000, "currency": "INR", "receipt": "receipt_001"}'
```

---

### 4. Create Order - Invalid Amount

**Request:**
```http
POST {{API_URL}}/api/v1/orders
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
Content-Type: application/json

{
  "amount": 50,
  "currency": "INR"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "BAD_REQUEST_ERROR",
    "description": "amount must be at least 100"
  }
}
```

**curl:**
```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50, "currency": "INR"}'
```

---

### 5. Create Order - Invalid Auth

**Request:**
```http
POST {{API_URL}}/api/v1/orders
X-Api-Key: invalid_key
X-Api-Secret: invalid_secret
Content-Type: application/json

{
  "amount": 50000,
  "currency": "INR"
}
```

**Expected Response (401):**
```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "description": "Invalid API credentials"
  }
}
```

**curl:**
```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "X-Api-Key: invalid_key" \
  -H "X-Api-Secret: invalid_secret" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50000}'
```

---

### 6. Get Order - Success

**Request:**
```http
GET {{API_URL}}/api/v1/orders/{{ORDER_ID}}
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
```

**Expected Response (200):**
```json
{
  "id": "order_XYZ...",
  "merchant_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_001",
  "notes": {},
  "status": "created",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**curl:**
```bash
curl http://localhost:8000/api/v1/orders/order_XYZ \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

---

### 7. Get Order - Not Found

**Request:**
```http
GET {{API_URL}}/api/v1/orders/order_invalid123
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
```

**Expected Response (404):**
```json
{
  "error": {
    "code": "NOT_FOUND_ERROR",
    "description": "Order not found"
  }
}
```

**curl:**
```bash
curl http://localhost:8000/api/v1/orders/order_invalid123 \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

---

### 8. Create UPI Payment - Success

**Request:**
```http
POST {{API_URL}}/api/v1/payments
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
Content-Type: application/json

{
  "order_id": "{{ORDER_ID}}",
  "method": "upi",
  "vpa": "test@paytm"
}
```

**Expected Response (201):**
```json
{
  "id": "pay_ABC...",
  "order_id": "order_XYZ...",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "test@paytm",
  "status": "processing",
  "created_at": "2024-01-15T10:31:00Z"
}
```

**curl:**
```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "order_XYZ", "method": "upi", "vpa": "test@paytm"}'
```

---

### 9. Create UPI Payment - Invalid VPA

**Request:**
```http
POST {{API_URL}}/api/v1/payments
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
Content-Type: application/json

{
  "order_id": "{{ORDER_ID}}",
  "method": "upi",
  "vpa": "invalid vpa"
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_VPA",
    "description": "Invalid VPA format"
  }
}
```

**curl:**
```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "order_XYZ", "method": "upi", "vpa": "invalid vpa"}'
```

---

### 10. Create Card Payment - Success (Visa)

**Request:**
```http
POST {{API_URL}}/api/v1/payments
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
Content-Type: application/json

{
  "order_id": "{{ORDER_ID}}",
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

**Expected Response (201):**
```json
{
  "id": "pay_ABC...",
  "order_id": "order_XYZ...",
  "amount": 50000,
  "currency": "INR",
  "method": "card",
  "card_network": "visa",
  "card_last4": "1111",
  "status": "processing",
  "created_at": "2024-01-15T10:31:00Z"
}
```

**curl:**
```bash
curl -X POST http://localhost:8000/api/v1/payments \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "order_XYZ",
    "method": "card",
    "card": {
      "number": "4111111111111111",
      "expiry_month": "12",
      "expiry_year": "2025",
      "cvv": "123",
      "holder_name": "John Doe"
    }
  }'
```

---

### 11. Create Card Payment - Mastercard

**Request:**
```http
POST {{API_URL}}/api/v1/payments
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
Content-Type: application/json

{
  "order_id": "{{ORDER_ID}}",
  "method": "card",
  "card": {
    "number": "5555555555554444",
    "expiry_month": "12",
    "expiry_year": "2025",
    "cvv": "123",
    "holder_name": "John Doe"
  }
}
```

**Expected Response (201):**
```json
{
  "id": "pay_ABC...",
  "order_id": "order_XYZ...",
  "amount": 50000,
  "currency": "INR",
  "method": "card",
  "card_network": "mastercard",
  "card_last4": "4444",
  "status": "processing",
  "created_at": "2024-01-15T10:31:00Z"
}
```

---

### 12. Create Card Payment - Invalid Card Number

**Request:**
```http
POST {{API_URL}}/api/v1/payments
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
Content-Type: application/json

{
  "order_id": "{{ORDER_ID}}",
  "method": "card",
  "card": {
    "number": "1234567890123456",
    "expiry_month": "12",
    "expiry_year": "2025",
    "cvv": "123",
    "holder_name": "John Doe"
  }
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "INVALID_CARD",
    "description": "Card validation failed"
  }
}
```

---

### 13. Create Card Payment - Expired Card

**Request:**
```http
POST {{API_URL}}/api/v1/payments
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
Content-Type: application/json

{
  "order_id": "{{ORDER_ID}}",
  "method": "card",
  "card": {
    "number": "4111111111111111",
    "expiry_month": "01",
    "expiry_year": "2020",
    "cvv": "123",
    "holder_name": "John Doe"
  }
}
```

**Expected Response (400):**
```json
{
  "error": {
    "code": "EXPIRED_CARD",
    "description": "Card expiry date invalid"
  }
}
```

---

### 14. Get Payment - Processing

**Request:**
```http
GET {{API_URL}}/api/v1/payments/{{PAYMENT_ID}}
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
```

**Expected Response (200) - Immediately after creation:**
```json
{
  "id": "pay_ABC...",
  "order_id": "order_XYZ...",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "test@paytm",
  "status": "processing",
  "created_at": "2024-01-15T10:31:00Z",
  "updated_at": "2024-01-15T10:31:00Z"
}
```

**curl:**
```bash
curl http://localhost:8000/api/v1/payments/pay_ABC \
  -H "X-Api-Key: key_test_abc123" \
  -H "X-Api-Secret: secret_test_xyz789"
```

---

### 15. Get Payment - Success

**Request:**
```http
GET {{API_URL}}/api/v1/payments/{{PAYMENT_ID}}
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
```

**Expected Response (200) - After 5-10 seconds:**
```json
{
  "id": "pay_ABC...",
  "order_id": "order_XYZ...",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "test@paytm",
  "status": "success",
  "created_at": "2024-01-15T10:31:00Z",
  "updated_at": "2024-01-15T10:31:10Z"
}
```

---

### 16. Get Payment - Failed

**Request:**
```http
GET {{API_URL}}/api/v1/payments/{{PAYMENT_ID}}
X-Api-Key: {{API_KEY}}
X-Api-Secret: {{API_SECRET}}
```

**Expected Response (200) - If payment failed:**
```json
{
  "id": "pay_ABC...",
  "order_id": "order_XYZ...",
  "amount": 50000,
  "currency": "INR",
  "method": "upi",
  "vpa": "test@paytm",
  "status": "failed",
  "error_code": "PAYMENT_FAILED",
  "error_description": "Payment could not be processed",
  "created_at": "2024-01-15T10:31:00Z",
  "updated_at": "2024-01-15T10:31:10Z"
}
```

---

## Test Cards

### Valid Test Cards

**Visa:**
- Number: 4111111111111111
- Network: visa

**Mastercard:**
- Number: 5555555555554444
- Network: mastercard

**Amex:**
- Number: 378282246310005
- Network: amex

**RuPay:**
- Number: 6076260000000000
- Network: rupay

### Invalid Test Cards

**Fails Luhn Check:**
- 1234567890123456
- 0000000000000000

**Expired:**
- Any card with expiry_year < current year
- Any card with same year but expiry_month < current month

---

## Postman Collection JSON

You can import this JSON into Postman:

```json
{
  "info": {
    "name": "Payment Gateway API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "API_URL",
      "value": "http://localhost:8000"
    },
    {
      "key": "API_KEY",
      "value": "key_test_abc123"
    },
    {
      "key": "API_SECRET",
      "value": "secret_test_xyz789"
    }
  ]
}
```

Save the full collection to a file named `payment-gateway-postman.json` for import.
