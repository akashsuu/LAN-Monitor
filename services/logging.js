const fs = require('fs');
const path = require('path');
const store = require('../config/store');

const logDir = store.getLogDir();

function getLogFile(type) {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logDir, `${type}-${date}.log`);
}

function formatLog(level, message, data) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ' ' + JSON.stringify(data) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}\n`;
}

function write(level, message, data) {
  try {
    const config = store.getConfig();
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const configLevel = levels[config.logLevel] !== undefined ? levels[config.logLevel] : 2;
    if (levels[level] === undefined || levels[level] > configLevel) return;
    const logFile = getLogFile(level);
    fs.appendFileSync(logFile, formatLog(level, message, data), 'utf8');
    const maxDays = config.maxLogDays || 30;
    cleanupOldLogs(maxDays);
  } catch {}
}

function cleanupOldLogs(maxDays) {
  try {
    const now = Date.now();
    const files = fs.readdirSync(logDir);
    for (const file of files) {
      const filePath = path.join(logDir, file);
      const stat = fs.statSync(filePath);
      const age = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
      if (age > maxDays) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {}
}

const logger = {
  info(msg, data) { write('info', msg, data); },
  warn(msg, data) { write('warn', msg, data); },
  error(msg, data) { write('error', msg, data); },
  debug(msg, data) { write('debug', msg, data); },

  getLogs(type, lines = 50) {
    try {
      const logFile = getLogFile(type || 'info');
      if (!fs.existsSync(logFile)) return [];
      const content = fs.readFileSync(logFile, 'utf8');
      const allLines = content.trim().split('\n').filter(Boolean);
      return allLines.slice(-lines);
    } catch {
      return [];
    }
  },

  getLogFiles() {
    try {
      return fs.readdirSync(logDir).sort().reverse();
    } catch {
      return [];
    }
  }
};

module.exports = logger;
