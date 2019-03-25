const chalk = require('chalk').default;

const argv = require('yargs')
  .alias('c', 'color')
  .alias('d', 'debug')
  .alias('f', 'force')
  .alias('r', 'remove-dist')
  .alias('v', 'verbose')
  .count('verbose')
  .argv;

if (argv.color === undefined) {
  argv.color = chalk.supportsColor;
}
chalk.level = argv.color ? 1 : 0;

module.exports = argv;
