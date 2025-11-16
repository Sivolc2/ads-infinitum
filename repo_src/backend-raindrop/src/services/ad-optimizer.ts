import { z } from 'zod';
import { AdExperimentManager } from './experiment-service';
import { MetricsCollectorService } from './metrics-service';
import { generateAdVariants } from './ad-variant-generator';
import type { AdExperiment, AdVariant, AdMetricsSnapshot } from '../models';

// Optimization configuration schema
export const OptimizationConfigSchema = z.object({
  enabled: z.boolean(),
  evaluation_interval_hours: z.number().min(1).max(168), // 1 hour to 7 days
  min_impressions_threshold: z.number().min(100).default(1000),
  cpl_multiplier: z.number().min(1).default(1.5), // Pause if CPL > target * multiplier
  min_leads_for_decision: z.number().min(1).default(5),
  auto_relaunch: z.boolean().default(true),
  max_variants_per_experiment: z.number().min(1).max(20).default(10),
  pause_underperforming: z.boolean().default(true),
});

export type OptimizationConfig = z.infer<typeof OptimizationConfigSchema>;

// Optimization result tracking
export interface OptimizationResult {
  experiment_id: string;
  evaluated_at: string;
  next_evaluation_at: string;
  variants_evaluated: number;
  variants_paused: number;
  variants_launched: number;
  decisions: Array<{
    ad_id: string;
    headline: string;
    action: 'keep' | 'pause' | 'launch';
    reason: string;
    metrics?: AdMetricsSnapshot;
  }>;
}

// Default configuration
export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  enabled: false,
  evaluation_interval_hours: 24,
  min_impressions_threshold: 1000,
  cpl_multiplier: 1.5,
  min_leads_for_decision: 5,
  auto_relaunch: true,
  max_variants_per_experiment: 10,
  pause_underperforming: true,
};

/**
 * AdOptimizerService - Automatically evaluates and optimizes ad performance
 *
 * This service:
 * - Evaluates ad variants based on performance metrics
 * - Pauses underperforming ads automatically
 * - Launches new variants when underperformers are removed
 * - Tracks optimization history and schedules next evaluations
 */
export class AdOptimizerService {
  private experimentManager: AdExperimentManager;
  private metricsService: MetricsCollectorService;

  constructor(
    experimentManager: AdExperimentManager,
    metricsService: MetricsCollectorService
  ) {
    this.experimentManager = experimentManager;
    this.metricsService = metricsService;
  }

