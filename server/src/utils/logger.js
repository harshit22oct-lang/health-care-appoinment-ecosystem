// ============================================================
// UTIL — Structured Logger with levels & colours
// ============================================================
'use strict';

const env = require('../config/env');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLOURS = {
  error: '\x1b[31m', // red
  warn:  '\x1b[33m', // yellow
  info:  '\x1b[36m', // cyan
  debug: '\x1b[35m', // magenta
  reset: '\x1b[0m',
};

const currentLevel = env.isDev ? LEVELS.debug : LEVELS.info;

const format = (level, message, meta) => {
  const ts = new Date().toISOString();
  const colour = COLOURS[level] || '';
  const reset = COLOURS.reset;
  const metaStr = meta ? `\n  ${JSON.stringify(meta, null, 2)}` : '';
  return `${colour}[${ts}] [${level.toUpperCase()}] ${message}${reset}${metaStr}`;
};

const createLogger = () => {
  const log = (level, message, meta) => {
    if (LEVELS[level] <= currentLevel) {
      const output = format(level, message, meta);
      if (level === 'error') {
        console.error(output);
      } else {
        console.log(output);
      }
    }
  };

  return {
    error: (msg, meta) => log('error', msg, meta),
    warn:  (msg, meta) => log('warn', msg, meta),
    info:  (msg, meta) => log('info', msg, meta),
    debug: (msg, meta) => log('debug', msg, meta),
  };
};

module.exports = createLogger();
