const chalk = require('chalk');
const ora = require('ora');
const portService = require('../services/port');
const formatter = require('../utils/formatter');

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
    formatter.heading(`Port Check - ${host}:${portNum}`);
    formatter.labelValue('Host', host);
    formatter.labelValue('Port', `${portNum} (${result.service})`);
    formatter.labelValue('Status', result.open ? chalk.green('Open') : chalk.red('Closed'));
    formatter.labelValue('Response Time', result.latency !== null ? formatter.ms(result.latency) : chalk.gray('N/A'));
    formatter.labelValue('Error', result.error ? chalk.red(result.error) : chalk.green('None'));
    console.log('');
  },

  async scan(host) {
    if (!host) {
      console.log(chalk.red('  Error: Please provide a host.'));
      return;
    }
    const spinner = ora({
      text: `Scanning common ports on ${chalk.cyan(host)}...`,
      color: 'cyan'
    }).start();
    const results = await portService.scanCommonPorts(host);
    spinner.stop();
    const openPorts = results.filter(r => r.open);
    console.log('');
    formatter.heading(`Port Scan - ${host}`);
    console.log(`  ${chalk.gray(`Scanned ${results.length} common ports, ${openPorts.length} open`)}\n`);
    if (openPorts.length === 0) {
      console.log(`  ${chalk.yellow('No open ports found.')}`);
      console.log('');
      return;
    }
    const Table = require('cli-table3');
    const table = new Table({
      head: [chalk.cyan('Port'), chalk.cyan('Service'), chalk.cyan('Status'), chalk.cyan('Response')],
      style: { head: [], border: [] },
      chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
    });
    for (const p of openPorts) {
      table.push([chalk.cyan(p.port.toString()), p.service, formatter.portStatus(true), formatter.ms(p.latency)]);
    }
    console.log(table.toString());
    console.log('');
  },

  async monitor() {
    console.log('');
    console.log(`  ${chalk.bold('Port Monitor')}`);
    console.log(`  ${chalk.gray('\u2500'.repeat(40))}`);
    console.log(`  Port monitoring runs in background.`);
    console.log(`  Use ${chalk.cyan('ln port <host> <port>')} for one-time checks.`);
    console.log(`  Use ${chalk.cyan('ln ports <host>')} to scan common ports.`);
    console.log('');
  }
};

module.exports = portCommand;
