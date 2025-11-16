import { useState, useEffect } from 'react';
import apiClient from '../services/api';
import type { OptimizationStatus, OptimizationConfig } from '../types';
import '../styles/OptimizationPanel.css';

interface OptimizationPanelProps {
  experimentId: string;
  isRunning: boolean;
}

export default function OptimizationPanel({ experimentId, isRunning }: OptimizationPanelProps) {
  const [status, setStatus] = useState<OptimizationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [config, setConfig] = useState<Partial<OptimizationConfig>>({});

  useEffect(() => {
    if (isRunning) {
      loadStatus();
    }
  }, [experimentId, isRunning]);

  // Update countdown every second
  useEffect(() => {
    if (!status?.next_optimization_at || !status.config.enabled) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const next = new Date(status.next_optimization_at!).getTime();
      const diff = next - now;

      if (diff <= 0) {
        setCountdown('Evaluating soon...');
        // Refresh status to get updated info
        loadStatus();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getOptimizationStatus(experimentId);
      setStatus(data);
      setConfig(data.config);
    } catch (err) {
      console.error('Error loading optimization status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOptimization = async () => {
    try {
      await apiClient.updateOptimizationConfig(experimentId, {
        enabled: !status?.config.enabled,
      });
      await loadStatus();
    } catch (err) {
      console.error('Error toggling optimization:', err);
      alert('Failed to update optimization settings');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await apiClient.updateOptimizationConfig(experimentId, config);
      await loadStatus();
      setShowSettings(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save optimization settings');
    }
  };

  const handleManualEvaluation = async () => {
    try {
      setEvaluating(true);
      const result = await apiClient.triggerOptimizationEvaluation(experimentId);
      alert(
        `Evaluation complete!\n\n` +
        `✅ Evaluated: ${result.variants_evaluated} variants\n` +
        `⏸️ Paused: ${result.variants_paused} underperforming\n` +
        `🚀 Launched: ${result.variants_launched} new variants`
      );
      await loadStatus();
    } catch (err) {
      console.error('Error triggering evaluation:', err);
      alert('Failed to trigger evaluation: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setEvaluating(false);
    }
  };

  if (!isRunning || loading) {
    return null;
  }

  if (!status) {
    return null;
  }

  return (
    <div className="optimization-panel">
      <div className="optimization-header">
        <div className="optimization-title">
          <span className="optimization-icon">🤖</span>
          <span>Auto-Optimization</span>
          <div className={`optimization-toggle ${status.config.enabled ? 'enabled' : 'disabled'}`}>
            <label className="switch">
              <input
                type="checkbox"
                checked={status.config.enabled}
                onChange={handleToggleOptimization}
              />
              <span className="slider"></span>
            </label>
            <span className="toggle-label">
              {status.config.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
        <button
          className="btn-settings"
          onClick={() => setShowSettings(!showSettings)}
          title="Configure optimization settings"
        >
          ⚙️ Settings
        </button>
      </div>

      {status.config.enabled && (
        <>
          <div className="optimization-stats">
            <div className="optimization-stat">
              <div className="stat-label">Next Evaluation</div>
              <div className="stat-value countdown">
                {countdown || 'Calculating...'}
              </div>
            </div>
            <div className="optimization-stat">
              <div className="stat-label">Interval</div>
              <div className="stat-value">
                {status.config.evaluation_interval_hours}h
              </div>
            </div>
            <div className="optimization-stat">
              <div className="stat-label">Last Run</div>
              <div className="stat-value">
                {status.last_optimization_at
                  ? new Date(status.last_optimization_at).toLocaleString()
                  : 'Not yet'}
              </div>
            </div>
          </div>

          <div className="optimization-actions">
            <button
              className="btn-evaluate"
              onClick={handleManualEvaluation}
              disabled={evaluating}
            >
              {evaluating ? '⏳ Evaluating...' : '▶️ Evaluate Now'}
            </button>
          </div>
        </>
      )}

      {showSettings && (
        <div className="settings-panel">
          <h4>Optimization Settings</h4>

          <div className="setting-group">
            <label>
              Evaluation Interval (hours)
              <input
                type="number"
                min="1"
                max="168"
                value={config.evaluation_interval_hours || 24}
                onChange={(e) =>
                  setConfig({ ...config, evaluation_interval_hours: Number(e.target.value) })
                }
              />
            </label>
            <span className="setting-help">How often to check ad performance (1-168 hours)</span>
          </div>

          <div className="setting-group">
            <label>
              CPL Multiplier
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={config.cpl_multiplier || 1.5}
                onChange={(e) =>
                  setConfig({ ...config, cpl_multiplier: Number(e.target.value) })
                }
              />
            </label>
            <span className="setting-help">
              Pause ads if CPL exceeds target × this multiplier
            </span>
          </div>

          <div className="setting-group">
            <label>
              Min Impressions Threshold
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={config.min_impressions_threshold || 1000}
                onChange={(e) =>
                  setConfig({ ...config, min_impressions_threshold: Number(e.target.value) })
                }
              />
            </label>
            <span className="setting-help">
              Minimum impressions before evaluating performance
            </span>
          </div>

          <div className="setting-group">
            <label>
              Min Leads for Decision
              <input
                type="number"
                min="1"
                max="100"
                value={config.min_leads_for_decision || 5}
                onChange={(e) =>
                  setConfig({ ...config, min_leads_for_decision: Number(e.target.value) })
                }
              />
            </label>
            <span className="setting-help">
              Minimum leads before pausing underperforming ads
            </span>
          </div>

          <div className="setting-group">
            <label>
              Max Variants per Experiment
              <input
                type="number"
                min="1"
                max="20"
                value={config.max_variants_per_experiment || 10}
                onChange={(e) =>
                  setConfig({ ...config, max_variants_per_experiment: Number(e.target.value) })
                }
              />
            </label>
            <span className="setting-help">
              Maximum total ad variants to maintain
            </span>
          </div>

          <div className="setting-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.auto_relaunch !== false}
                onChange={(e) =>
                  setConfig({ ...config, auto_relaunch: e.target.checked })
                }
              />
              Auto-relaunch new variants to replace paused ones
            </label>
          </div>

          <div className="setting-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={config.pause_underperforming !== false}
                onChange={(e) =>
                  setConfig({ ...config, pause_underperforming: e.target.checked })
                }
              />
              Automatically pause underperforming ads
            </label>
          </div>

          <div className="settings-actions">
            <button className="btn-secondary" onClick={() => setShowSettings(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveSettings}>
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
