const chalk = require('chalk');
const store = require('../config/store');
const formatter = require('../utils/formatter');

const alertsCommand = {
  execute(options) {
    if (options && options.clear) {
      this.clear();
      return;
    }
    if (options && options.enable) {
      this.enable();
      return;
    }
    if (options && options.disable) {
      this.disable();
      return;
    }
    this.list();
  },

  list() {
    const config = store.getConfig();
    const alerts = store.getAlerts();
    console.log('');
    formatter.heading('Alerts');
    if (!config.alertsEnabled) {
      console.log(`  ${chalk.yellow('\u26A0 Alerts are currently disabled.')}\n`);
    }
    if (alerts.length === 0) {
      console.log(`  ${chalk.gray('No alerts recorded.')}\n`);
      return;
    }
    for (const alert of alerts.slice(0, 20)) {
      const icon = alert.severity === 'critical' ? chalk.red('\u25CF') :
                   alert.severity === 'warning' ? chalk.yellow('\u25CF') :
                   chalk.blue('\u25CF');
      const time = new Date(alert.timestamp).toLocaleString();
      console.log(`  ${icon} ${chalk.bold(alert.title)}`);
      console.log(`    ${chalk.gray(time)} - ${alert.message}`);
    }
    if (alerts.length > 20) {
      console.log(`  ${chalk.gray(`... and ${alerts.length - 20} more`)}`);
    }
    console.log('');
  },

  clear() {
    store.clearAlerts();
    console.log(chalk.green('\n  \u2713 All alerts cleared.\n'));
  },

  enable() {
    store.setConfig('alertsEnabled', true);
    console.log(chalk.green('\n  \u2713 Alerts enabled.\n'));
  },

  disable() {
    store.setConfig('alertsEnabled', false);
    console.log(chalk.yellow('\n  \u26A0 Alerts disabled.\n'));
  }
};

module.exports = alertsCommand;
