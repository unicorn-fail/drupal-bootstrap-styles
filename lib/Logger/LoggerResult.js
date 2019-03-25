const chalk = require('chalk').default;
const ansiRegex = require('ansi-regex');
const logSymbols = require('log-symbols');

const success = Symbol.for('string.logger.result.success');
const error = Symbol.for('string.logger.result.error');
const warning = Symbol.for('string.logger.result.warning');
const info = Symbol.for('string.logger.result.info');

class LoggerResult {

  constructor(value, message) {
    this.message = message;
    this.rethrow = true;
    if (typeof value === 'symbol') {
      this.symbol = value;
      switch (value) {
        case success:
          this.value = true;
          break;

        case error:
          this.value = false;
          break;

        case warning:
          this.value = null;
          break;

        default:
          this.value = undefined;
          break;
      }
    }
    else {
      this.value = value;
      if (this.value === true) {
        this.symbol = success;
      }
      else if (this.value === false || this.value instanceof Error) {
        this.symbol = error;
      }
      else if (this.value === null || this.value === undefined) {
        this.symbol = warning;
      }
      else {
        this.symbol = value ? success : info;
      }
    }
  }

  get icon() {
    switch (this.symbol) {
      case success:
        return logSymbols.success.replace(ansiRegex(), '');

      case error:
        return logSymbols.error.replace(ansiRegex(), '');

      case warning:
        return logSymbols.warning.replace(ansiRegex(), '');

      case info:
        return logSymbols.info.replace(ansiRegex(), '');

      default:
        return '';
    }
  }

  get style() {
    switch (this.symbol) {
      case success:
        return chalk.green;

      case error:
        return chalk.red;

      case warning:
        return chalk.yellow;

      case info:
        return chalk.blue;

      default:
        return '';
    }
  }

  get error() {
    this.symbol = error;
    return this;
  }

  get info() {
    this.symbol = info;
    return this;
  }

  get success() {
    this.symbol = success;
    return this;
  }

  get warning() {
    this.symbol = warning;
    return this;
  }

}

module.exports = LoggerResult;
module.exports.default = module.exports;
