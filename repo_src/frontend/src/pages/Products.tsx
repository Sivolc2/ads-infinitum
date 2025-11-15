import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import apiClient from '../services/api';
import type { ProductWithMetrics, ProductStatus } from '../types';
import '../styles/Products.css';

const statusColors: Record<ProductStatus, string> = {
  draft: '#6b7280',
  testing: '#3b82f6',
  validated: '#10b981',
  killed: '#ef4444',
  handoff: '#8b5cf6',
};

const statusLabels: Record<ProductStatus, string> = {
  draft: 'Draft',
  testing: 'Testing',
  validated: 'Validated',
  killed: 'Killed',
  handoff: 'Handed Off',
};

export default function Products() {
  const [products, setProducts] = useState<ProductWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProductStatus | 'all'>('all');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) => filterStatus === 'all' || p.status === filterStatus
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <h3>Error Loading Products</h3>
          <p>{error}</p>
          <button onClick={loadProducts} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Product Concepts</h1>
          <p className="page-description">
            AI-generated product ideas being tested in the market
          </p>
        </div>
        <button className="btn-primary">+ New Product Concept</button>
      </div>

      <div className="filters">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({products.length})
        </button>
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = products.filter((p) => p.status === status).length;
          return (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status as ProductStatus)}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💡</div>
          <h3>No Products Found</h3>
          <p>
            {filterStatus === 'all'
              ? 'Start by creating a new product concept'
              : `No products with status "${statusLabels[filterStatus as ProductStatus]}"`}
          </p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-header">
                <div>
                  <h3 className="product-title">{product.title}</h3>
                  <p className="product-tagline">{product.tagline}</p>
                </div>
                <span
                  className="status-badge"
                  style={{ background: statusColors[product.status] }}
                >
                  {statusLabels[product.status]}
                </span>
              </div>

              <p className="product-description">{product.description}</p>

              <div className="product-meta">
                <div className="meta-item">
                  <span className="meta-label">Hypothesis:</span>
                  <span className="meta-value">{product.hypothesis}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Target Audience:</span>
                  <span className="meta-value">{product.target_audience}</span>
                </div>
              </div>

              <div className="product-stats">
                <div className="stat-item">
                  <div className="stat-item-value">{product.total_experiments}</div>
                  <div className="stat-item-label">Experiments</div>
                </div>
                <div className="stat-item">
                  <div className="stat-item-value">{product.total_leads}</div>
                  <div className="stat-item-label">Leads</div>
                </div>
                <div className="stat-item">
                  <div className="stat-item-value">${product.avg_cpl_usd.toFixed(2)}</div>
                  <div className="stat-item-label">Avg CPL</div>
                </div>
                <div className="stat-item">
                  <div className="stat-item-value">${product.total_spend_usd.toFixed(2)}</div>
                  <div className="stat-item-label">Total Spend</div>
                </div>
              </div>

              <div className="product-footer">
                <div className="product-date">
                  Created {format(new Date(product.created_at), 'MMM d, yyyy')}
                  {product.created_by === 'agent' && ' by AI'}
                </div>
                <div className="product-actions">
                  <Link to={`/experiments?product=${product.id}`} className="btn-link">
                    View Experiments →
                  </Link>
                  {product.landing_page && (
                    <Link to={`/landing-pages/${product.landing_page.id}`} className="btn-link">
                      Landing Page →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
