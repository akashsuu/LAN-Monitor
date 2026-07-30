const chalk = require('chalk');
const Table = require('cli-table3');
const store = require('../config/store');

const nicknameCommand = {
  async execute(command, mac, name) {
    switch (command) {
      case 'list':
        this.list();
        break;
      case 'set':
        this.set(mac, name);
        break;
      case 'remove':
        this.remove(mac);
        break;
      default:
        this.help();
    }
  },

  list() {
    const nicknames = store.getNicknames();
    const entries = Object.entries(nicknames);
    if (entries.length === 0) {
      console.log(chalk.dim('\n  No nicknames set.\n'));
      return;
    }

    console.log(chalk.cyan.bold(`\n  Device Nicknames (${entries.length})\n`));

    const table = new Table({
      head: ['MAC Address', 'Nickname'],
      style: { head: ['cyan'], border: ['gray'] },
      colWidths: [20, 30]
    });

    for (const [mac, nick] of entries) {
      table.push([mac, nick]);
    }

    console.log(table.toString());
    console.log();
  },

  set(mac, name) {
    if (!mac || !name) {
      console.log(chalk.yellow('\n  Usage: ln nickname set <mac> <name>\n'));
      return;
    }
    store.setNickname(mac, name);
    console.log(chalk.green(`\n  Nickname set for ${mac}: ${name}\n`));
  },

  remove(mac) {
    if (!mac) {
      console.log(chalk.yellow('\n  Usage: ln nickname remove <mac>\n'));
      return;
    }
    store.removeNickname(mac);
    console.log(chalk.green(`\n  Nickname removed for ${mac}\n`));
  },

  help() {
    console.log(chalk.yellow('\n  Usage: ln nickname <command> [args]\n'));
    console.log(chalk.bold('  Commands:\n'));
    console.log('    list                List all device nicknames');
    console.log('    set <mac> <name>    Set a nickname for a device');
    console.log('    remove <mac>        Remove a device nickname\n');
  }
};

module.exports = nicknameCommand;
