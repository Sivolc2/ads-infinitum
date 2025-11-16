/**
 * Scheduled Worker for Ad Optimization
 *
 * This cron job runs periodically to evaluate all running experiments
 * and automatically optimize ad performance based on configured rules.
 *
 * Configuration in wrangler.toml:
 * [triggers]
 * crons = ["0 * * * *"]  # Run every hour
 */

import { AdExperimentManager } from '../services/experiment-service';
import { MetricsCollectorService } from '../services/metrics-service';
import { AdOptimizerService } from '../services/ad-optimizer';

interface Env {
  AD_DATA: any;
  APP_CACHE: any;
  AI: any;
}

export default {
  /**
   * Scheduled event handler
   * This function is called on the configured cron schedule
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('🤖 Starting scheduled ad optimization...');
    const startTime = Date.now();

    try {
      // Initialize services
      const experimentManager = new AdExperimentManager(env.AD_DATA, env.APP_CACHE);
      const metricsService = new MetricsCollectorService(env.AD_DATA);
      const optimizerService = new AdOptimizerService(experimentManager, metricsService);

      // Get all running experiments with optimization enabled
      const allExperiments = await experimentManager.listExperiments();
      const eligibleExperiments = allExperiments.filter(
        (exp) =>
          exp.status === 'running' &&
          exp.optimization_config?.enabled &&
          exp.next_optimization_at &&
          new Date(exp.next_optimization_at).getTime() <= Date.now()
      );

      console.log(`📊 Found ${eligibleExperiments.length} experiments ready for evaluation`);

      // Track results
      const results = {
        total_experiments_evaluated: 0,
        total_variants_paused: 0,
        total_variants_launched: 0,
        errors: [] as string[],
      };

      // Evaluate each eligible experiment
      for (const experiment of eligibleExperiments) {
        try {
          console.log(`🔍 Evaluating experiment ${experiment.id} (${experiment.product_id})...`);

          const result = await optimizerService.evaluateExperiment(experiment.id);

          results.total_experiments_evaluated++;
          results.total_variants_paused += result.variants_paused;
          results.total_variants_launched += result.variants_launched;

          console.log(
            `✅ Experiment ${experiment.id}: ` +
            `${result.variants_evaluated} evaluated, ` +
            `${result.variants_paused} paused, ` +
            `${result.variants_launched} launched`
          );

          // Log significant actions
          if (result.variants_paused > 0 || result.variants_launched > 0) {
            console.log(`📝 Decisions for ${experiment.id}:`);
            result.decisions.forEach((decision) => {
              if (decision.action !== 'keep') {
                console.log(
                  `  ${decision.action === 'pause' ? '⏸️' : '🚀'} ` +
                  `${decision.action.toUpperCase()}: ${decision.headline.substring(0, 50)}... ` +
                  `(${decision.reason})`
                );
              }
            });
          }
        } catch (error) {
          const errorMsg = `Failed to evaluate experiment ${experiment.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;

      // Log summary
      console.log('');
      console.log('📈 Optimization Summary:');
      console.log(`  ✅ Experiments evaluated: ${results.total_experiments_evaluated}`);
      console.log(`  ⏸️  Variants paused: ${results.total_variants_paused}`);
      console.log(`  🚀 Variants launched: ${results.total_variants_launched}`);
      console.log(`  ⏱️  Duration: ${duration}ms`);

      if (results.errors.length > 0) {
        console.log(`  ⚠️  Errors: ${results.errors.length}`);
        results.errors.forEach((err) => console.log(`    - ${err}`));
      }

      console.log('✅ Scheduled optimization complete');
    } catch (error) {
      console.error('❌ Fatal error in scheduled optimization:', error);
      throw error;
    }
  },

  /**
   * Optional: HTTP endpoint to manually trigger optimization
   * This can be called via a POST request for testing or manual triggers
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed. Use POST to trigger optimization.', {
        status: 405,
      });
    }

    console.log('🔄 Manual optimization trigger received');

    try {
      // Initialize services
      const experimentManager = new AdExperimentManager(env.AD_DATA, env.APP_CACHE);
      const metricsService = new MetricsCollectorService(env.AD_DATA);
      const optimizerService = new AdOptimizerService(experimentManager, metricsService);

      // Evaluate all experiments (ignoring schedule)
      const results = await optimizerService.evaluateAllExperiments();

      const totalPaused = results.reduce((sum, r) => sum + r.variants_paused, 0);
      const totalLaunched = results.reduce((sum, r) => sum + r.variants_launched, 0);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Manual optimization complete',
          data: {
            experiments_evaluated: results.length,
            total_variants_paused: totalPaused,
            total_variants_launched: totalLaunched,
            results,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('❌ Error in manual optimization:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Optimization failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
