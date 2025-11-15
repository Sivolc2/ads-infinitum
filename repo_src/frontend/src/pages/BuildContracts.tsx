import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import apiClient from '../services/api';
import type { BuildContract, BuildStatus, BuildPlatform } from '../types';
import '../styles/BuildContracts.css';

const statusColors: Record<BuildStatus, string> = {
  draft: '#6b7280',
  posted: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
};

const statusLabels: Record<BuildStatus, string> = {
  draft: 'Draft',
  posted: 'Posted',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const platformLabels: Record<BuildPlatform, string> = {
  freelancer: 'Freelancer.com',
  upwork: 'Upwork',
};

export default function BuildContracts() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');

  const [contracts, setContracts] = useState<BuildContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<BuildStatus | 'all'>('all');
  const [selectedContract, setSelectedContract] = useState<BuildContract | null>(null);

  useEffect(() => {
    loadContracts();
  }, [productId]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getBuildContracts(productId || undefined);
      setContracts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load build contracts');
      console.error('Error loading build contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(
    (c) => filterStatus === 'all' || c.status === filterStatus
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading build contracts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <h3>Error Loading Build Contracts</h3>
          <p>{error}</p>
          <button onClick={loadContracts} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Build Contracts</h1>
          <p className="page-description">
            Handoff specifications for validated products
          </p>
        </div>
        <button className="btn-primary">+ Create Build Contract</button>
      </div>

      <div className="filters">
        <button
          className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          All ({contracts.length})
        </button>
        {Object.entries(statusLabels).map(([status, label]) => {
          const count = contracts.filter((c) => c.status === status).length;
          return (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status as BuildStatus)}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filteredContracts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔨</div>
          <h3>No Build Contracts Yet</h3>
          <p>
            {filterStatus === 'all'
              ? 'Build contracts are created for validated products ready for development'
              : `No contracts with status "${statusLabels[filterStatus as BuildStatus]}"`}
          </p>
        </div>
      ) : (
        <div className="contracts-list">
          {filteredContracts.map((contract) => (
            <div key={contract.id} className="contract-card">
              <div className="contract-header">
                <div>
                  <h3 className="contract-title">
                    Build Contract #{contract.id.substring(0, 8)}
                  </h3>
                  <Link
                    to={`/products?id=${contract.product_id}`}
                    className="contract-product"
                  >
                    View Product →
                  </Link>
                </div>
                <div className="contract-badges">
                  <span
                    className="status-badge"
                    style={{ background: statusColors[contract.status] }}
                  >
                    {statusLabels[contract.status]}
                  </span>
                  <span className="platform-badge">
                    {platformLabels[contract.platform]}
                  </span>
                </div>
              </div>

              <div className="contract-details">
                <div className="detail-section">
                  <div className="detail-label">Budget:</div>
                  <div className="detail-value budget-value">
                    ${contract.budget_usd.toLocaleString()}
                  </div>
                </div>

                {contract.external_job_id && (
                  <div className="detail-section">
                    <div className="detail-label">External Job ID:</div>
                    <div className="detail-value job-id">{contract.external_job_id}</div>
                  </div>
                )}

                <div className="detail-section">
                  <div className="detail-label">Created:</div>
                  <div className="detail-value">
                    {format(new Date(contract.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              {contract.notes_for_builder && (
                <div className="builder-notes">
                  <div className="notes-label">Notes for Builder:</div>
                  <div className="notes-content">{contract.notes_for_builder}</div>
                </div>
              )}

              <div className="contract-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedContract(contract)}
                >
                  View Full Spec →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedContract && (
        <div className="detail-modal" onClick={() => setSelectedContract(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Build Contract Specification</h2>
              <button className="close-btn" onClick={() => setSelectedContract(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="spec-section">
                <h3>Contract Details</h3>
                <div className="spec-grid">
                  <div className="spec-item">
                    <strong>Status:</strong>
                    <span
                      className="status-badge"
                      style={{ background: statusColors[selectedContract.status] }}
                    >
                      {statusLabels[selectedContract.status]}
                    </span>
                  </div>
                  <div className="spec-item">
                    <strong>Platform:</strong>
                    <span>{platformLabels[selectedContract.platform]}</span>
                  </div>
                  <div className="spec-item">
                    <strong>Budget:</strong>
                    <span className="budget-highlight">
                      ${selectedContract.budget_usd.toLocaleString()}
                    </span>
                  </div>
                  {selectedContract.external_job_id && (
                    <div className="spec-item">
                      <strong>Job ID:</strong>
                      <span className="job-id">{selectedContract.external_job_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedContract.notes_for_builder && (
                <div className="spec-section">
                  <h3>Builder Notes</h3>
                  <div className="notes-box">{selectedContract.notes_for_builder}</div>
                </div>
              )}

              <div className="spec-section">
                <h3>Full Specification</h3>
                <div
                  className="spec-markdown"
                  dangerouslySetInnerHTML={{
                    __html: selectedContract.spec_markdown.replace(/\n/g, '<br />'),
                  }}
                />
              </div>

              <div className="spec-section">
                <h3>Timeline</h3>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-date">
                      {format(new Date(selectedContract.created_at), 'PPP')}
                    </div>
                    <div className="timeline-label">Contract Created</div>
                  </div>
                  {selectedContract.status !== 'draft' && (
                    <div className="timeline-item">
                      <div className="timeline-date">
                        {format(new Date(selectedContract.updated_at), 'PPP')}
                      </div>
                      <div className="timeline-label">Last Updated</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
