const chalk = require('./theme');

const formatter = {
  bytes(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
  },

  bitsPerSecond(bps) {
    if (bps === 0) return '0 bps';
    const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(1000));
    return parseFloat((bps / Math.pow(1000, i)).toFixed(2)) + ' ' + units[i];
  },

  ms(ms) {
    if (ms === null || ms === undefined) return chalk.gray('N/A');
    if (ms < 1) return chalk.green('<1ms');
    if (ms < 50) return chalk.green(`${ms.toFixed(1)} ms`);
    if (ms < 150) return chalk.yellow(`${ms.toFixed(1)} ms`);
    return chalk.red(`${ms.toFixed(1)} ms`);
  },

  packetLoss(percentage) {
    if (percentage === 0) return chalk.green('0%');
    if (percentage < 5) return chalk.yellow(`${percentage.toFixed(1)}%`);
    return chalk.red(`${percentage.toFixed(1)}%`);
  },

  status(online) {
    return online ? chalk.green('Online') : chalk.red('Offline');
  },

  percentage(value) {
    if (value >= 90) return chalk.green(`${value.toFixed(1)}%`);
    if (value >= 70) return chalk.yellow(`${value.toFixed(1)}%`);
    return chalk.red(`${value.toFixed(1)}%`);
  },

  portStatus(open) {
    return open ? chalk.green('Open') : chalk.red('Closed');
  },

  deviceIP(ip) {
    const network = require('./network');
    if (network.isLocalIP(ip)) {
      return chalk.cyan(ip) + ' ' + chalk.yellow('(this PC)');
    }
    return chalk.cyan(ip);
  },

  heading(text) {
    console.log(chalk.bold.cyan(`\n  ${text}\n`));
  },

  labelValue(label, value) {
    console.log(`  ${chalk.bold(label.padEnd(15))} ${value}`);
  },

  keyValue(key, value) {
    console.log(`  ${chalk.cyan(key)}: ${value}`);
  },

  divider() {
    console.log(chalk.gray('  \u2500'.repeat(Math.min(30, process.stdout.columns / 2 || 30))));
  }
};

module.exports = formatter;
