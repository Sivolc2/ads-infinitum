import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import apiClient from '../services/api';
import type { Lead, UserProfile, LeadSource, InterestLevel, Sentiment } from '../types';
import '../styles/Leads.css';

const sourceLabels: Record<LeadSource, string> = {
  meta_lead_form: 'Meta Lead Form',
  landing_form: 'Landing Page',
};

const interestColors: Record<InterestLevel, string> = {
  high: '#10b981',
  medium: '#f59e0b',
  low: '#6b7280',
};

const sentimentColors: Record<Sentiment, string> = {
  excited: '#10b981',
  neutral: '#6b7280',
  skeptical: '#f59e0b',
  negative: '#ef4444',
};

interface LeadWithProfile extends Lead {
  profile?: UserProfile;
}

export default function Leads() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');

  const [leads, setLeads] = useState<LeadWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadWithProfile | null>(null);

  useEffect(() => {
    loadLeads();
  }, [productId]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const leadsData = await apiClient.getLeads(productId || undefined);
      const profiles = await apiClient.getUserProfiles();

      // Match profiles to leads
      const leadsWithProfiles: LeadWithProfile[] = leadsData.map((lead) => ({
        ...lead,
        profile: profiles.find((p) => p.lead_id === lead.id),
      }));

      setLeads(leadsWithProfiles);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading leads...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <h3>Error Loading Leads</h3>
          <p>{error}</p>
          <button onClick={loadLeads} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Leads & User Profiles</h1>
          <p className="page-description">
            Captured leads enriched with AI-powered insights
          </p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No Leads Yet</h3>
          <p>
            Leads are captured through Meta Lead Forms and Landing Page forms
          </p>
        </div>
      ) : (
        <>
          <div className="leads-stats">
            <div className="stats-box">
              <div className="stats-value">{leads.length}</div>
              <div className="stats-label">Total Leads</div>
            </div>
            <div className="stats-box">
              <div className="stats-value">
                {leads.filter((l) => l.profile?.interest_level === 'high').length}
              </div>
              <div className="stats-label">High Interest</div>
            </div>
            <div className="stats-box">
              <div className="stats-value">
                {leads.filter((l) => l.source === 'meta_lead_form').length}
              </div>
              <div className="stats-label">From Ads</div>
            </div>
            <div className="stats-box">
              <div className="stats-value">
                {leads.filter((l) => l.source === 'landing_form').length}
              </div>
              <div className="stats-label">From Landing Pages</div>
            </div>
          </div>

          <div className="leads-table-container">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Interest</th>
                  <th>Sentiment</th>
                  <th>Segments</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
                    <td>
                      <div className="lead-name">
                        {lead.name || 'Anonymous'}
                      </div>
                    </td>
                    <td>
                      <div className="lead-email">{lead.email || 'N/A'}</div>
                    </td>
                    <td>
                      <span className="source-badge">
                        {sourceLabels[lead.source]}
                      </span>
                    </td>
                    <td>
                      {lead.profile ? (
                        <span
                          className="interest-badge"
                          style={{
                            background: interestColors[lead.profile.interest_level],
                          }}
                        >
                          {lead.profile.interest_level}
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      {lead.profile?.sentiment ? (
                        <span
                          className="sentiment-badge"
                          style={{
                            background: sentimentColors[lead.profile.sentiment],
                          }}
                        >
                          {lead.profile.sentiment}
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      {lead.profile?.segments && lead.profile.segments.length > 0 ? (
                        <div className="segments-list">
                          {lead.profile.segments.slice(0, 2).map((segment, idx) => (
                            <span key={idx} className="segment-tag">
                              {segment}
                            </span>
                          ))}
                          {lead.profile.segments.length > 2 && (
                            <span className="segment-tag more">
                              +{lead.profile.segments.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      <div className="lead-date">
                        {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedLead && (
        <div className="detail-modal" onClick={() => setSelectedLead(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Lead Details</h2>
              <button className="close-btn" onClick={() => setSelectedLead(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="lead-info-section">
                <h3>Contact Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{selectedLead.name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{selectedLead.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Source:</span>
                    <span className="info-value">{sourceLabels[selectedLead.source]}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created:</span>
                    <span className="info-value">
                      {format(new Date(selectedLead.created_at), 'PPP')}
                    </span>
                  </div>
                </div>
              </div>

              {selectedLead.profile && (
                <div className="lead-info-section">
                  <h3>User Profile (AI-Enriched)</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Interest Level:</span>
                      <span
                        className="info-badge"
                        style={{
                          background: interestColors[selectedLead.profile.interest_level],
                        }}
                      >
                        {selectedLead.profile.interest_level}
                      </span>
                    </div>
                    {selectedLead.profile.sentiment && (
                      <div className="info-item">
                        <span className="info-label">Sentiment:</span>
                        <span
                          className="info-badge"
                          style={{
                            background: sentimentColors[selectedLead.profile.sentiment],
                          }}
                        >
                          {selectedLead.profile.sentiment}
                        </span>
                      </div>
                    )}
                    {selectedLead.profile.budget_band && (
                      <div className="info-item">
                        <span className="info-label">Budget Band:</span>
                        <span className="info-value">{selectedLead.profile.budget_band}</span>
                      </div>
                    )}
                  </div>

                  {selectedLead.profile.segments.length > 0 && (
                    <div className="profile-section">
                      <h4>Segments</h4>
                      <div className="tags-container">
                        {selectedLead.profile.segments.map((segment, idx) => (
                          <span key={idx} className="tag">
                            {segment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLead.profile.problem_tags.length > 0 && (
                    <div className="profile-section">
                      <h4>Problem Tags</h4>
                      <div className="tags-container">
                        {selectedLead.profile.problem_tags.map((tag, idx) => (
                          <span key={idx} className="tag problem-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedLead.profile.feature_requests.length > 0 && (
                    <div className="profile-section">
                      <h4>Feature Requests</h4>
                      <div className="tags-container">
                        {selectedLead.profile.feature_requests.map((feature, idx) => (
                          <span key={idx} className="tag feature-tag">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedLead.raw_form_data && (
                <div className="lead-info-section">
                  <h3>Raw Form Data</h3>
                  <pre className="raw-data">
                    {JSON.stringify(selectedLead.raw_form_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
