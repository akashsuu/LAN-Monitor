const chalk = require('../utils/theme');
const Table = require('cli-table3');
const store = require('../config/store');

const trustCommand = {
  async execute(command, arg, label) {
    switch (command) {
      case 'list':
        this.list();
        break;
      case 'add':
        this.add(arg, label);
        break;
      case 'remove':
        this.remove(arg);
        break;
      case 'check':
        this.check(arg);
        break;
      default:
        this.help();
    }
  },

  list() {
    const trusted = store.getTrusted();
    if (trusted.length === 0) {
      console.log(chalk.dim('\n  No trusted devices.\n'));
      return;
    }

    console.log(chalk.cyan.bold(`\n  Trusted Devices (${trusted.length})\n`));

    const table = new Table({
      head: ['MAC Address', 'Label', 'Added'],
      style: { head: ['cyan'], border: ['gray'] },
      colWidths: [20, 25, 22]
    });

    for (const t of trusted) {
      table.push([
        t.mac,
        t.label || '-',
        new Date(t.added).toLocaleDateString()
      ]);
    }

    console.log(table.toString());
    console.log();
  },

  add(mac, label) {
    if (!mac) {
      console.log(chalk.yellow('\n  Usage: ln trust add <mac> [label]\n'));
      return;
    }
    const success = store.addTrusted(mac, label);
    if (success) {
      console.log(chalk.green(`\n  Added ${mac} to trusted devices.\n`));
    } else {
      console.log(chalk.yellow(`\n  ${mac} is already trusted.\n`));
    }
  },

  remove(mac) {
    if (!mac) {
      console.log(chalk.yellow('\n  Usage: ln trust remove <mac>\n'));
      return;
    }
    const success = store.removeTrusted(mac);
    if (success) {
      console.log(chalk.green(`\n  Removed ${mac} from trusted devices.\n`));
    } else {
      console.log(chalk.yellow(`\n  ${mac} not found in trusted list.\n`));
    }
  },

  check(mac) {
    if (!mac) {
      console.log(chalk.yellow('\n  Usage: ln trust check <mac>\n'));
      return;
    }
    const trusted = store.isTrusted(mac);
    if (trusted) {
      console.log(chalk.green(`\n  ${mac} is trusted.\n`));
    } else {
      console.log(chalk.yellow(`\n  ${mac} is not trusted.\n`));
    }
  },

  help() {
    console.log(chalk.yellow('\n  Usage: ln trust <command> [args]\n'));
    console.log(chalk.bold('  Commands:\n'));
    console.log('    list              List all trusted devices');
    console.log('    add <mac> [label] Add a device to trusted list');
    console.log('    remove <mac>      Remove a device from trusted list');
    console.log('    check <mac>       Check if a device is trusted\n');
  }
};

module.exports = trustCommand;
