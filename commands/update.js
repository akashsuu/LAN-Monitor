const chalk = require('chalk');
const https = require('https');
const packageJson = require('../package.json');

const updateCommand = {
  async execute() {
    console.log('');
    console.log(`  ${chalk.bold('Current version:')} v${packageJson.version}`);
    console.log(`  ${chalk.bold('Checking for updates...')}`);

    try {
      await new Promise((resolve, reject) => {
        https.get('https://registry.npmjs.org/lan-monitor/latest', { timeout: 5000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const pkg = JSON.parse(data);
              const latest = pkg.version;
              const current = packageJson.version;
              if (latest > current) {
                console.log(`  ${chalk.yellow('\u26A0')} Update available: ${chalk.green(`v${latest}`)} (current: v${current})`);
                console.log(`  ${chalk.cyan('  Run:')} npm install -g lan-monitor`);
              } else {
                console.log(`  ${chalk.green('\u2713')} You are running the latest version.`);
              }
              resolve();
            } catch {
              resolve();
            }
          });
        }).on('error', () => {
          console.log(`  ${chalk.yellow('\u26A0')} Could not check for updates (no internet connection).`);
          resolve();
        }).setTimeout(5000, () => {
          console.log(`  ${chalk.yellow('\u26A0')} Update check timed out.`);
          resolve();
        });
      });
    } catch {
      console.log(`  ${chalk.yellow('\u26A0')} Update check failed.`);
    }
    console.log('');
  }
};

module.exports = updateCommand;
