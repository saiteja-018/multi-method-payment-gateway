import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function Dashboard() {
  const [merchant, setMerchant] = useState(null);
  const [stats, setStats] = useState({
    total_transactions: 0,
    total_amount: 0,
    success_rate: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const merchantData = localStorage.getItem('merchant');
    if (!merchantData) {
      navigate('/login');
      return;
    }

    const parsedMerchant = JSON.parse(merchantData);
    setMerchant(parsedMerchant);
    
    fetchStats(parsedMerchant);
  }, [navigate]);

  const fetchStats = async (merchantData) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/dashboard/stats`, {
        headers: {
          'X-Api-Key': merchantData.api_key,
          'X-Api-Secret': merchantData.api_secret
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('merchant');
    navigate('/login');
  };

  const formatAmount = (amount) => {
    return `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!merchant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        <div className="navbar-brand">Payment Gateway</div>
        <div className="navbar-menu">
          <Link to="/dashboard" className="nav-link active">Dashboard</Link>
          <Link to="/dashboard/transactions" className="nav-link">Transactions</Link>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div data-test-id="dashboard" className="dashboard-content">
        <h1>Welcome, {merchant.name}</h1>

        <div data-test-id="api-credentials" className="credentials-section">
          <h2>API Credentials</h2>
          <div className="credentials-grid">
            <div className="credential-item">
              <label>API Key</label>
              <span data-test-id="api-key" className="credential-value">{merchant.api_key}</span>
            </div>
            <div className="credential-item">
              <label>API Secret</label>
              <span data-test-id="api-secret" className="credential-value">{merchant.api_secret}</span>
            </div>
          </div>
        </div>

        <div data-test-id="stats-container" className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Transactions</div>
              <div data-test-id="total-transactions" className="stat-value">{stats.total_transactions}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Total Amount</div>
              <div data-test-id="total-amount" className="stat-value">{formatAmount(stats.total_amount)}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-label">Success Rate</div>
              <div data-test-id="success-rate" className="stat-value">{stats.success_rate}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
