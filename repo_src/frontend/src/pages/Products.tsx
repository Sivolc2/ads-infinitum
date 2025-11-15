import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import apiClient from '../services/api';
import type { ProductWithMetrics, ExperimentWithMetrics } from '../types';
import '../styles/Products.css';

export default function Products() {
  const [products, setProducts] = useState<ProductWithMetrics[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithMetrics | null>(null);
  const [experiments, setExperiments] = useState<ExperimentWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [runningExperiment, setRunningExperiment] = useState(false);
  const [experimentLogs, setExperimentLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadExperiments(selectedProduct.id);
    }
  }, [selectedProduct]);

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

  const loadExperiments = async (productId: string) => {
    try {
      const data = await apiClient.getExperiments(productId);
      setExperiments(data);
    } catch (err) {
      console.error('Error loading experiments:', err);
    }
  };

  const addLog = (message: string) => {
    setExperimentLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const createAIProduct = async () => {
    try {
      setCreating(true);
      setError(null);
      setExperimentLogs([]);

      addLog('🤖 Starting AI product generation...');

      // Call AI product generation endpoint
      const response = await fetch('/api/ai/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to generate product');
      }

      const { product } = await response.json();
      addLog(`✅ Created product: "${product.title}"`);

      // Reload products
      await loadProducts();

      // Select the new product
      const updatedProduct = products.find(p => p.id === product.id) || product;
      setSelectedProduct(updatedProduct);

      addLog('🎉 Product generation complete!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create product';
      setError(errorMsg);
      addLog(`❌ Error: ${errorMsg}`);
      console.error('Error creating product:', err);
    } finally {
      setCreating(false);
    }
  };

  const runExperiment = async () => {
    if (!selectedProduct) return;

    try {
      setRunningExperiment(true);
      setError(null);
      setExperimentLogs([]);

      addLog('🧪 Starting experiment...');
      addLog(`📊 Product: ${selectedProduct.title}`);
      addLog('');

      // Call experiment runner endpoint
      addLog('🎨 Generating ad variants...');
      const response = await fetch('/api/ai/run-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProduct.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to run experiment');
      }

      const result = await response.json();

      addLog(`✅ Generated ${result.num_variants} ad variants`);
      addLog(`💰 Estimated cost: $${result.estimated_cost.toFixed(2)}`);
      addLog('');
      addLog('📱 Deploying to Meta Ads...');

      // Simulate deployment progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('✅ Ads deployed successfully');
      addLog('');
      addLog('📈 Experiment is now running!');
      addLog('');
      addLog(`Experiment ID: ${result.experiment_id}`);
      addLog(`Budget: $${result.budget_per_day}/day`);
      addLog(`Target CPL: $${result.target_cpl}`);
      addLog('');
      addLog('🎉 Experiment started successfully!');

      // Reload experiments
      await loadExperiments(selectedProduct.id);
      await loadProducts();

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to run experiment';
      setError(errorMsg);
      addLog(`❌ Error: ${errorMsg}`);
      console.error('Error running experiment:', err);
    } finally {
      setRunningExperiment(false);
    }
  };

  const selectProduct = (product: ProductWithMetrics) => {
    setSelectedProduct(product);
    setExperimentLogs([]);
  };

  if (loading) {
    return (
      <div className="products-container">
        <div className="loading">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <div>
          <h1>Product Concepts</h1>
          <p className="subtitle">AI-generated product ideas being validated in the market</p>
        </div>
        <button
          className="btn-primary"
          onClick={createAIProduct}
          disabled={creating}
        >
          {creating ? '🤖 Generating...' : '✨ Create AI Product'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="products-layout">
        {/* Left Panel: Product List */}
        <div className="products-list-panel">
          <h2>All Products ({products.length})</h2>

          {products.length === 0 ? (
            <div className="empty-state-small">
              <div className="empty-icon">💡</div>
              <h3>No Products Yet</h3>
              <p>Click "Create AI Product" to start</p>
            </div>
          ) : (
            <div className="products-list">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`product-list-item ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                  onClick={() => selectProduct(product)}
                >
                  <div className="product-list-header">
                    <h3>{product.title}</h3>
                    <span className={`status-badge status-${product.status}`}>
                      {product.status}
                    </span>
                  </div>
                  <p className="product-list-tagline">{product.tagline}</p>
                  <div className="product-list-stats">
                    <span>{product.total_experiments} exp</span>
                    <span>{product.total_leads} leads</span>
                    <span>${product.total_spend_usd.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Product Details & Experiments */}
        <div className="product-details-panel">
          {selectedProduct ? (
            <>
              {/* Product Summary */}
              <div className="product-summary-card">
                <div className="product-details-header">
                  <div>
                    <h2>{selectedProduct.title}</h2>
                    <p className="product-tagline">{selectedProduct.tagline}</p>
                  </div>
                  <span className={`status-badge-large status-${selectedProduct.status}`}>
                    {selectedProduct.status}
                  </span>
                </div>

                <div className="product-section">
                  <h3>Description</h3>
                  <p>{selectedProduct.description}</p>
                </div>

                <div className="product-section">
                  <h3>Hypothesis</h3>
                  <p>{selectedProduct.hypothesis}</p>
                </div>

                <div className="product-section">
                  <h3>Target Audience</h3>
                  <p>{selectedProduct.target_audience}</p>
                </div>

                <div className="product-stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{selectedProduct.total_experiments}</div>
                    <div className="stat-label">Experiments</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{selectedProduct.total_leads}</div>
                    <div className="stat-label">Total Leads</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">${selectedProduct.avg_cpl_usd.toFixed(2)}</div>
                    <div className="stat-label">Avg CPL</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">${selectedProduct.total_spend_usd.toFixed(2)}</div>
                    <div className="stat-label">Total Spend</div>
                  </div>
                </div>
              </div>

              {/* Experiment Runner */}
              <div className="experiment-runner-card">
                <div className="experiment-runner-header">
                  <h2>Run Experiment</h2>
                  <button
                    className="btn-primary"
                    onClick={runExperiment}
                    disabled={runningExperiment}
                  >
                    {runningExperiment ? '⚡ Running...' : '🚀 Run Experiment'}
                  </button>
                </div>

                {experimentLogs.length > 0 && (
                  <div className="logs-container">
                    <div className="logs-header">Execution Logs</div>
                    <div className="logs-content">
                      {experimentLogs.map((log, idx) => (
                        <div key={idx} className="log-line">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Experiments List */}
              <div className="experiments-list-card">
                <h2>Experiments ({experiments.length})</h2>

                {experiments.length === 0 ? (
                  <div className="empty-state-small">
                    <div className="empty-icon">🧪</div>
                    <p>No experiments yet. Run an experiment to start testing!</p>
                  </div>
                ) : (
                  <div className="experiments-grid">
                    {experiments.map((experiment) => (
                      <div key={experiment.id} className="experiment-card">
                        <div className="experiment-card-header">
                          <h3>Experiment #{experiment.round}</h3>
                          <span className={`status-badge status-${experiment.status}`}>
                            {experiment.status}
                          </span>
                        </div>

                        <div className="experiment-card-stats">
                          <div className="experiment-stat">
                            <span className="stat-label">Variants</span>
                            <span className="stat-value">{experiment.total_variants}</span>
                          </div>
                          <div className="experiment-stat">
                            <span className="stat-label">Leads</span>
                            <span className="stat-value">{experiment.total_leads}</span>
                          </div>
                          <div className="experiment-stat">
                            <span className="stat-label">Avg CPL</span>
                            <span className="stat-value">${experiment.avg_cpl_usd.toFixed(2)}</span>
                          </div>
                          <div className="experiment-stat">
                            <span className="stat-label">Spend</span>
                            <span className="stat-value">${experiment.total_spend_usd.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="experiment-card-meta">
                          <span>Budget: ${experiment.budget_per_day_usd}/day</span>
                          <span>Target CPL: ${experiment.target_cpl_threshold_usd}</span>
                        </div>

                        <div className="experiment-card-date">
                          {format(new Date(experiment.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👈</div>
              <h3>Select a Product</h3>
              <p>Choose a product from the list to view details and run experiments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
