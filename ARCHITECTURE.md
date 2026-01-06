# System Architecture - Payment Gateway

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT GATEWAY SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────────┘

                               EXTERNAL USERS
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
            │  Merchant    │  │  Customer    │  │   API        │
            │  Dashboard   │  │  Checkout    │  │   Client     │
            │  (Port 3000) │  │  (Port 3001) │  │              │
            └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                   │                 │                  │
                   │                 │                  │
                   └─────────────────┼──────────────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │    API Gateway      │
                          │   (Port 8000)       │
                          │  Node.js/Express    │
                          └──────────┬──────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
            ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
            │   Order     │  │   Payment   │  │    Auth     │
            │   Service   │  │   Service   │  │  Middleware │
            └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
                   │                │                 │
                   └────────────────┼─────────────────┘
                                    │
                                    ▼
                          ┌─────────────────────┐
                          │    PostgreSQL       │
                          │    Database         │
                          │   (Port 5432)       │
                          │                     │
                          │  ┌───────────────┐  │
                          │  │  merchants    │  │
                          │  │  orders       │  │
                          │  │  payments     │  │
                          │  └───────────────┘  │
                          └─────────────────────┘

                          ALL SERVICES IN DOCKER
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER (React)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐        │
│  │   Dashboard (Port 3000)     │    │   Checkout (Port 3001)      │        │
│  ├─────────────────────────────┤    ├─────────────────────────────┤        │
│  │  • Login.js                 │    │  • Checkout.js              │        │
│  │  • Dashboard.js             │    │    - Order Summary          │        │
│  │  • Transactions.js          │    │    - Payment Methods        │        │
│  │                             │    │    - UPI Form               │        │
│  │  Features:                  │    │    - Card Form              │        │
│  │  - API Key Display          │    │    - Processing State       │        │
│  │  - Transaction Stats        │    │    - Success/Error States   │        │
│  │  - Transaction History      │    │                             │        │
│  └─────────────────────────────┘    └─────────────────────────────┘        │
│                                                                               │
│                  Served by Nginx in Docker Containers                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       API LAYER (Node.js/Express)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                    Controllers Layer                           │          │
│  ├───────────────────────────────────────────────────────────────┤          │
│  │  • HealthController    → GET /health                          │          │
│  │  • OrderController     → POST/GET /api/v1/orders              │          │
│  │  • PaymentController   → POST/GET /api/v1/payments            │          │
│  │  • DashboardController → GET /api/v1/dashboard/*              │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                              │                                                │
│                              ▼                                                │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                    Middleware Layer                            │          │
│  ├───────────────────────────────────────────────────────────────┤          │
│  │  • Authentication (API Key + Secret validation)               │          │
│  │  • CORS handling                                              │          │
│  │  • Request parsing (JSON body parser)                         │          │
│  │  • Error handling                                             │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                              │                                                │
│                              ▼                                                │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                    Service Layer                               │          │
│  ├───────────────────────────────────────────────────────────────┤          │
│  │  • Order Service:                                             │          │
│  │    - createOrder()                                            │          │
│  │    - getOrder()                                               │          │
│  │    - generateOrderId()                                        │          │
│  │                                                               │          │
│  │  • Payment Service:                                           │          │
│  │    - processPayment()                                         │          │
│  │    - getPayment()                                             │          │
│  │    - simulateAsyncProcessing()                                │          │
│  │                                                               │          │
│  │  • Dashboard Service:                                         │          │
│  │    - getStats()                                               │          │
│  │    - getTransactions()                                        │          │
│  │    - authenticateMerchant()                                   │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                              │                                                │
│                              ▼                                                │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                    Validation Utilities                        │          │
│  ├───────────────────────────────────────────────────────────────┤          │
│  │  • validateVPA() - UPI format validation                      │          │
│  │  • validateCardNumber() - Luhn algorithm                      │          │
│  │  • detectCardNetwork() - Visa/MC/Amex/RuPay                   │          │
│  │  • validateExpiry() - Card expiry date validation             │          │
│  │  • generateId() - Unique ID generation                        │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ SQL Queries
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER (PostgreSQL)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │   merchants         │  │      orders         │  │     payments        │ │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤ │
│  │ • id (UUID) PK      │  │ • id (string) PK    │  │ • id (string) PK    │ │
│  │ • name              │  │ • merchant_id FK    │  │ • order_id FK       │ │
│  │ • email (unique)    │  │ • amount            │  │ • merchant_id FK    │ │
│  │ • api_key (unique)  │  │ • currency          │  │ • amount            │ │
│  │ • api_secret        │  │ • receipt           │  │ • method            │ │
│  │ • webhook_url       │  │ • notes (JSON)      │  │ • status            │ │
│  │ • is_active         │  │ • status            │  │ • vpa               │ │
│  │ • created_at        │  │ • created_at        │  │ • card_network      │ │
│  │ • updated_at        │  │ • updated_at        │  │ • card_last4        │ │
│  └─────────────────────┘  └─────────────────────┘  │ • error_code        │ │
│           │                         │               │ • error_description │ │
│           │                         │               │ • created_at        │ │
│           └─────────────────────────┼───────────────┤ • updated_at        │ │
│                                     └───────────────┴─────────────────────┘ │
│                                                                               │
│  Indexes:                                                                     │
│  • merchants.email (unique)                                                   │
│  • merchants.api_key (unique)                                                 │
│  • orders.merchant_id                                                         │
│  • payments.order_id                                                          │
│  • payments.status                                                            │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Order Creation Flow

```
┌──────────┐                                                         ┌──────────┐
│ Merchant │                                                         │   API    │
│  Client  │                                                         │  Server  │
└────┬─────┘                                                         └────┬─────┘
     │                                                                    │
     │ POST /api/v1/orders                                               │
     │ Headers: X-Api-Key, X-Api-Secret                                  │
     │ Body: {merchant_id, amount, currency, description}                │
     ├──────────────────────────────────────────────────────────────────>│
     │                                                                    │
     │                                          ┌──────────────────────┐ │
     │                                          │ 1. Authenticate      │ │
     │                                          │    merchant via      │ │
     │                                          │    API key/secret    │ │
     │                                          └──────────────────────┘ │
     │                                                    │               │
     │                                          ┌─────────▼──────────┐   │
     │                                          │ 2. Validate input  │   │
     │                                          │    (amount >= 100) │   │
     │                                          └─────────┬──────────┘   │
     │                                                    │               │
     │                                          ┌─────────▼──────────┐   │
     │                                          │ 3. Generate        │   │
     │                                          │    order_id        │   │
     │                                          └─────────┬──────────┘   │
     │                                                    │               │
     │                                          ┌─────────▼──────────┐   │
     │                                          │ 4. Insert into     │   │
     │                                          │    orders table    │   │
     │                                          └─────────┬──────────┘   │
     │                                                    │               │
     │ Response: {id, merchant_id, amount, status, ...}  │               │
     │<──────────────────────────────────────────────────┴───────────────│
     │                                                                    │
```

### 2. Payment Processing Flow (UPI)

```
┌──────────┐                  ┌──────────┐                  ┌──────────┐
│ Customer │                  │ Checkout │                  │   API    │
│          │                  │   Page   │                  │  Server  │
└────┬─────┘                  └────┬─────┘                  └────┬─────┘
     │                             │                             │
     │ 1. Enter VPA: user@upi      │                             │
     ├────────────────────────────>│                             │
     │                             │                             │
     │                             │ 2. POST /api/v1/payments    │
     │                             │    {order_id, method:"upi", │
     │                             │     vpa:"user@upi"}         │
     │                             ├────────────────────────────>│
     │                             │                             │
     │                             │              ┌──────────────┴─────┐
     │                             │              │ 3. Validate VPA    │
     │                             │              │    format (regex)  │
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │              ┌──────────────▼─────┐
     │                             │              │ 4. Create payment  │
     │                             │              │    status='processing'│
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │              ┌──────────────▼─────┐
     │                             │              │ 5. Simulate async  │
     │                             │              │    processing      │
     │                             │              │    (5-10 seconds)  │
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │              ┌──────────────▼─────┐
     │                             │              │ 6. 90% success rate│
     │                             │              │    Update status   │
     │                             │              └──────────────┬─────┐
     │                             │                             │
     │                             │    Response: {id, status,   │
     │                             │               method, ...}  │
     │                             │<────────────────────────────┤
     │                             │                             │
     │ 3. Show processing state    │                             │
     │<────────────────────────────┤                             │
     │                             │                             │
     │ 4. Poll for status          │                             │
     │    (or show success)        │                             │
     │<────────────────────────────┤                             │
     │                             │                             │
```

### 3. Card Payment Flow

```
┌──────────┐                  ┌──────────┐                  ┌──────────┐
│ Customer │                  │ Checkout │                  │   API    │
│          │                  │   Page   │                  │  Server  │
└────┬─────┘                  └────┬─────┘                  └────┬─────┘
     │                             │                             │
     │ 1. Enter card details       │                             │
     │    - Number: 4532...0366    │                             │
     │    - Expiry: 12/25          │                             │
     │    - CVV: 123               │                             │
     ├────────────────────────────>│                             │
     │                             │                             │
     │                             │ 2. POST /api/v1/payments    │
     │                             │    {order_id,               │
     │                             │     method:"card",          │
     │                             │     card_number,            │
     │                             │     expiry, cvv, name}      │
     │                             ├────────────────────────────>│
     │                             │                             │
     │                             │              ┌──────────────┴─────┐
     │                             │              │ 3. Validate Luhn   │
     │                             │              │    algorithm       │
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │              ┌──────────────▼─────┐
     │                             │              │ 4. Detect network  │
     │                             │              │    (Visa/MC/Amex)  │
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │              ┌──────────────▼─────┐
     │                             │              │ 5. Validate expiry │
     │                             │              │    (must be future)│
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │              ┌──────────────▼─────┐
     │                             │              │ 6. Create payment  │
     │                             │              │    Store last4     │
     │                             │              │    Store network   │
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │              ┌──────────────▼─────┐
     │                             │              │ 7. Process async   │
     │                             │              │    95% success     │
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │    Response: {id, status,   │
     │                             │               card_network, │
     │                             │               card_last4}   │
     │                             │<────────────────────────────┤
     │                             │                             │
     │ 3. Show success state       │                             │
     │<────────────────────────────┤                             │
     │                             │                             │
```

### 4. Dashboard Authentication Flow

```
┌──────────┐                  ┌──────────┐                  ┌──────────┐
│ Merchant │                  │Dashboard │                  │   API    │
│          │                  │   Page   │                  │  Server  │
└────┬─────┘                  └────┬─────┘                  └────┬─────┘
     │                             │                             │
     │ 1. Enter credentials        │                             │
     │    Email: test@example.com  │                             │
     │    Password: password123    │                             │
     ├────────────────────────────>│                             │
     │                             │                             │
     │                             │ 2. POST /api/v1/dashboard/login│
     │                             │    {email, password}        │
     │                             ├────────────────────────────>│
     │                             │                             │
     │                             │              ┌──────────────┴─────┐
     │                             │              │ 3. Query merchant  │
     │                             │              │    by email        │
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │              ┌──────────────▼─────┐
     │                             │              │ 4. Verify password │
     │                             │              │    (hardcoded)     │
     │                             │              └──────────────┬─────┘
     │                             │                             │
     │                             │    Response: {              │
     │                             │      id, name, email,       │
     │                             │      api_key, api_secret    │
     │                             │    }                        │
     │                             │<────────────────────────────┤
     │                             │                             │
     │ 3. Redirect to dashboard    │                             │
     │    Store credentials        │                             │
     │<────────────────────────────┤                             │
     │                             │                             │
     │ 4. Load stats & transactions│                             │
     │<────────────────────────────┤                             │
     │                             │                             │
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOCKER HOST MACHINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Docker Compose Network                          │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                       │   │
│  │  ┌──────────────────┐      ┌──────────────────┐                     │   │
│  │  │  Container:      │      │  Container:      │                     │   │
│  │  │  pg_gateway      │      │  gateway_api     │                     │   │
│  │  ├──────────────────┤      ├──────────────────┤                     │   │
│  │  │ PostgreSQL 15    │◄─────┤ Node.js 18       │                     │   │
│  │  │                  │      │ Express.js       │                     │   │
│  │  │ Port: 5432       │      │ Port: 8000       │                     │   │
│  │  │                  │      │                  │                     │   │
│  │  │ Health Check:    │      │ Depends on:      │                     │   │
│  │  │ pg_isready       │      │ - postgres       │                     │   │
│  │  └──────────────────┘      └──────────────────┘                     │   │
│  │                                     ▲                                │   │
│  │                                     │                                │   │
│  │                    ┌────────────────┴────────────────┐              │   │
│  │                    │                                  │              │   │
│  │         ┌──────────▼──────────┐          ┌──────────▼──────────┐   │   │
│  │         │  Container:         │          │  Container:         │   │   │
│  │         │  gateway_dashboard  │          │  gateway_checkout   │   │   │
│  │         ├─────────────────────┤          ├─────────────────────┤   │   │
│  │         │ React 18            │          │ React 18            │   │   │
│  │         │ Nginx               │          │ Nginx               │   │   │
│  │         │ Port: 3000→80       │          │ Port: 3001→80       │   │   │
│  │         │                     │          │                     │   │   │
│  │         │ Depends on: api     │          │ Depends on: api     │   │   │
│  │         └─────────────────────┘          └─────────────────────┘   │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  Port Mappings:                                                              │
│  • 5432 → PostgreSQL Database                                                │
│  • 8000 → API Backend                                                        │
│  • 3000 → Dashboard Frontend                                                 │
│  • 3001 → Checkout Page                                                      │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Runtime:** Node.js 18
- **Framework:** Express.js 4
- **Database Driver:** pg (node-postgres)
- **Middleware:** CORS, body-parser, custom auth

### Frontend
- **Framework:** React 18
- **Router:** React Router 6
- **HTTP Client:** Axios
- **Build Tool:** Create React App
- **Web Server:** Nginx

### Database
- **RDBMS:** PostgreSQL 15-alpine
- **Schema:** merchants, orders, payments tables
- **Features:** UUIDs, JSON columns, indexes

### DevOps
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Health Checks:** Built-in healthcheck commands
- **Dependency Management:** Service dependencies

### Testing
- **E2E Framework:** Playwright
- **Test Coverage:** 30 automated tests
- **Browsers:** Chromium, Firefox, WebKit

## Security Features

1. **API Authentication:** API key + secret header validation
2. **Card Data:** Never stored (only last 4 digits)
3. **VPA Validation:** Regex pattern matching
4. **Card Validation:** Luhn algorithm
5. **CORS:** Configured for cross-origin requests
6. **Input Validation:** All inputs validated before processing

## Scalability Considerations

- **Stateless API:** Can be horizontally scaled
- **Database Connection Pooling:** Built into pg driver
- **Async Processing:** Non-blocking payment processing
- **Containerized:** Easy to deploy multiple instances
- **Load Balancing Ready:** Can add reverse proxy
