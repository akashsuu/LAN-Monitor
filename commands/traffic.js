const chalk = require('chalk');
const trafficService = require('../services/traffic');
const formatter = require('../utils/formatter');

function repeat(char, n) {
  return Array(Math.max(0, n + 1)).join(char);
}

function chartBar(value, max, width = 30) {
  if (max === 0) return chalk.gray('\u2591'.repeat(width));
  const filled = Math.min(width, Math.round(value / max * width));
  const empty = width - filled;
  const color = value > max * 0.8 ? chalk.red : value > max * 0.5 ? chalk.yellow : chalk.green;
  return color('\u2588'.repeat(filled)) + chalk.gray('\u2591'.repeat(empty));
}

const trafficCommand = {
  async execute(duration) {
    const maxTime = duration ? parseInt(duration, 10) * 1000 : 30000;
    const startTime = Date.now();

    console.log(chalk.cyan.bold('\n  Network Traffic Monitor\n'));
    console.log(chalk.dim(`  Duration: ${duration || 30}s  |  Press Ctrl+C to stop\n`));

    const render = () => {
      const snapshot = trafficService.getTrafficSnapshot();
      if (!snapshot) {
        process.stdout.write('\r  Waiting for traffic data...');
        return;
      }

      const avg = trafficService.getAverage();
      const peak = trafficService.getPeak();
      const history = trafficService.getHistory();
      const maxVal = Math.max(peak.download, peak.upload, 1);
      const totalSent = trafficService.getTotalSent();
      const totalRecv = trafficService.getTotalReceived();

      process.stdout.write('\x1B[2J\x1B[0f');
      console.log(chalk.cyan.bold('\n  Network Traffic Monitor\n'));

      console.log(`  ${chalk.bold('Current')}`);
      console.log(`  ${chalk.cyan('\u2191')} Upload:   ${chalk.white(formatter.bitsPerSecond(snapshot.uploadSpeed).padStart(14))}`);
      console.log(`  ${chalk.cyan('\u2193')} Download: ${chalk.white(formatter.bitsPerSecond(snapshot.downloadSpeed).padStart(14))}`);
      console.log();

      console.log(`  ${chalk.bold('Average')}`);
      console.log(`  ${chalk.dim('\u2191')} Upload:   ${chalk.white(formatter.bitsPerSecond(avg.upload).padStart(14))}`);
      console.log(`  ${chalk.dim('\u2193')} Download: ${chalk.white(formatter.bitsPerSecond(avg.download).padStart(14))}`);
      console.log();

      console.log(`  ${chalk.bold('Peak')}`);
      console.log(`  ${chalk.dim('\u2191')} Upload:   ${chalk.white(formatter.bitsPerSecond(peak.upload).padStart(14))}`);
      console.log(`  ${chalk.dim('\u2193')} Download: ${chalk.white(formatter.bitsPerSecond(peak.download).padStart(14))}`);
      console.log();

      console.log(`  ${chalk.bold('Network Usage Graph')}`);
      const graphHeight = 5;
      const samples = history.slice(-60);
      for (let row = graphHeight - 1; row >= 0; row--) {
        const threshold = (row + 1) / graphHeight;
        let line = '  ';
        for (const s of samples) {
          const upRatio = s.uploadSpeed / maxVal;
          const downRatio = s.downloadSpeed / maxVal;
          if (upRatio > threshold && downRatio > threshold) {
            line += chalk.yellow('\u2588');
          } else if (upRatio > threshold) {
            line += chalk.cyan('\u2584');
          } else if (downRatio > threshold) {
            line += chalk.white('\u2580');
          } else {
            line += ' ';
          }
        }
        console.log(line);
      }
      console.log(`  ${chalk.dim('\u2500'.repeat(Math.min(samples.length, 60)))}\n`);

      console.log(`  ${chalk.bold('Totals')}`);
      console.log(`  ${chalk.dim('Sent:')}     ${formatter.bytes(totalSent)}`);
      console.log(`  ${chalk.dim('Received:')} ${formatter.bytes(totalRecv)}`);
      console.log();

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (maxTime - elapsed) / 1000);
      if (maxTime < Infinity) {
        process.stdout.write(chalk.dim(`  ${remaining.toFixed(0)}s remaining  |  `));
      }
      process.stdout.write(chalk.dim('Press Ctrl+C to stop\n'));

      if (elapsed >= maxTime) {
        clearInterval(timer);
        console.log(chalk.yellow('\n  Traffic monitoring complete.\n'));
        process.exit(0);
      }
    };

    render();
    const timer = setInterval(render, 1000);

    process.on('SIGINT', () => {
      clearInterval(timer);
      console.log(chalk.yellow('\n  Traffic monitoring stopped.\n'));
      process.exit(0);
    });
  }
};

module.exports = trafficCommand;
