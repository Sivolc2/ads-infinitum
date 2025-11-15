import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../services/api';
import type { AdVariantWithMetrics, AdStatus } from '../types';
import '../styles/AdVariants.css';

const statusColors: Record<AdStatus, string> = {
  draft: '#6b7280',
  active: '#10b981',
  paused: '#f59e0b',
  deleted: '#ef4444',
};

const statusLabels: Record<AdStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  deleted: 'Deleted',
};

export default function AdVariants() {
  const [searchParams] = useSearchParams();
  const experimentId = searchParams.get('experiment');

  const [variants, setVariants] = useState<AdVariantWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AdStatus | 'all'>('all');
  const [selectedVariant, setSelectedVariant] = useState<AdVariantWithMetrics | null>(null);

  useEffect(() => {
    loadVariants();
  }, [experimentId]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAdVariants(experimentId || undefined);
      setVariants(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ad variants');
      console.error('Error loading ad variants:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVariants = variants.filter(
    (v) => filterStatus === 'all' || v.status === filterStatus
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading ad variants...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <h3>Error Loading Ad Variants</h3>
          <p>{error}</p>
          <button onClick={loadVariants} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Ad Variants</h1>
          <p className="page-description">
            {experimentId
              ? 'Ad variants for selected experiment'
              : 'All ad variants across experiments'}
          </p>
        </div>
        <button className="btn-primary">+ Create Ad Variant</button>
      </div>

      <div className="filters">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({variants.length})
        </button>
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = variants.filter((v) => v.status === status).length;
          return (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status as AdStatus)}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filteredVariants.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📢</div>
          <h3>No Ad Variants Found</h3>
          <p>
            {filterStatus === 'all'
              ? 'Start by creating a new ad variant'
              : `No ads with status "${statusLabels[filterStatus as AdStatus]}"`}
          </p>
        </div>
      ) : (
        <div className="ad-variants-grid">
          {filteredVariants.map((variant) => (
            <div
              key={variant.id}
              className={`ad-card ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
              onClick={() => setSelectedVariant(variant)}
            >
              <div className="ad-image-container">
                <img
                  src={variant.image_url}
                  alt={variant.headline}
                  className="ad-image"
                  loading="lazy"
                />
                <span
                  className="ad-status-badge"
                  style={{ background: statusColors[variant.status] }}
                >
                  {statusLabels[variant.status]}
                </span>
              </div>

              <div className="ad-content">
                <h3 className="ad-headline">{variant.headline}</h3>
                <p className="ad-body">{variant.body}</p>
                <div className="ad-cta-badge">{variant.cta}</div>
              </div>

              <div className="ad-metrics">
                <div className="metric-row">
                  <div className="metric-item">
                    <div className="metric-value">{variant.total_impressions.toLocaleString()}</div>
                    <div className="metric-label">Impressions</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value">{variant.total_clicks.toLocaleString()}</div>
                    <div className="metric-label">Clicks</div>
                  </div>
                </div>
                <div className="metric-row">
                  <div className="metric-item">
                    <div className="metric-value">{variant.total_leads}</div>
                    <div className="metric-label">Leads</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value">{(variant.avg_ctr * 100).toFixed(2)}%</div>
                    <div className="metric-label">CTR</div>
                  </div>
                </div>
                <div className="metric-row">
                  <div className="metric-item">
                    <div className="metric-value">${variant.avg_cpl_usd.toFixed(2)}</div>
                    <div className="metric-label">CPL</div>
                  </div>
                  <div className="metric-item">
                    <div className="metric-value">${variant.total_spend_usd.toFixed(2)}</div>
                    <div className="metric-label">Spend</div>
                  </div>
                </div>
              </div>

              <div className="ad-footer">
                <div className="ad-meta">
                  {variant.created_by === 'agent' ? '🤖 AI Generated' : '👤 Human Created'}
                  <span className="ad-date">
                    {format(new Date(variant.created_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVariant && (
        <div className="detail-modal" onClick={() => setSelectedVariant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ad Variant Details</h2>
              <button className="close-btn" onClick={() => setSelectedVariant(null)}>✕</button>
            </div>
            <div className="modal-body">
              <img
                src={selectedVariant.image_url}
                alt={selectedVariant.headline}
                className="modal-image"
              />
              <div className="modal-info">
                <h3>{selectedVariant.headline}</h3>
                <p>{selectedVariant.body}</p>
                <div className="modal-meta">
                  <div className="meta-detail">
                    <strong>CTA:</strong> {selectedVariant.cta}
                  </div>
                  <div className="meta-detail">
                    <strong>Platform:</strong> Meta Ads
                  </div>
                  <div className="meta-detail">
                    <strong>Campaign ID:</strong> {selectedVariant.meta_campaign_id}
                  </div>
                  <div className="meta-detail">
                    <strong>Ad Set ID:</strong> {selectedVariant.meta_adset_id}
                  </div>
                  <div className="meta-detail">
                    <strong>Ad ID:</strong> {selectedVariant.meta_ad_id}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
