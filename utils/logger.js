const fs = require('fs');
const path = require('path');
const chalk = require('./theme');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'lan-monitor.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatTimestamp() {
  return new Date().toISOString();
}

function writeToFile(level, message) {
  try {
    ensureLogDir();
    const line = `[${formatTimestamp()}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, line);
  } catch {
  }
}

const logger = {
  info(message) {
    console.log(chalk.blue('\u2139'), message);
    writeToFile('info', message);
  },

  success(message) {
    console.log(chalk.green('\u2714'), message);
    writeToFile('success', message);
  },

  warn(message) {
    console.log(chalk.yellow('\u26A0'), message);
    writeToFile('warn', message);
  },

  error(message) {
    console.log(chalk.red('\u2716'), message);
    writeToFile('error', message);
  },

  raw(message) {
    console.log(message);
  },

  debug(message) {
    if (process.env.LAN_DEBUG) {
      console.log(chalk.gray('\uD83D\uDD0D'), chalk.gray(message));
      writeToFile('debug', message);
    }
  },

  table(headers, rows) {
    const Table = require('cli-table3');
    const table = new Table({
      head: headers.map(h => chalk.cyan(h)),
      style: { head: [], border: [] },
      chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
    });
    rows.forEach(row => table.push(row));
    console.log(table.toString());
  },

  divider() {
    console.log(chalk.gray('\u2500'.repeat(process.stdout.columns || 60)));
  }
};

module.exports = logger;
