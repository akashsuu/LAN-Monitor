const chalk = require('chalk');
const { exec } = require('child_process');
const store = require('../config/store');

const dashboardCommand = {
  async execute(options) {
    if (options && options.stop) {
      this.stop();
      return;
    }
    const config = store.getConfig();
    const port = config.dashboardPort || 3000;
    if (options && options.open) {
      this.open(port);
      return;
    }
    console.log('');
    console.log(`  ${chalk.bold('Dashboard')}`);
    console.log(`  ${chalk.gray('\u2500'.repeat(40))}`);
    console.log(`  The dashboard is a React-based web UI.`);
    console.log(`  To start: ${chalk.cyan('ln dashboard --open')}`);
    console.log(`  To stop:  ${chalk.cyan('ln dashboard --stop')}`);
    console.log(`  Port:     ${chalk.cyan(port)}`);
    console.log('');
  },

  open(port) {
    console.log(chalk.yellow(`\n  \u26A0 Dashboard requires React UI package to be built separately.`));
    console.log(`  ${chalk.gray('  To open dashboard, start the web server and navigate to:')}`);
    console.log(`  ${chalk.cyan(`  http://localhost:${port}`)}\n`);
    try {
      const url = `http://localhost:${port}`;
      const platform = process.platform;
      if (platform === 'win32') {
        exec(`start ${url}`);
      } else if (platform === 'darwin') {
        exec(`open ${url}`);
      } else {
        exec(`xdg-open ${url}`);
      }
    } catch {
      console.log(chalk.yellow('  Could not open browser automatically.'));
    }
  },

  stop() {
    console.log(chalk.yellow('\n  \u26A0 To stop the dashboard, stop the web server process.\n'));
  }
};

module.exports = dashboardCommand;
