// ============================================================
// UTIL — Generic Circuit Breaker
// ============================================================
'use strict';

const logger = require('./logger');

const STATES = {
  CLOSED: 'CLOSED',       // Normal operation — calls pass through
  OPEN: 'OPEN',           // Circuit tripped — calls blocked immediately
  HALF_OPEN: 'HALF_OPEN', // Recovery probe — single test call allowed
};

class CircuitBreaker {
  /**
   * @param {string} name               Identifier for logging
   * @param {object} opts
   * @param {number} opts.threshold     Failures before opening circuit (default: 3)
   * @param {number} opts.windowMs      Sliding window in ms (default: 60000)
   * @param {number} opts.halfOpenDelay Ms to wait before testing recovery (default: 30000)
   */
  constructor(name, opts = {}) {
    this.name = name;
    this.threshold = opts.threshold || 3;
    this.windowMs = opts.windowMs || 60000;
    this.halfOpenDelay = opts.halfOpenDelay || 30000;

    this.state = STATES.CLOSED;
    this.failures = [];     // timestamps of recent failures
    this.openedAt = null;
  }

  _pruneOldFailures() {
    const cutoff = Date.now() - this.windowMs;
    this.failures = this.failures.filter((ts) => ts > cutoff);
  }

  _recordFailure() {
    this.failures.push(Date.now());
    this._pruneOldFailures();
    if (this.failures.length >= this.threshold) {
      this.state = STATES.OPEN;
      this.openedAt = Date.now();
      logger.warn(`[CircuitBreaker:${this.name}] OPEN — ${this.failures.length} failures in window.`);
    }
  }

  _recordSuccess() {
    this.failures = [];
    this.state = STATES.CLOSED;
    logger.info(`[CircuitBreaker:${this.name}] CLOSED — recovered.`);
  }

  isOpen() {
    if (this.state === STATES.OPEN) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.halfOpenDelay) {
        this.state = STATES.HALF_OPEN;
        logger.info(`[CircuitBreaker:${this.name}] HALF_OPEN — probing recovery.`);
        return false; // Allow one test call
      }
      return true; // Still open
    }
    return false;
  }

  /**
   * Execute a function through the circuit breaker.
   * @param {Function} fn           Async function to execute
   * @param {Function} fallbackFn   Optional fallback function on failure/open
   */
  async execute(fn, fallbackFn = null) {
    if (this.isOpen()) {
      logger.warn(`[CircuitBreaker:${this.name}] OPEN — using fallback.`);
      if (fallbackFn) return fallbackFn(new Error('Circuit breaker is OPEN'));
      throw new Error(`Service ${this.name} is temporarily unavailable`);
    }

    try {
      const result = await fn();
      if (this.state === STATES.HALF_OPEN) {
        this._recordSuccess();
      }
      return result;
    } catch (err) {
      this._recordFailure();
      logger.error(`[CircuitBreaker:${this.name}] Failure recorded: ${err.message}`);
      if (fallbackFn) return fallbackFn(err);
      throw err;
    }
  }

  getState() {
    return this.state;
  }
}

module.exports = CircuitBreaker;
