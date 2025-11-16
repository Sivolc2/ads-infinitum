import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import apiClient from '../services/api';
import type { ExperimentWithMetrics, ExperimentStatus } from '../types';
import OptimizationPanel from '../components/OptimizationPanel';
import '../styles/Experiments.css';

const statusColors: Record<ExperimentStatus, string> = {
  pending: '#6b7280',
  running: '#3b82f6',
  paused: '#f59e0b',
  completed: '#10b981',
};

const statusLabels: Record<ExperimentStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  paused: 'Paused',
  completed: 'Completed',
};

export default function Experiments() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');

  const [experiments, setExperiments] = useState<ExperimentWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ExperimentStatus | 'all'>('all');

  useEffect(() => {
    loadExperiments();
  }, [productId]);

  const loadExperiments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getExperiments(productId || undefined);
      setExperiments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
      console.error('Error loading experiments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredExperiments = experiments.filter(
    (e) => filterStatus === 'all' || e.status === filterStatus
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading experiments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <h3>Error Loading Experiments</h3>
          <p>{error}</p>
          <button onClick={loadExperiments} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Ad Experiments</h1>
          <p className="page-description">
            {productId
              ? 'Experiments for selected product'
              : 'All active and completed ad experiments'}
          </p>
        </div>
        <button className="btn-primary">+ New Experiment</button>
      </div>

      <div className="filters">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({experiments.length})
        </button>
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = experiments.filter((e) => e.status === status).length;
          return (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status as ExperimentStatus)}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filteredExperiments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧪</div>
          <h3>No Experiments Found</h3>
          <p>
            {filterStatus === 'all'
              ? 'Start by creating a new experiment'
              : `No experiments with status "${statusLabels[filterStatus as ExperimentStatus]}"`}
          </p>
        </div>
      ) : (
        <div className="experiments-list">
          {filteredExperiments.map((experiment) => (
            <div key={experiment.id} className="experiment-card">
              <div className="experiment-header">
                <div className="experiment-title-section">
                  <h3 className="experiment-title">Experiment #{experiment.round}</h3>
                  <Link to={`/products`} className="experiment-product">
                    {experiment.product.title}
                  </Link>
                </div>
                <span
                  className="status-badge"
                  style={{ background: statusColors[experiment.status] }}
                >
                  {statusLabels[experiment.status]}
                </span>
              </div>

              <div className="experiment-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Platform:</span>
                    <span className="detail-value platform-badge">Meta Ads</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Goal:</span>
                    <span className="detail-value">{experiment.goal === 'leads' ? '👥 Leads' : '🖱️ Clicks'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">CPL Threshold:</span>
                    <span className="detail-value">${experiment.target_cpl_threshold_usd.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Min Leads:</span>
                    <span className="detail-value">{experiment.min_leads_for_decision}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Daily Budget:</span>
                    <span className="detail-value">${experiment.budget_per_day_usd.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Budget:</span>
                    <span className="detail-value">${experiment.budget_total_usd.toFixed(2)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created:</span>
                    <span className="detail-value">
                      {format(new Date(experiment.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="experiment-stats">
                <div className="stat-box">
                  <div className="stat-box-value">{experiment.total_variants}</div>
                  <div className="stat-box-label">Ad Variants</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-value">{experiment.total_leads}</div>
                  <div className="stat-box-label">Total Leads</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-value">${experiment.avg_cpl_usd.toFixed(2)}</div>
                  <div className="stat-box-label">Avg CPL</div>
                </div>
                <div className="stat-box">
                  <div className="stat-box-value">${experiment.total_spend_usd.toFixed(2)}</div>
                  <div className="stat-box-label">Total Spend</div>
                </div>
                {experiment.avg_cpl_usd <= experiment.target_cpl_threshold_usd &&
                  experiment.total_leads >= experiment.min_leads_for_decision && (
                    <div className="stat-box success">
                      <div className="stat-box-value">✅</div>
                      <div className="stat-box-label">Target Hit!</div>
                    </div>
                  )}
              </div>

              <OptimizationPanel
                experimentId={experiment.id}
                isRunning={experiment.status === 'running'}
              />

              <div className="experiment-footer">
                <Link to={`/ads?experiment=${experiment.id}`} className="btn-secondary">
                  View Ad Variants ({experiment.total_variants}) →
                </Link>
                {experiment.best_variant && (
                  <div className="best-variant-badge">
                    🏆 Best: {experiment.best_variant.headline.substring(0, 40)}...
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
