const chalk = require('chalk');
const Table = require('cli-table3');
const store = require('../config/store');

const groupCommand = {
  async execute(command, name, arg) {
    switch (command) {
      case 'create':
        this.create(name);
        break;
      case 'delete':
        this.delete(name);
        break;
      case 'add':
        this.add(name, arg);
        break;
      case 'remove':
        this.removeMember(name, arg);
        break;
      case 'list':
        this.list();
        break;
      case 'show':
        this.show(name);
        break;
      default:
        this.help();
    }
  },

  create(name) {
    if (!name) {
      console.log(chalk.yellow('\n  Usage: ln group create <name>\n'));
      return;
    }
    const success = store.createGroup(name);
    if (success) {
      console.log(chalk.green(`\n  Group "${name}" created.\n`));
    } else {
      console.log(chalk.yellow(`\n  Group "${name}" already exists.\n`));
    }
  },

  delete(name) {
    if (!name) {
      console.log(chalk.yellow('\n  Usage: ln group delete <name>\n'));
      return;
    }
    const success = store.deleteGroup(name);
    if (success) {
      console.log(chalk.green(`\n  Group "${name}" deleted.\n`));
    } else {
      console.log(chalk.yellow(`\n  Group "${name}" not found.\n`));
    }
  },

  add(groupName, ip) {
    if (!groupName || !ip) {
      console.log(chalk.yellow('\n  Usage: ln group add <group> <ip>\n'));
      return;
    }
    const success = store.addDeviceToGroup(groupName, ip);
    if (success) {
      console.log(chalk.green(`\n  Added ${ip} to group "${groupName}".\n`));
    } else {
      console.log(chalk.yellow(`\n  Could not add ${ip} to "${groupName}". Check group exists and device not already in group.\n`));
    }
  },

  removeMember(groupName, ip) {
    if (!groupName || !ip) {
      console.log(chalk.yellow('\n  Usage: ln group remove <group> <ip>\n'));
      return;
    }
    const success = store.removeDeviceFromGroup(groupName, ip);
    if (success) {
      console.log(chalk.green(`\n  Removed ${ip} from group "${groupName}".\n`));
    } else {
      console.log(chalk.yellow(`\n  Could not remove ${ip} from "${groupName}".\n`));
    }
  },

  list() {
    const groups = store.getGroups();
    const names = Object.keys(groups);
    if (names.length === 0) {
      console.log(chalk.dim('\n  No groups created. Use "ln group create <name>" to create one.\n'));
      return;
    }

    console.log(chalk.cyan.bold(`\n  Device Groups (${names.length})\n`));

    const table = new Table({
      head: [chalk.cyan('Group'), chalk.cyan('Devices'), chalk.cyan('Created')],
      style: { head: [], border: [] },
      colWidths: [20, 12, 22],
      chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
    });

    for (const name of names) {
      const g = groups[name];
      table.push([name, g.devices.length.toString(), new Date(g.created).toLocaleDateString()]);
    }

    console.log(table.toString());
    console.log();
  },

  show(name) {
    if (!name) {
      console.log(chalk.yellow('\n  Usage: ln group show <name>\n'));
      return;
    }

    const devices = store.getDevicesInGroup(name);
    if (devices.length === 0) {
      console.log(chalk.yellow(`\n  Group "${name}" is empty or not found.\n`));
      return;
    }

    console.log(chalk.cyan.bold(`\n  Group: ${name} (${devices.length} devices)\n`));

    const table = new Table({
      head: [chalk.cyan('IP'), chalk.cyan('MAC'), chalk.cyan('Vendor'), chalk.cyan('Status')],
      style: { head: [], border: [] },
      colWidths: [16, 18, 16, 10],
      chars: { 'top': '\u2550', 'top-mid': '\u2564', 'top-left': '\u2554', 'top-right': '\u2557', 'bottom': '\u2550', 'bottom-mid': '\u2567', 'bottom-left': '\u255A', 'bottom-right': '\u255D', 'left': '\u2551', 'left-mid': '\u255F', 'mid': '\u2500', 'mid-mid': '\u253C', 'right': '\u2551', 'right-mid': '\u2562', 'middle': '\u2502' }
    });

    for (const d of devices) {
      table.push([
        chalk.cyan(d.ip || '?'),
        d.mac || chalk.gray('-'),
        d.vendor || chalk.gray('-'),
        (d.online || d.status) ? chalk.green('Online') : chalk.red('Offline')
      ]);
    }

    console.log(table.toString());
    console.log();
  },

  help() {
    console.log(chalk.yellow('\n  Usage: ln group <command> [args]\n'));
    console.log(chalk.bold('  Commands:\n'));
    console.log('    create <name>      Create a new device group');
    console.log('    delete <name>      Delete a device group');
    console.log('    add <group> <ip>   Add a device to a group');
    console.log('    remove <group> <ip> Remove a device from a group');
    console.log('    list               List all groups');
    console.log('    show <name>        Show devices in a group\n');
  }
};

module.exports = groupCommand;
