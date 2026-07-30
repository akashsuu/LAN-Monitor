const chalk = require('chalk');
const ora = require('ora');
const pingService = require('../services/ping');
const formatter = require('../utils/formatter');
const latencyCommand = require('./latency');

const pingCommand = {
  async execute(host, options) {
    if (!host) {
      console.log(chalk.red('  Error: Please specify a host to ping.'));
      console.log(chalk.gray('  Usage: ln ping <host>'));
      console.log(chalk.gray('  Usage: ln ping --stats <host>  (extended statistics)'));
      return;
    }

    if (options && options.stats) {
      await latencyCommand.stats(host);
      return;
    }

    const spinner = ora({
      text: `Pinging ${chalk.cyan(host)}...`,
      color: 'cyan'
    }).start();

    try {
      const ip = await pingService.resolveDNS(host);
      if (ip) {
        spinner.text = `Pinging ${chalk.cyan(host)} (${chalk.gray(ip)})...`;
      }
    } catch {
    }

    const result = await pingService.ping(host, 4);
    spinner.stop();

    console.log('');
    console.log(`  ${chalk.bold('PING')} ${chalk.cyan(host)} ${result.resolvedIP ? `(${chalk.gray(result.resolvedIP)})` : ''}`);
    formatter.divider();

    if (result.replies && result.replies.length > 0) {
      result.replies.forEach((reply, i) => {
        console.log(`  ${chalk.bold(`Reply ${i + 1}`).padEnd(15)} ${formatter.ms(reply)}`);
      });
    } else if (result.error) {
      console.log(`  ${chalk.red(`Error: ${result.error}`)}`);
    } else {
      console.log(`  ${chalk.red('No replies received')}`);
    }

    formatter.divider();

    formatter.labelValue('Average', result.average !== null ? formatter.ms(result.average) : chalk.gray('N/A'));
    formatter.labelValue('Packet Loss', formatter.packetLoss(result.packetLoss));
    formatter.labelValue('Status', result.online ? chalk.green('Online') : chalk.red('Offline'));

    console.log('');
  }
};

module.exports = pingCommand;
