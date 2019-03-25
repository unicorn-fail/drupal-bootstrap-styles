const LoggerLine = require('./LoggerLine.js').default;
const LoggerResult = require('./LoggerResult.js').default;

class LoggerTask {

  constructor(logger, fn, options = {}) {
    /** @type {Logger} */
    this.logger = logger;

    /** @type {Function} */
    this.fn = fn;

    /** @type {LoggerResult} */
    this.result = null;

    this.options = {
      appendArguments: false,
      context: null,
      errorsAsFalse: false,
      message: '',
      rethrow: true,
      stream: process.stderr,
      ...options,
      level: this.logger.levels.get(options.level),
      task: this,
    };
  }

  static create(logger, fn, options = {}) {
    return new LoggerTask(logger, fn, options);
  }

  async run(...args) {
    const options = { ...this.options };
    let taskArgs = [...args].filter(a => a && typeof a === 'string' && a.length <= (process.env.COLUMNS || 200));
    let message = options.message;
    if (options.appendArguments && taskArgs.length) {
      if (options.message) {
        message = [`${options.message} ${taskArgs.map(() => '%s').join(' ')}`, ...taskArgs];
      }
      else {
        message = [taskArgs.map(() => '%s').join(' '), ...taskArgs];
      }
    }

    const line = LoggerLine.create(message, {
      ...options,
      args: taskArgs
    }).start();

    this.logger.lines.add(line);
    return Promise.resolve(this.fn.apply(options.context, args))
      .then(result => {
        // Callbacks are intended to be promises, but just in case... wrap
        // with Promise.resolve(). If an error was thrown, assume "false" as
        // the resolved value. If no error was thrown and there wasn't a
        // return value, assume "true". If there was a value returned,
        // resolve with the returned value.
        if (result === null || result === undefined) {
          result = true;
        }

        this.result = result instanceof LoggerResult ? result : new LoggerResult(result);

        line.stop(this.result);

        // If a message was explicitly set, show it.
        if (this.result.message) {
          this.logger.log('', this.result);
        }

        return Promise.resolve(this.result);
      })
      .catch(result => {
        if (options.errorsAsFalse && result instanceof Error) {
          result = new LoggerResult(false);
          result.rethrow = false;
        }

        this.result = result instanceof LoggerResult ? result : new LoggerResult(result);

        line.stop(this.result);

        if (!this.result.rethrow) {
          return Promise.resolve(this.result);
        }
        // If a message was explicitly set, show it.
        if (this.result.message) {
          this.logger.log('', this.result);
        }

        return Promise.reject(this.result);
      });
  }

}

module.exports = LoggerTask;
module.exports.default = module.exports;
