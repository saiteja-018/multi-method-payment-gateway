import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Transactions.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function Transactions() {
  const [merchant, setMerchant] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const merchantData = localStorage.getItem('merchant');
    if (!merchantData) {
      navigate('/login');
      return;
    }

    const parsedMerchant = JSON.parse(merchantData);
    setMerchant(parsedMerchant);
    
    fetchTransactions(parsedMerchant);
  }, [navigate]);

  const fetchTransactions = async (merchantData) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/dashboard/transactions`, {
        headers: {
          'X-Api-Key': merchantData.api_key,
          'X-Api-Secret': merchantData.api_secret
        }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('merchant');
    navigate('/login');
  };

  const formatAmount = (amount) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'success':
        return 'status-success';
      case 'failed':
        return 'status-failed';
      case 'processing':
        return 'status-processing';
      default:
        return '';
    }
  };

  if (!merchant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="transactions-container">
      <nav className="navbar">
        <div className="navbar-brand">Payment Gateway</div>
        <div className="navbar-menu">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/dashboard/transactions" className="nav-link active">Transactions</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="transactions-content">
        <h1>Transactions</h1>

        <div className="table-container">
          <table data-test-id="transactions-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No transactions found</td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr 
                    key={transaction.id}
                    data-test-id="transaction-row"
                    data-payment-id={transaction.id}
                  >
                    <td data-test-id="payment-id">{transaction.id}</td>
                    <td data-test-id="order-id">{transaction.order_id}</td>
                    <td data-test-id="amount">{formatAmount(transaction.amount)}</td>
                    <td data-test-id="method">{transaction.method.toUpperCase()}</td>
                    <td data-test-id="status">
                      <span className={`status-badge ${getStatusClass(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td data-test-id="created-at">{formatDate(transaction.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Transactions;
