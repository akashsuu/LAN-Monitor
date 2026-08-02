const chalk = require('../utils/theme');
const trafficService = require('../services/traffic');
const formatter = require('../utils/formatter');

const trafficCommand = {
  async execute(duration) {
    const maxTime = duration ? parseInt(duration, 10) * 1000 : 30000;
    const startTime = Date.now();
    let lineCount = 0;

    console.log(chalk.cyan.bold('\n  Network Traffic Monitor\n'));
    console.log(chalk.dim(`  Duration: ${duration || 30}s  |  Press Ctrl+C to stop\n`));
    lineCount = 2;

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

      process.stdout.cursorTo(0, 2);
      process.stdout.write('\x1B[J');

      const lines = [];

      lines.push(`  ${chalk.bold('Current')}`);
      lines.push(`  ${chalk.cyan('\u2191')} Upload:   ${chalk.white(formatter.bitsPerSecond(snapshot.uploadSpeed).padStart(14))}`);
      lines.push(`  ${chalk.cyan('\u2193')} Download: ${chalk.white(formatter.bitsPerSecond(snapshot.downloadSpeed).padStart(14))}`);
      lines.push('');

      lines.push(`  ${chalk.bold('Average')}`);
      lines.push(`  ${chalk.dim('\u2191')} Upload:   ${chalk.white(formatter.bitsPerSecond(avg.upload).padStart(14))}`);
      lines.push(`  ${chalk.dim('\u2193')} Download: ${chalk.white(formatter.bitsPerSecond(avg.download).padStart(14))}`);
      lines.push('');

      lines.push(`  ${chalk.bold('Peak')}`);
      lines.push(`  ${chalk.dim('\u2191')} Upload:   ${chalk.white(formatter.bitsPerSecond(peak.upload).padStart(14))}`);
      lines.push(`  ${chalk.dim('\u2193')} Download: ${chalk.white(formatter.bitsPerSecond(peak.download).padStart(14))}`);
      lines.push('');

      lines.push(`  ${chalk.bold('Network Usage Graph')}`);
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
        lines.push(line);
      }
      lines.push(`  ${chalk.dim('\u2500'.repeat(Math.min(samples.length, 60)))}`);
      lines.push('');

      lines.push(`  ${chalk.bold('Totals')}`);
      lines.push(`  ${chalk.dim('Sent:')}     ${formatter.bytes(totalSent)}`);
      lines.push(`  ${chalk.dim('Received:')} ${formatter.bytes(totalRecv)}`);
      lines.push('');

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (maxTime - elapsed) / 1000);
      if (maxTime < Infinity) {
        lines.push(chalk.dim(`  ${remaining.toFixed(0)}s remaining  |  Press Ctrl+C to stop`));
      } else {
        lines.push(chalk.dim('Press Ctrl+C to stop'));
      }

      for (const line of lines) {
        process.stdout.write(line + '\n');
      }

      if (elapsed >= maxTime) {
        clearInterval(timer);
        console.log(chalk.yellow('\n  Traffic monitoring complete.\n'));
        process.exit(0);
      }
    };

    trafficService.getTrafficSnapshot();
    const timer = setInterval(render, 1000);

    process.on('SIGINT', () => {
      clearInterval(timer);
      console.log(chalk.yellow('\n  Traffic monitoring stopped.\n'));
      process.exit(0);
    });
  }
};

module.exports = trafficCommand;
