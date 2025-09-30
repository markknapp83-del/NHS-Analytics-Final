/**
 * Security monitoring utilities for public deployment
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private queryLog: Array<{timestamp: Date, query: string, result: 'success' | 'error'}> = []

  static getInstance() {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }

  /**
   * Log database query attempts
   */
  logQuery(query: string, success: boolean) {
    this.queryLog.push({
      timestamp: new Date(),
      query: query.substring(0, 100), // Truncate for privacy
      result: success ? 'success' : 'error'
    })

    // Keep only last 100 entries
    if (this.queryLog.length > 100) {
      this.queryLog = this.queryLog.slice(-100)
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const total = this.queryLog.length
    const errors = this.queryLog.filter(log => log.result === 'error').length
    const recent = this.queryLog.slice(-10)

    return {
      totalQueries: total,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      recentQueries: recent,
      lastQuery: this.queryLog[this.queryLog.length - 1]?.timestamp
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  checkForAnomalies() {
    const recentErrors = this.queryLog
      .slice(-20) // Last 20 queries
      .filter(log => log.result === 'error').length

    if (recentErrors > 10) {
      console.warn('High error rate detected - possible security issue')
      return { anomaly: true, type: 'high_error_rate', count: recentErrors }
    }

    return { anomaly: false }
  }
}

export default SecurityMonitor