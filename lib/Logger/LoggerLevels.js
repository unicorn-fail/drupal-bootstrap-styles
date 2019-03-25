const chalk = require('chalk').default;

const LoggerLevel = require('./LoggerLevel.js');

/**
 * @type Map<string,LoggerLevel>
 */
class LoggerLevels extends Map {

  constructor() {
    super();
    this.currentLevel = 0;

    // Always add an empty level for printing normal lines.
    this.add('', null, null, { writable: true });
  }

  add(name, messageStyle = null, labelStyle = null, options = {}) {
    const level = new LoggerLevel(this, name, {
      styles: {
        message: messageStyle,
        label: labelStyle
      },
      ...options,
    });
    this.set(name, level);
    return this;
  }

  get(key = '') {
    if (this.has(key)) {
      return super.get(key);
    }
    return new LoggerLevel(this, key, { writable: true });
  }

  index(level) {
    const index = Array.from(this.keys()).indexOf(level);
    return index !== -1 ? index : this.size + 1;
  }

  setLevel(level) {
    this.currentLevel = this.index(level);
    return this;
  }

}

LoggerLevels.standard = function (argv = {}) {
  const levels = new LoggerLevels()
    .add('fatal', chalk.red, chalk.whiteBright.bgRed)
    .add('error', chalk.red, null, { showLabel: false })
    .add('success', chalk.green, null, { showLabel: false })
    .add('warn', chalk.yellow)
    .add('verbose', chalk.cyan)
    .add('info', chalk.green)
    .add('debug', chalk.magenta)
    .add('insane', chalk.blue);

  // Automatically set the level based on passed arguments (i.e. yargs).
  if (argv.verbose >= 4 || (argv.verbose && argv.debug)) {
    levels.setLevel('insane');
  }
  else if (argv.verbose >= 3 || argv.debug) {
    levels.setLevel('debug');
  }
  else if (argv.verbose >= 2) {
    levels.setLevel('info');
  }
  else if (argv.verbose >= 1 || argv.verbose) {
    levels.setLevel('verbose');
  }
  else {
    levels.setLevel('warn');
  }

  return levels;
};

module.exports = LoggerLevels;
