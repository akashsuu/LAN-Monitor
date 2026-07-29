const chalk = require('chalk');
const store = require('../config/store');
const formatter = require('../utils/formatter');

const configCommand = {
  show() {
    const config = store.getConfig();
    console.log('');
    formatter.heading('Configuration');
    for (const [key, value] of Object.entries(config)) {
      const displayValue = typeof value === 'boolean' ? (value ? chalk.green('true') : chalk.red('false')) : chalk.cyan(String(value));
      console.log(`  ${chalk.bold(key.padEnd(20))} ${displayValue}`);
    }
    console.log('');
  },

  set(key, value) {
    if (!key || !value) {
      console.log(chalk.red('  Error: Please provide key and value.'));
      console.log(chalk.gray('  Usage: ln config set <key> <value>'));
      return;
    }
    let parsedValue = value;
    if (value === 'true') parsedValue = true;
    else if (value === 'false') parsedValue = false;
    else if (!isNaN(value) && value.trim() !== '') parsedValue = Number(value);
    const success = store.setConfig(key, parsedValue);
    if (success) {
      console.log(chalk.green(`\n  \u2713 Config updated: ${chalk.cyan(key)} = ${chalk.cyan(String(parsedValue))}\n`));
    } else {
      console.log(chalk.red(`\n  \u2717 Failed to update config: ${key}\n`));
    }
  },

  reset() {
    store.resetConfig();
    console.log(chalk.green('\n  \u2713 Configuration reset to defaults.\n'));
  }
};

module.exports = configCommand;
