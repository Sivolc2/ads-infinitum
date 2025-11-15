import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import apiClient from '../services/api';
import type { LandingPage } from '../types';
import '../styles/LandingPages.css';

export default function LandingPages() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');

  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
  }, [productId]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getLandingPages(productId || undefined);
      setPages(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load landing pages');
      console.error('Error loading landing pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (pageId: string) => {
    try {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      await apiClient.updateLandingPage(pageId, {
        likes_count: page.likes_count + 1,
      });
      await loadPages();
    } catch (err) {
      console.error('Error updating likes:', err);
    }
  };

  const handleDislike = async (pageId: string) => {
    try {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      await apiClient.updateLandingPage(pageId, {
        dislikes_count: page.dislikes_count + 1,
      });
      await loadPages();
    } catch (err) {
      console.error('Error updating dislikes:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading landing pages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <h3>Error Loading Landing Pages</h3>
          <p>{error}</p>
          <button onClick={loadPages} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Landing Pages</h1>
          <p className="page-description">
            Kickstarter-style pages for validated products
          </p>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚀</div>
          <h3>No Landing Pages Yet</h3>
          <p>
            Landing pages are automatically created when products hit their validation thresholds
          </p>
        </div>
      ) : (
        <div className="landing-pages-grid">
          {pages.map((page) => (
            <div key={page.id} className="landing-page-card">
              <div className="page-hero">
                <img
                  src={page.hero_image_url}
                  alt="Hero"
                  className="hero-image"
                />
              </div>

              <div className="page-content">
                <div className="page-pitch">
                  <div
                    className="pitch-markdown"
                    dangerouslySetInnerHTML={{
                      __html: page.pitch_markdown.replace(/\n/g, '<br />'),
                    }}
                  />
                </div>

                {page.gallery_image_urls.length > 0 && (
                  <div className="gallery">
                    <h4>Gallery</h4>
                    <div className="gallery-grid">
                      {page.gallery_image_urls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Gallery ${idx + 1}`}
                          className="gallery-image"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {page.estimate_cost_to_deliver_usd && (
                  <div className="cost-estimate">
                    <div className="cost-label">Estimated Development Cost:</div>
                    <div className="cost-value">
                      ${page.estimate_cost_to_deliver_usd.toLocaleString()}
                    </div>
                  </div>
                )}

                <div className="page-cta">
                  <button className="cta-button">{page.call_to_action}</button>
                </div>

                <div className="feedback-section">
                  <button
                    className="feedback-btn like-btn"
                    onClick={() => handleLike(page.id)}
                  >
                    👍 {page.likes_count}
                  </button>
                  <button
                    className="feedback-btn dislike-btn"
                    onClick={() => handleDislike(page.id)}
                  >
                    👎 {page.dislikes_count}
                  </button>
                </div>

                <div className="page-footer">
                  <a
                    href={page.lovable_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lovable-link"
                  >
                    🔗 View on Lovable →
                  </a>
                  <div className="page-date">
                    Created {format(new Date(page.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
