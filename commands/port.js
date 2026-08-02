const chalk = require('../utils/theme');
const ora = require('ora');
const portService = require('../services/port');
const formatter = require('../utils/formatter');
const store = require('../config/store');
const network = require('../utils/network');

function hostLabel(host) {
  return network.isLocalIP(host) ? `${host} (this PC)` : host;
}

const portCommand = {
  async check(host, port) {
    if (!host || !port) {
      console.log(chalk.red('  Error: Please provide host and port.'));
      return;
    }
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      console.log(chalk.red('  Error: Invalid port number. Use 1-65535.'));
      return;
    }
    const spinner = ora({
      text: `Checking port ${chalk.cyan(portNum)} on ${chalk.cyan(host)}...`,
      color: 'cyan'
    }).start();
    const result = await portService.checkPort(host, portNum);
    spinner.stop();
    console.log('');
    formatter.heading(`Port Check - ${hostLabel(host)}:${portNum}`);
    formatter.labelValue('Host', hostLabel(host));
    formatter.labelValue('Port', `${portNum} (${result.service})`);
    formatter.labelValue('Status', result.open ? chalk.green('Open') : chalk.red('Closed'));
    formatter.labelValue('Response Time', result.latency !== null ? formatter.ms(result.latency) : chalk.gray('N/A'));
    formatter.labelValue('Error', result.error ? chalk.red(result.error) : chalk.green('None'));
    console.log('');
  },

  async scan(host, options) {
    if (!host) {
      console.log(chalk.red('  Error: Please provide a host.'));
      return;
    }

    const scanType = options.top100 ? 'top 100' : options.all ? 'full (1-65535)' : options.fast ? 'fast (28 ports)' : 'common (24 ports)';
    const spinner = ora({
      text: `Scanning ${chalk.cyan(host)} (${scanType})...`,
      color: 'cyan'
    }).start();

    const results = await portService.scanPorts(host, {
      top100: options.top100 || false,
      all: options.all || false,
      fast: options.fast || false,
      service: options.service !== false,
      onProgress: (completed, total) => {
        const pct = Math.round(completed / total * 100);
        spinner.text = `Scanning ${chalk.cyan(host)} - ${completed}/${total} ports (${pct}%)`;
      }
    });

    spinner.stop();

    const openPorts = results.open;
    console.log('');
    formatter.heading(`Port Scan Results - ${hostLabel(host)}`);
    console.log(`  ${chalk.gray(`Scanned ${results.total} ports, ${results.openCount} open, ${results.closedCount} closed`)}\n`);

    if (openPorts.length === 0) {
      console.log(`  ${chalk.yellow('No open ports found.')}\n`);
      return;
    }

    const Table = require('cli-table3');
    const headers = [chalk.cyan('Port'), chalk.cyan('Service'), chalk.cyan('Status'), chalk.cyan('Latency')];
    if (options.service !== false) headers.push(chalk.cyan('Banner'));

    const table = new Table({
      head: headers,
      style: { head: [], border: [] },
      chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
    });

    for (const p of openPorts) {
      const row = [chalk.cyan(p.port.toString()), p.service || portService.getServiceName(p.port), formatter.portStatus(true), formatter.ms(p.latency)];
      if (options.service !== false) {
        row.push(p.banner ? chalk.dim(p.banner.substring(0, 60)) : chalk.gray('-'));
      }
      table.push(row);
    }

    console.log(table.toString());
    console.log();

    if (options.export) {
      const fs = require('fs');
      const path = require('path');
      const expPath = path.join(os.homedir(), '.lan-monitor', `port-scan-${host}-${Date.now()}.json`);
      fs.writeFileSync(expPath, JSON.stringify(results, null, 2), 'utf8');
      console.log(`  ${chalk.green('\u2713')} Results exported: ${chalk.cyan(expPath)}\n`);
    }
  },

  async monitor() {
    console.log('');
    console.log(`  ${chalk.bold('Port Monitor')}`);
    console.log(`  ${chalk.gray('\u2500'.repeat(40))}`);
    console.log(`  Port monitoring runs in background.`);
    console.log(`  Use ${chalk.cyan('ln port <host> <port>')} for one-time checks.`);
    console.log(`  Use ${chalk.cyan('ln port scan <ip>')} for advanced scanning.`);
    console.log(`  Use ${chalk.cyan('ln port scan <ip> --all')} for full port scan.`);
    console.log(`  Use ${chalk.cyan('ln port scan <ip> --top100')} for top 100 ports.`);
    console.log(`  Use ${chalk.cyan('ln port scan <ip> --fast')} for quick scan.`);
    console.log('');
  }
};

module.exports = portCommand;
