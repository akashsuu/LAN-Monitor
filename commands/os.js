const chalk = require('chalk');
const osDetection = require('../services/osdetect');
const formatter = require('../utils/formatter');
const macrandom = require('../services/macrandom');
const store = require('../config/store');
const network = require('../utils/network');

const osCommand = {
  async execute(ip) {
    if (!ip) {
      console.log(chalk.yellow('\n  Usage: ln os <ip>  or  ln info <ip>\n'));
      return;
    }

    const isLocal = network.isLocalIP(ip);
    console.log(chalk.cyan.bold(`\n  OS Detection: ${ip}${isLocal ? ' ' + chalk.yellow('(this PC)') : ''}\n`));

    const spinner = ['|', '/', '-', '\\'];
    let i = 0;
    const spin = setInterval(() => {
      process.stdout.write(`\r  ${chalk.dim('Analyzing')} ${spinner[i++]}`);
      i %= spinner.length;
    }, 100);

    const result = await osDetection.detect(ip);

    clearInterval(spin);
    process.stdout.write('\r' + ' '.repeat(40) + '\r');

    formatter.heading('Operating System');
    console.log(`  ${chalk.bold('OS'.padEnd(15))} ${chalk.cyan(result.os)}`);
    console.log(`  ${chalk.bold('Confidence'.padEnd(15))} ${formatter.percentage(result.confidence)}`);
    console.log(`  ${chalk.bold('Reasons'.padEnd(15))} ${result.reasons.length > 0 ? result.reasons.join(', ') : chalk.gray('None')}`);

    formatter.divider();

    if (result.ttl) {
      const osByTTL = result.ttl === 128 ? 'Windows' : result.ttl === 64 ? 'Linux/Unix' : result.ttl === 255 ? 'Cisco/Network' : 'Unknown';
      console.log(`  ${chalk.bold('TTL'.padEnd(15))} ${result.ttl} (${chalk.dim(osByTTL)})`);
    }

    if (result.openPorts.length > 0) {
      console.log(`  ${chalk.bold('Open Ports'.padEnd(15))} ${result.openPorts.join(', ')}`);
    }

    if (result.hostname) {
      console.log(`  ${chalk.bold('Hostname'.padEnd(15))} ${result.hostname}`);
    }

    if (result.vendor) {
      console.log(`  ${chalk.bold('MAC Vendor'.padEnd(15))} ${result.vendor}`);
    }

    const stored = store.getDevices().find(d => d.ip === ip);
    if (stored && stored.mac) {
      const macInfo = macrandom.detectMACType(stored.mac);
      console.log(`  ${chalk.bold('MAC Type'.padEnd(15))} ${macInfo.type === 'Permanent' ? chalk.green(macInfo.type) : macInfo.isRandomized ? chalk.yellow(macInfo.type) : chalk.dim(macInfo.type)}`);
      if (macInfo.isRandomized) {
        console.log(`  ${chalk.yellow('\u26A0')} ${chalk.dim('This MAC may change over time (privacy feature)')}`);
      }
    }

    if (result.banners.length > 0) {
      formatter.divider();
      formatter.heading('Service Banners');
      for (const b of result.banners.slice(0, 5)) {
        console.log(`  ${chalk.dim(b.substring(0, 100))}`);
      }
    }

    console.log();
  }
};

module.exports = osCommand;
