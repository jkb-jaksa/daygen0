import { debugLog, debugWarn } from './debug';

type AuthMetricType =
  | 'guard_redirect'           // RequireAuth redirects to /account
  | 'next_decode_failure'      // decodeURIComponent fails
  | 'next_sanitized'           // safeNext changed the path
  | 'next_protocol_rejected'   // Protocol (://) detected
  | 'next_credential_rejected' // @ character detected
  | 'auth_401_response'        // Received 401 from backend
  | 'auth_refresh_success'     // Successfully refreshed user
  | 'auth_refresh_failure';    // Failed to refresh user

type AuthMetric = {
  count: number;
  lastTimestamp: number;
};

type AuthMetrics = Record<AuthMetricType, AuthMetric>;

type AuthMetricsContext = {
  path?: string;
  error?: string;
  userAgent?: string;
  timestamp?: number;
};

class AuthMetricsTracker {
  private metrics: AuthMetrics;
  private readonly STORAGE_KEY = 'daygen_auth_metrics';
  private readonly MAX_CONTEXT_ENTRIES = 10;

  constructor() {
    this.metrics = this.initializeMetrics();
    this.restore();
    
    // Make available in development
    if (process.env.NODE_ENV === 'development') {
      (window as Window & { __authMetrics?: AuthMetricsCollector }).__authMetrics = this;
    }
  }

  private initializeMetrics(): AuthMetrics {
    const metricTypes: AuthMetricType[] = [
      'guard_redirect',
      'next_decode_failure', 
      'next_sanitized',
      'next_protocol_rejected',
      'next_credential_rejected',
      'auth_401_response',
      'auth_refresh_success',
      'auth_refresh_failure'
    ];

    return metricTypes.reduce((acc, type) => {
      acc[type] = { count: 0, lastTimestamp: 0 };
      return acc;
    }, {} as AuthMetrics);
  }

  increment(type: AuthMetricType, context?: string): void {
    const now = Date.now();
    this.metrics[type].count += 1;
    this.metrics[type].lastTimestamp = now;

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      debugLog(`[AUTH_METRICS] ${type}${context ? ` (${context})` : ''} - Count: ${this.metrics[type].count}`);
    }

    this.persist();
  }

  getMetrics(): AuthMetrics {
    return { ...this.metrics };
  }

  getTotalCount(): number {
    return Object.values(this.metrics).reduce((sum, metric) => sum + metric.count, 0);
  }

  getMetricsSummary(): string {
    const total = this.getTotalCount();
    if (total === 0) {
      return 'No auth metrics recorded yet.';
    }

    const summary = Object.entries(this.metrics)
      .filter(([, metric]) => metric.count > 0)
      .map(([type, metric]) => {
        const percentage = ((metric.count / total) * 100).toFixed(1);
        const lastOccurrence = new Date(metric.lastTimestamp).toLocaleString();
        return `${type}: ${metric.count} (${percentage}%) - Last: ${lastOccurrence}`;
      })
      .join('\n');

    return `Auth Metrics Summary (Total: ${total}):\n${summary}`;
  }

  logMetrics(): void {
    debugLog(this.getMetricsSummary());
    console.table(this.metrics);
  }

  reset(): void {
    this.metrics = this.initializeMetrics();
    this.persist();
    
    if (process.env.NODE_ENV === 'development') {
      debugLog('[AUTH_METRICS] Metrics reset');
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      // Silently fail if localStorage is not available
      if (process.env.NODE_ENV === 'development') {
        debugWarn('[AUTH_METRICS] Failed to persist metrics:', error);
      }
    }
  }

  private restore(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthMetrics;
        // Merge with defaults to handle new metric types
        this.metrics = { ...this.metrics, ...parsed };
      }
    } catch (error) {
      // Silently fail if localStorage is corrupted
      if (process.env.NODE_ENV === 'development') {
        debugWarn('[AUTH_METRICS] Failed to restore metrics:', error);
      }
    }
  }

  // Development helper methods
  getMetricCount(type: AuthMetricType): number {
    return this.metrics[type].count;
  }

  getLastOccurrence(type: AuthMetricType): Date | null {
    return this.metrics[type].lastTimestamp > 0 
      ? new Date(this.metrics[type].lastTimestamp) 
      : null;
  }

  // Export metrics for external analysis
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      totalCount: this.getTotalCount(),
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    }, null, 2);
  }
}

// Singleton instance
export const authMetrics = new AuthMetricsTracker();

// Development keyboard shortcut
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.addEventListener('keydown', (event) => {
    // Ctrl+Shift+M to show metrics
    if (event.ctrlKey && event.shiftKey && event.key === 'M') {
      event.preventDefault();
      authMetrics.logMetrics();
    }
    
    // Ctrl+Shift+R to reset metrics
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      authMetrics.reset();
      debugLog('[AUTH_METRICS] Metrics reset via keyboard shortcut');
    }
  });
}

export type { AuthMetricType, AuthMetric, AuthMetrics, AuthMetricsContext };
