const chalk = require('chalk');
const pingService = require('../services/ping');
const formatter = require('../utils/formatter');

function repeat(char, n) {
  return Array(Math.max(0, n + 1)).join(char);
}

const latencyCommand = {
  async execute(host, options) {
    if (!host) {
      console.log(chalk.yellow('\n  Usage: ln latency <host>\n'));
      return;
    }

    const count = (options && options.count) || 10;
    const interval = (options && options.interval) || 0.2;

    const isLocal = require('../utils/network').isLocalIP(host);
    console.log(chalk.cyan.bold(`\n  Latency Test: ${host}${isLocal ? ' ' + chalk.yellow('(this PC)') : ''}\n`));
    console.log(chalk.dim(`  Sending ${count} packets...\n`));

    const timestamps = [];
    const latencies = [];
    let lost = 0;
    let sent = 0;

    for (let i = 0; i < count; i++) {
      const start = Date.now();
      const result = await pingService.ping(host, 1);
      sent++;
      const elapsed = Date.now() - start;

      if (result.average !== null && result.packetLoss < 100) {
        latencies.push(result.average);
        timestamps.push(elapsed);
        process.stdout.write(`  ${chalk.green('\u2713')} seq=${i + 1} time=${result.average.toFixed(1)}ms ${chalk.dim(`(rtt ${elapsed}ms)`)}\n`);
      } else {
        lost++;
        process.stdout.write(`  ${chalk.red('\u2717')} seq=${i + 1} ${chalk.red('timeout')}\n`);
      }

      if (i < count - 1) {
        await new Promise(r => setTimeout(r, interval * 1000));
      }
    }

    const received = sent - lost;
    const lossPct = (lost / sent) * 100;

    let min = Infinity, max = 0, avg = 0, jitter = 0;
    if (latencies.length > 0) {
      min = Math.min(...latencies);
      max = Math.max(...latencies);
      avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      if (latencies.length > 1) {
        let jSum = 0;
        for (let i = 1; i < latencies.length; i++) {
          jSum += Math.abs(latencies[i] - latencies[i - 1]);
        }
        jitter = jSum / (latencies.length - 1);
      }
    }

    console.log();
    formatter.heading('Latency Results');
    formatter.labelValue('Host', host);
    formatter.labelValue('Packets', `${sent} transmitted, ${received} received`);
    formatter.labelValue('Packet Loss', formatter.packetLoss(lossPct));
    formatter.divider();

    if (latencies.length > 0) {
      formatter.labelValue('Minimum', formatter.ms(min));
      formatter.labelValue('Maximum', formatter.ms(max));
      formatter.labelValue('Average', formatter.ms(avg));
      formatter.labelValue('Jitter', formatter.ms(jitter));
    } else {
      console.log(`  ${chalk.red('All packets lost. Host may be unreachable.')}`);
    }

    if (latencies.length > 1) {
      formatter.divider();
      formatter.heading('Response Time Graph');
      const graphWidth = 40;
      const maxLat = Math.max(...latencies, 1);
      for (let i = 0; i < latencies.length; i++) {
        const barLen = Math.round(latencies[i] / maxLat * graphWidth);
        const bar = chalk.cyan('\u2588'.repeat(Math.max(1, barLen)));
        const num = latencies[i].toFixed(1).padStart(7);
        process.stdout.write(`  ${chalk.dim(String(i + 1).padStart(3))} ${bar} ${num}ms\n`);
      }
      console.log();
    }

    console.log();
  },

  async stats(host) {
    if (!host) {
      console.log(chalk.yellow('\n  Usage: ln ping --stats <host>\n'));
      return;
    }
    await this.execute(host, { count: 20, interval: 0.2 });
  }
};

module.exports = latencyCommand;
