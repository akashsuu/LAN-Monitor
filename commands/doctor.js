const chalk = require('chalk');
const os = require('os');
const pingService = require('../services/ping');
const internetService = require('../services/internet');
const dnsService = require('../services/dns');
const network = require('../utils/network');
const formatter = require('../utils/formatter');

const doctorCommand = {
  async execute() {
    console.log('');
    formatter.heading('System Diagnostics');

    const checks = [];

    checks.push({ name: 'Node.js Runtime', test: () => {
      const v = process.version;
      const major = parseInt(v.replace('v', '').split('.')[0], 10);
      return { pass: major >= 14, message: major >= 14 ? v : `${v} (needs >=14)` };
    }});

    checks.push({ name: 'Network Interface', test: () => {
      const ip = network.getLocalIP();
      return { pass: ip !== '127.0.0.1' && ip !== '::1', message: ip };
    }});

    checks.push({ name: 'Default Gateway', test: () => {
      const gw = network.getGateway();
      return { pass: gw !== 'Unknown' && gw !== '', message: gw };
    }});

    checks.push({ name: 'DNS Resolution', test: () => {
      const dns = network.getDNS();
      return { pass: dns !== 'Unknown', message: dns };
    }});

    checks.push({ name: 'Internet Access', test: async () => {
      try {
        const result = await internetService.checkConnectivity();
        return { pass: result.online, message: result.online ? `${result.latency}ms` : 'No connection' };
      } catch {
        return { pass: false, message: 'Failed to check' };
      }
    }});

    checks.push({ name: 'DNS Lookup (google.com)', test: async () => {
      try {
        const result = await dnsService.lookup('google.com');
        const message = result.addresses[0] || (result.error && result.error.code) || 'Failed';
        return { pass: result.addresses.length > 0, message };
      } catch {
        return { pass: false, message: 'Failed' };
      }
    }});

    checks.push({ name: 'Ping (8.8.8.8)', test: async () => {
      try {
        const result = await pingService.ping('8.8.8.8', 2);
        return { pass: result.online, message: result.average ? `${result.average.toFixed(1)}ms` : 'Timeout' };
      } catch {
        return { pass: false, message: 'Failed' };
      }
    }});

    checks.push({ name: 'Config Directory', test: () => {
      const home = os.homedir();
      const dir = require('path').join(home, '.lan-monitor');
      const fs = require('fs');
      const exists = fs.existsSync(dir);
      return { pass: exists, message: exists ? dir : 'Not created yet' };
    }});

    let allPassed = true;
    for (const check of checks) {
      try {
        const result = await check.test();
        const icon = result.pass ? chalk.green('\u2713') : chalk.red('\u2717');
        const label = result.pass ? chalk.green(check.name) : chalk.red(check.name);
        console.log(`  ${icon} ${label.padEnd(28)} ${result.message}`);
        if (!result.pass) allPassed = false;
      } catch (err) {
        console.log(`  ${chalk.red('\u2717')} ${chalk.red(check.name.padEnd(28))} ${chalk.red('Error')}`);
        allPassed = false;
      }
    }

    console.log('');
    if (allPassed) {
      console.log(`  ${chalk.green('\u2713 All checks passed. System is healthy.')}`);
    } else {
      console.log(`  ${chalk.yellow('\u26A0 Some checks failed. Review above for details.')}`);
    }
    console.log('');
  }
};

module.exports = doctorCommand;
