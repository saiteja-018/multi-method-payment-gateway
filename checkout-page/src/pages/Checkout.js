import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Checkout.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function Checkout() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState('');

  // UPI form fields
  const [vpa, setVpa] = useState('');

  // Card form fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('order_id');
    
    if (!orderIdParam) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }

    setOrderId(orderIdParam);
    fetchOrder(orderIdParam);
  }, []);

  const fetchOrder = async (orderId) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/orders/${orderId}/public`);
      setOrder(response.data);
      setLoading(false);
    } catch (err) {
      setError('Order not found');
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setError('');
  };

  const handleUPISubmit = async (e) => {
    e.preventDefault();
    setError('');
    setProcessing(true);

    try {
      const response = await axios.post(`${API_URL}/api/v1/payments/public`, {
        order_id: orderId,
        method: 'upi',
        vpa: vpa
      });

      const paymentId = response.data.id;
      pollPaymentStatus(paymentId);
    } catch (err) {
      setProcessing(false);
      setError(err.response?.data?.error?.description || 'Payment failed. Please try again.');
    }
  };

  const handleCardSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setProcessing(true);

    try {
      // Parse expiry MM/YY
      const [month, year] = expiry.split('/');

      const response = await axios.post(`${API_URL}/api/v1/payments/public`, {
        order_id: orderId,
        method: 'card',
        card: {
          number: cardNumber,
          expiry_month: month?.trim(),
          expiry_year: year?.trim(),
          cvv: cvv,
          holder_name: holderName
        }
      });

      const paymentId = response.data.id;
      pollPaymentStatus(paymentId);
    } catch (err) {
      setProcessing(false);
      setError(err.response?.data?.error?.description || 'Payment failed. Please try again.');
    }
  };

  const pollPaymentStatus = async (paymentId) => {
    const maxAttempts = 60; // Poll for up to 2 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/v1/payments/${paymentId}/public`);
        const payment = response.data;

        if (payment.status === 'success') {
          setProcessing(false);
          setPaymentResult({
            success: true,
            paymentId: payment.id,
            message: 'Your payment has been processed successfully'
          });
        } else if (payment.status === 'failed') {
          setProcessing(false);
          setPaymentResult({
            success: false,
            message: payment.error_description || 'Payment could not be processed'
          });
        } else if (payment.status === 'processing' && attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setProcessing(false);
          setPaymentResult({
            success: false,
            message: 'Payment timeout. Please check your transaction status.'
          });
        }
      } catch (err) {
        setProcessing(false);
        setPaymentResult({
          success: false,
          message: 'Error checking payment status'
        });
      }
    };

    poll();
  };

  const handleRetry = () => {
    setPaymentResult(null);
    setSelectedMethod('');
    setVpa('');
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setHolderName('');
    setError('');
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="checkout-page">
        <div className="checkout-card">
          <div className="error-page">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-card">
        <div data-test-id="checkout-container">
          {/* Header */}
          <div className="checkout-header">
            <h1>🔒 Secure Checkout</h1>
          </div>

          {/* Success State */}
          {paymentResult && paymentResult.success && (
            <div data-test-id="success-state" className="result-container success">
              <div className="result-icon">✓</div>
              <h2>Payment Successful!</h2>
              <div className="result-details">
                <span>Payment ID: </span>
                <span data-test-id="payment-id" className="payment-id">{paymentResult.paymentId}</span>
              </div>
              <span data-test-id="success-message" className="result-message">
                {paymentResult.message}
              </span>
            </div>
          )}

          {/* Error State */}
          {paymentResult && !paymentResult.success && (
            <div data-test-id="error-state" className="result-container error">
              <div className="result-icon">✗</div>
              <h2>Payment Failed</h2>
              <span data-test-id="error-message" className="result-message">
                {paymentResult.message}
              </span>
              <button data-test-id="retry-button" onClick={handleRetry} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {/* Processing State */}
          {processing && (
            <div data-test-id="processing-state" className="processing-container">
              <div className="spinner"></div>
              <span data-test-id="processing-message" className="processing-message">
                Processing payment...
              </span>
            </div>
          )}

          {/* Payment Form */}
          {!processing && !paymentResult && (
            <>
              {/* Order Summary */}
              <div data-test-id="order-summary" className="order-summary">
                <h2>Complete Payment</h2>
                <div className="order-details">
                  <div className="order-detail-row">
                    <span>Amount: </span>
                    <span data-test-id="order-amount" className="amount">{formatAmount(order.amount)}</span>
                  </div>
                  <div className="order-detail-row">
                    <span>Order ID: </span>
                    <span data-test-id="order-id" className="order-id">{order.id}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              {!selectedMethod && (
                <div data-test-id="payment-methods" className="payment-methods">
                  <h3>Select Payment Method</h3>
                  <div className="method-buttons">
                    <button
                      data-test-id="method-upi"
                      data-method="upi"
                      onClick={() => handleMethodSelect('upi')}
                      className="method-btn"
                    >
                      <div className="method-icon">📱</div>
                      <div className="method-name">UPI</div>
                    </button>
                    <button
                      data-test-id="method-card"
                      data-method="card"
                      onClick={() => handleMethodSelect('card')}
                      className="method-btn"
                    >
                      <div className="method-icon">💳</div>
                      <div className="method-name">Card</div>
                    </button>
                  </div>
                </div>
              )}

              {/* UPI Form */}
              {selectedMethod === 'upi' && (
                <form data-test-id="upi-form" onSubmit={handleUPISubmit} className="payment-form">
                  <h3>UPI Payment</h3>
                  <div className="form-group">
                    <label htmlFor="vpa">UPI ID</label>
                    <input
                      data-test-id="vpa-input"
                      type="text"
                      id="vpa"
                      placeholder="username@bank"
                      value={vpa}
                      onChange={(e) => setVpa(e.target.value)}
                      required
                    />
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <div className="form-actions">
                    <button type="button" onClick={() => setSelectedMethod('')} className="back-btn">
                      Back
                    </button>
                    <button data-test-id="pay-button" type="submit" className="pay-btn">
                      Pay {formatAmount(order.amount)}
                    </button>
                  </div>
                </form>
              )}

              {/* Card Form */}
              {selectedMethod === 'card' && (
                <form data-test-id="card-form" onSubmit={handleCardSubmit} className="payment-form">
                  <h3>Card Payment</h3>
                  <div className="form-group">
                    <label htmlFor="cardNumber">Card Number</label>
                    <input
                      data-test-id="card-number-input"
                      type="text"
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="expiry">Expiry Date</label>
                      <input
                        data-test-id="expiry-input"
                        type="text"
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cvv">CVV</label>
                      <input
                        data-test-id="cvv-input"
                        type="text"
                        id="cvv"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        maxLength="4"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="holderName">Cardholder Name</label>
                    <input
                      data-test-id="cardholder-name-input"
                      type="text"
                      id="holderName"
                      placeholder="Name on Card"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      required
                    />
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <div className="form-actions">
                    <button type="button" onClick={() => setSelectedMethod('')} className="back-btn">
                      Back
                    </button>
                    <button data-test-id="pay-button" type="submit" className="pay-btn">
                      Pay {formatAmount(order.amount)}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Checkout;