  /**
   * Evaluate and optimize all running experiments
   */
  async evaluateAllExperiments(): Promise<OptimizationResult[]> {
    const allExperiments = await this.experimentManager.listExperiments();
    const runningExperiments = allExperiments.filter(
      (exp) => exp.status === 'running' && exp.optimization_config?.enabled
    );

    const results: OptimizationResult[] = [];

    for (const experiment of runningExperiments) {
      try {
        const result = await this.evaluateExperiment(experiment.id);
        results.push(result);
      } catch (error) {
        console.error(
          `Failed to evaluate experiment ${experiment.id}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Evaluate a single experiment and take optimization actions
   */
  async evaluateExperiment(experimentId: string): Promise<OptimizationResult> {
    const experiment = await this.experimentManager.getExperiment(experimentId);

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const config = experiment.optimization_config || DEFAULT_OPTIMIZATION_CONFIG;

    if (!config.enabled) {
      throw new Error(`Optimization not enabled for experiment ${experimentId}`);
    }

    const variants = await this.experimentManager.listAdVariantsByExperiment(
      experimentId
    );
    const activeVariants = variants.filter((v) => v.status === 'active');

    const decisions: OptimizationResult['decisions'] = [];
    let variantsPaused = 0;
    let variantsLaunched = 0;

    // Evaluate each active variant
    for (const variant of activeVariants) {
      const latestMetrics = await this.metricsService.getLatestSnapshot(
        variant.id
      );

      if (!latestMetrics) {
        decisions.push({
          ad_id: variant.id,
          headline: variant.headline,
          action: 'keep',
          reason: 'No metrics available yet',
        });
        continue;
      }

      // Check if variant has enough data for evaluation
      if (latestMetrics.impressions < config.min_impressions_threshold) {
        decisions.push({
          ad_id: variant.id,
          headline: variant.headline,
          action: 'keep',
          reason: `Insufficient impressions (${latestMetrics.impressions} < ${config.min_impressions_threshold})`,
          metrics: latestMetrics,
        });
        continue;
      }

      // Check if variant meets minimum leads requirement
      if (latestMetrics.leads < config.min_leads_for_decision) {
        decisions.push({
          ad_id: variant.id,
          headline: variant.headline,
          action: 'keep',
          reason: `Insufficient leads (${latestMetrics.leads} < ${config.min_leads_for_decision})`,
          metrics: latestMetrics,
        });
        continue;
      }

      // Evaluate performance against CPL threshold
      const targetCpl = experiment.target_cpl_threshold_usd;
      const maxAcceptableCpl = targetCpl * config.cpl_multiplier;
      const actualCpl = latestMetrics.cpl_usd || 0;

      if (config.pause_underperforming && actualCpl > maxAcceptableCpl) {
        // Pause underperforming variant
        await this.experimentManager.updateAdVariant({
          id: variant.id,
          status: 'paused',
        });

        decisions.push({
          ad_id: variant.id,
          headline: variant.headline,
          action: 'pause',
          reason: `CPL $${actualCpl.toFixed(2)} exceeds threshold $${maxAcceptableCpl.toFixed(2)} (target: $${targetCpl.toFixed(2)})`,
          metrics: latestMetrics,
        });

        variantsPaused++;
      } else {
        decisions.push({
          ad_id: variant.id,
          headline: variant.headline,
          action: 'keep',
          reason: `Performing well: CPL $${actualCpl.toFixed(2)} within threshold $${maxAcceptableCpl.toFixed(2)}`,
          metrics: latestMetrics,
        });
      }
    }

    // Launch new variants if we paused some and auto-relaunch is enabled
    if (
      config.auto_relaunch &&
      variantsPaused > 0 &&
      variants.length < config.max_variants_per_experiment
    ) {
      const variantsToGenerate = Math.min(
        variantsPaused,
        config.max_variants_per_experiment - variants.length
      );

      try {
        // Get product concept
        const product = experiment.product_id
          ? await this.experimentManager['productService'].getProduct(
              experiment.product_id
            )
          : null;

        if (product) {
          // Generate new ad variants
          const newVariants = await generateAdVariants(
            product,
            variantsToGenerate
          );

          // Create each new variant
          for (const variantData of newVariants) {
            const newVariant = await this.experimentManager.createAdVariant({
              experiment_id: experimentId,
              product_id: experiment.product_id!,
              platform: 'meta',
              headline: variantData.headline,
              body: variantData.body,
              image_url: variantData.image_url,
              cta: variantData.cta,
              status: 'active',
              created_by: 'agent',
            });

            decisions.push({
              ad_id: newVariant.id,
              headline: newVariant.headline,
              action: 'launch',
              reason: 'Launched to replace underperforming variant',
            });

            variantsLaunched++;
          }
        }
      } catch (error) {
        console.error('Failed to generate replacement variants:', error);
      }
    }

    // Calculate next evaluation time
    const evaluatedAt = new Date().toISOString();
    const nextEvaluationAt = new Date(
      Date.now() + config.evaluation_interval_hours * 60 * 60 * 1000
    ).toISOString();

    // Update experiment with last optimization metadata
    await this.experimentManager.updateExperiment({
      id: experimentId,
      last_optimization_at: evaluatedAt,
      next_optimization_at: nextEvaluationAt,
    });

    return {
      experiment_id: experimentId,
      evaluated_at: evaluatedAt,
      next_evaluation_at: nextEvaluationAt,
      variants_evaluated: activeVariants.length,
      variants_paused: variantsPaused,
      variants_launched: variantsLaunched,
      decisions,
    };
  }

  /**
   * Get optimization status for an experiment
   */
  async getOptimizationStatus(
    experimentId: string
  ): Promise<{
    config: OptimizationConfig;
    last_optimization_at?: string;
    next_optimization_at?: string;
    time_until_next_ms?: number;
  }> {
    const experiment = await this.experimentManager.getExperiment(experimentId);

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const config = experiment.optimization_config || DEFAULT_OPTIMIZATION_CONFIG;

    let timeUntilNext: number | undefined;
    if (experiment.next_optimization_at) {
      timeUntilNext = Math.max(
        0,
        new Date(experiment.next_optimization_at).getTime() - Date.now()
      );
    }

    return {
      config,
      last_optimization_at: experiment.last_optimization_at,
      next_optimization_at: experiment.next_optimization_at,
      time_until_next_ms: timeUntilNext,
    };
  }

  /**
   * Update optimization configuration for an experiment
   */
  async updateOptimizationConfig(
    experimentId: string,
    config: Partial<OptimizationConfig>
  ): Promise<void> {
    const experiment = await this.experimentManager.getExperiment(experimentId);

    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const currentConfig = experiment.optimization_config || DEFAULT_OPTIMIZATION_CONFIG;
    const newConfig = OptimizationConfigSchema.parse({
      ...currentConfig,
      ...config,
    });

    // Recalculate next optimization time if interval changed
    let nextOptimizationAt = experiment.next_optimization_at;
    if (
      newConfig.enabled &&
      config.evaluation_interval_hours !== undefined
    ) {
      const lastOptimization = experiment.last_optimization_at
        ? new Date(experiment.last_optimization_at)
        : new Date();

      nextOptimizationAt = new Date(
        lastOptimization.getTime() +
          newConfig.evaluation_interval_hours * 60 * 60 * 1000
      ).toISOString();
    }

    await this.experimentManager.updateExperiment({
      id: experimentId,
      optimization_config: newConfig,
      next_optimization_at: nextOptimizationAt,
    });
  }

  /**
   * Trigger immediate evaluation (manual trigger)
   */
  async triggerManualEvaluation(
    experimentId: string
  ): Promise<OptimizationResult> {
    return this.evaluateExperiment(experimentId);
  }
}
