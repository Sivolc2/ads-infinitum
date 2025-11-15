import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import '../styles/Dashboard.css';

interface DashboardStats {
  total_products: number;
  active_experiments: number;
  total_leads: number;
  total_spend_usd: number;
  validated_products: number;
  avg_cpl_usd: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <h3>Error Loading Dashboard</h3>
          <p>{error}</p>
          <button onClick={loadStats} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-description">
          Overview of your self-evolving product scout system
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💡</div>
          <div className="stat-content">
            <div className="stat-label">Total Products</div>
            <div className="stat-value">{stats?.total_products || 0}</div>
            <Link to="/products" className="stat-link">View all →</Link>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🧪</div>
          <div className="stat-content">
            <div className="stat-label">Active Experiments</div>
            <div className="stat-value">{stats?.active_experiments || 0}</div>
            <Link to="/experiments" className="stat-link">View all →</Link>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Total Leads</div>
            <div className="stat-value">{stats?.total_leads || 0}</div>
            <Link to="/leads" className="stat-link">View all →</Link>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Spend</div>
            <div className="stat-value">${(stats?.total_spend_usd || 0).toFixed(2)}</div>
            <div className="stat-subtext">Across all campaigns</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Validated Products</div>
            <div className="stat-value">{stats?.validated_products || 0}</div>
            <Link to="/landing-pages" className="stat-link">View pages →</Link>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Avg. CPL</div>
            <div className="stat-value">${(stats?.avg_cpl_usd || 0).toFixed(2)}</div>
            <div className="stat-subtext">Cost per lead</div>
          </div>
        </div>
      </div>

      <div className="info-section">
        <h2>How It Works</h2>
        <div className="info-grid">
          <div className="info-card">
            <div className="info-number">1</div>
            <h3>Generate Ideas</h3>
            <p>AI generates product concepts with target audiences and hypotheses</p>
          </div>
          <div className="info-card">
            <div className="info-number">2</div>
            <h3>Test with Ads</h3>
            <p>Create Meta ads with AI-generated copy and visuals, monitor performance</p>
          </div>
          <div className="info-card">
            <div className="info-number">3</div>
            <h3>Evolve & Scale</h3>
            <p>Kill losers, duplicate winners, adjust budgets based on metrics</p>
          </div>
          <div className="info-card">
            <div className="info-number">4</div>
            <h3>Promote to Landing</h3>
            <p>Successful products get Kickstarter-style landing pages</p>
          </div>
          <div className="info-card">
            <div className="info-number">5</div>
            <h3>Capture Leads</h3>
            <p>Collect and enrich lead data with sentiment and preferences</p>
          </div>
          <div className="info-card">
            <div className="info-number">6</div>
            <h3>Hand off to Build</h3>
            <p>Post validated products to freelancer platforms for development</p>
          </div>
        </div>
      </div>
    </div>
  );
}
