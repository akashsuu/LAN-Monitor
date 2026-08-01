const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const blockedService = require('../services/blocked');
const store = require('../config/store');
const formatter = require('../utils/formatter');

const blockedCommand = {
  async execute(command, arg) {
    switch (command) {
      case 'scan':
        await this.scan();
        break;
      case 'list':
        this.list();
        break;
      case 'add':
        this.add(arg);
        break;
      case 'remove':
        this.remove(arg);
        break;
      case 'check':
        await this.check(arg);
        break;
      default:
        if (command && !['scan', 'list', 'add', 'remove', 'check'].includes(command)) {
          await this.check(command);
        } else {
          await this.scan();
        }
    }
  },

  async scan() {
    const spinner = ora({ text: 'Checking connectivity baseline...', color: 'cyan' }).start();

    const baseline = await blockedService.checkConnectivity();
    if (!baseline.online) {
      spinner.stop();
      console.log(chalk.red('\n  No internet connection detected. Cannot determine blocked sites.\n'));
      return;
    }

    spinner.text = 'Scanning sites...';
    const result = await blockedService.scanAll((done, total) => {
      spinner.text = `Scanning sites... ${done}/${total}`;
    });
    spinner.stop();

    console.log('');
    formatter.heading('Blocked Sites Report');
    console.log(`  ${chalk.gray(`Generated: ${new Date().toLocaleString()}`)}`);
    console.log(`  ${chalk.gray(`Network:   ${baseline.host} (baseline OK)`)}\n`);

    formatter.labelValue('Total Checked', chalk.white(result.total.toString()));
    formatter.labelValue('Blocked', result.blockedCount > 0 ? chalk.red(result.blockedCount.toString()) : chalk.green('0'));
    formatter.labelValue('Reachable', chalk.green(result.reachableCount.toString()));
    formatter.labelValue('DNS Blocked', result.dnsBlockedCount > 0 ? chalk.red(result.dnsBlockedCount.toString()) : chalk.green('0'));
    formatter.labelValue('Connection Blocked', result.connBlockedCount > 0 ? chalk.yellow(result.connBlockedCount.toString()) : chalk.green('0'));
    if (result.dnsErrorCount > 0) {
      formatter.labelValue('DNS Errors', chalk.gray(result.dnsErrorCount.toString()));
    }

    if (result.blockedCount > 0) {
      console.log('');
      formatter.heading(`Blocked Sites (${result.blockedCount})`);
      const table = new Table({
        head: [chalk.cyan('Site'), chalk.cyan('Type'), chalk.cyan('Reason')],
        style: { head: [], border: [] },
        colWidths: [22, 18, 46],
        chars: {
          'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557',
          'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D',
          'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C',
          'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502'
        }
      });
      for (const r of result.blocked) {
        const type = r.blockType === 'DNS Blocked' ? chalk.red(r.blockType) : chalk.yellow(r.blockType);
        table.push([r.site, type, chalk.dim(r.reason)]);
      }
      console.log(table.toString());
      console.log(`\n  ${chalk.bold('Blocked site names:')} ${result.blocked.map(r => r.site).join(', ')}`);
    } else {
      console.log('');
      console.log(`  ${chalk.green('\u2713 No blocked sites detected in this LAN.')}`);
    }

    if (result.dnsErrors.length > 0) {
      console.log('');
      formatter.heading(`DNS-Unavailable Sites (${result.dnsErrors.length})`);
      console.log(`  ${chalk.yellow(result.dnsErrors.map(r => r.site).join(', '))}`);
    }
    console.log('');
  },

  async check(site) {
    if (!site) {
      console.log(chalk.yellow('\n  Usage: ln blocked check <site>\n'));
      return;
    }
    const spinner = ora({ text: `Checking ${chalk.cyan(site)}...`, color: 'cyan' }).start();
    const result = await blockedService.checkOne(site);
    spinner.stop();

    console.log('');
    formatter.heading(`Site Check - ${result.site}`);
    formatter.labelValue('DNS', result.dnsOK ? chalk.green('Resolves') : chalk.red('Blocked/Failed'));
    formatter.labelValue('Connection', result.connectOK ? chalk.green('Open') : chalk.red('Blocked'));
    formatter.labelValue('Status', result.blocked ? chalk.red('BLOCKED') : chalk.green('Reachable'));
    if (result.latency !== null) {
      formatter.labelValue('Latency', formatter.ms(result.latency));
    }
    formatter.labelValue('Reason', result.reason ? chalk.dim(result.reason) : 'N/A');
    console.log('');
  },

  list() {
    const sites = blockedService.getAllSites();
    const custom = store.getBlockedSites();
    console.log(chalk.cyan.bold(`\n  Blocked Site Check List (${sites.length})\n`));
    for (const site of sites) {
      const isCustom = custom.includes(site);
      console.log(`   ${isCustom ? chalk.yellow('+') : ' '} ${site}${isCustom ? chalk.dim(' (custom)') : ''}`);
    }
    console.log();
  },

  add(site) {
    if (!site) {
      console.log(chalk.yellow('\n  Usage: ln blocked add <site>\n'));
      return;
    }
    const success = store.addBlockedSite(site);
    if (success) {
      console.log(chalk.green(`\n  \u2713 Added ${chalk.cyan(site)} to check list.\n`));
    } else {
      console.log(chalk.yellow(`\n  \u26A0 ${chalk.cyan(site)} is already in the list.\n`));
    }
  },

  remove(site) {
    if (!site) {
      console.log(chalk.yellow('\n  Usage: ln blocked remove <site>\n'));
      return;
    }
    const success = store.removeBlockedSite(site);
    if (success) {
      console.log(chalk.green(`\n  \u2713 Removed ${chalk.cyan(site)} from check list.\n`));
    } else {
      console.log(chalk.yellow(`\n  ${chalk.cyan(site)} not found in custom list (defaults cannot be removed).\n`));
    }
  },

  help() {
    console.log(chalk.yellow('\n  Usage: ln blocked <command> [args]\n'));
    console.log(chalk.bold('  Commands:\n'));
    console.log('    (no args)          Scan all sites and show blocked count');
    console.log('    scan               Scan all sites and show blocked count');
    console.log('    check <site>       Check if a single site is blocked');
    console.log('    list               Show all sites in the check list');
    console.log('    add <site>         Add a custom site to the check list');
    console.log('    remove <site>      Remove a custom site from the check list\n');
  }
};

module.exports = blockedCommand;
