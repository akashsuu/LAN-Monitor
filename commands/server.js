const chalk = require('chalk');
const ora = require('ora');
const store = require('../config/store');
const portService = require('../services/port');
const pingService = require('../services/ping');
const formatter = require('../utils/formatter');

const serverCommand = {
  add(ip) {
    if (!ip) {
      console.log(chalk.red('  Error: Please provide an IP address.'));
      return;
    }
    const added = store.addServer(ip);
    if (added) {
      console.log(chalk.green(`\n  \u2713 Added server: ${chalk.cyan(ip)}\n`));
    } else {
      console.log(chalk.yellow(`\n  \u26A0 Server already monitored: ${ip}\n`));
    }
  },

  list() {
    const servers = store.getServers();
    if (servers.length === 0) {
      console.log(chalk.yellow('\n  No servers being monitored.\n'));
      return;
    }
    console.log('');
    console.log(`  ${chalk.bold('Monitored Servers')} ${chalk.gray(`(${servers.length})`)}`);
    const Table = require('cli-table3');
    const table = new Table({
      head: [chalk.cyan('Name'), chalk.cyan('IP'), chalk.cyan('Added')],
      style: { head: [], border: [] },
      chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
    });
    for (const srv of servers) {
      table.push([srv.name || srv.ip, chalk.cyan(srv.ip), new Date(srv.added).toLocaleDateString()]);
    }
    console.log(table.toString());
    console.log('');
  },

  async stats(name) {
    if (!name) {
      console.log(chalk.red('  Error: Please provide a server name.'));
      return;
    }
    const servers = store.getServers();
    const server = servers.find(s => s.name === name || s.ip === name);
    if (!server) {
      console.log(chalk.yellow(`\n  \u26A0 Server not found: ${name}\n`));
      return;
    }
    const spinner = ora({ text: `Checking server ${chalk.cyan(server.ip)}...`, color: 'cyan' }).start();
    const [pingResult, portResult] = await Promise.all([
      pingService.ping(server.ip, 2),
      portService.checkPort(server.ip, 80)
    ]);
    spinner.stop();
    console.log('');
    formatter.heading(`Server Stats - ${server.name || server.ip}`);
    formatter.labelValue('IP', server.ip);
    formatter.labelValue('Ping', pingResult.average !== null ? formatter.ms(pingResult.average) : chalk.gray('N/A'));
    formatter.labelValue('Packet Loss', formatter.packetLoss(pingResult.packetLoss));
    formatter.labelValue('Status', pingResult.online ? chalk.green('Online') : chalk.red('Offline'));
    formatter.labelValue('Port 80', portResult.open ? chalk.green('Open') : chalk.red('Closed'));
    console.log('');
  },

  remove(name) {
    if (!name) {
      console.log(chalk.red('  Error: Please provide a server name or IP.'));
      return;
    }
    const removed = store.removeServer(name);
    if (removed) {
      console.log(chalk.green(`\n  \u2713 Removed server: ${chalk.cyan(name)}\n`));
    } else {
      console.log(chalk.yellow(`\n  \u26A0 Server not found: ${name}\n`));
    }
  }
};

module.exports = serverCommand;
