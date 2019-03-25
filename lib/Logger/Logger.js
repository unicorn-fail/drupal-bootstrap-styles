// @todo Move to an upstream project like @string.js/logger.
const os = require('os');
const eol = os.EOL;

const { create: S, StringExtra } = require('@unicorn-fail/string-extra');
const graceful = require('node-graceful').default;
const prettyTime = require('pretty-time');
const pQueue = require('p-queue').default;

const LoggerLevels = require('./LoggerLevels.js');
const LoggerLines = require('./LoggerLines.js').default;
const LoggerLine = require('./LoggerLine.js').default;
const LoggerResult = require('./LoggerResult.js').default;
const LoggerTask = require('./LoggerTask.js').default;

const appStart = process.hrtime();

// Retrieve the OS signals.
const signals = new Map(Object.entries(os.constants.signals));

// Remove the following signals due to Node.js restrictions.
// @see https://nodejs.org/api/process.html#process_signal_events
signals.delete('SIGUSR1');
signals.delete('SIGKILL');
signals.delete('SIGPROF');
signals.delete('SIGSTOP');

// Add a custom "TIMEOUT" signal to be used internally (not actually shown).
// @see https://unix.stackexchange.com/a/205080
signals.set('TIMEOUT', -4); // 128 + -4 === 124;

class Logger {

  constructor(options = {}) {
    options = Object.assign({}, this.constructor.defaultOptions, options);

    if (!(options.levels instanceof LoggerLevels)) {
      options.levels = LoggerLevels.standard(options.argv);
    }

    /**
     * @type {LoggerLevels}
     */
    this.levels = options.levels;

    /**
     * @type {NodeJS.WriteStream|Stream}
     */
    this.stream = options.stream;

    if (options.hookStream) {
      StringExtra.hookStream(this.stream);
    }

    this.showExitInfo = options.showTotalTime;

    this.queue = new pQueue();

    this.lines = new LoggerLines({ stream: this.stream });


    // Handle events.
    graceful.exitOnDouble = false;
    graceful.DEADLY_SIGNALS = [];
    if (options.catchUncaughtException) {
      process.on('uncaughtException', e => this.fatal(e instanceof LoggerResult ? e.value : e, { exitCode: 2 }));
      process.on('uncaughtExceptionHandler', e => this.fatal(e instanceof LoggerResult ? e.value : e, { exitCode: 2 }));
    }
    if (options.catchUnhandledRejection) {
      process.on('unhandledRejection', e => this.fatal(e instanceof LoggerResult ? e.value : e, { exitCode: 3 }));
      process.on('unhandledRejectionHandler', e => this.fatal(e instanceof LoggerResult ? e.value : e, { exitCode: 3 }));
    }
    if (options.catchSignals) {
      for (let signal of signals.keys()) {
        graceful.on(signal, this.onSignal.bind(this));
      }
    }

    graceful.on('exit', this.onExit.bind(this), true);

    this._options = options;
  }

  onExit(done, event, signal) {
    this.cleanup();
    done();
  }

  async onSignal(done, event, signal) {
    if (signal !== 'SIGINT') {
      return this.fatal(S(['Received %s signal, quiting...', signal]).dim, { signal });
    }
    else if (!this.isInteractive) {
      return this.fatal(S(['Received %s signal, but non-interactive terminal detected, quiting...', signal]).dim, { signal });
    }

    const timer = setTimeout(() => {
      return this.fatal(S('Timed out, quiting...').dim, { signal: 'TIMEOUT' });
    }, 30000);

    this.queue.pause();
    this.lines.pause();

    const rawMode = typeof process.stdin.setRawMode === 'function' ? process.stdin.setRawMode.bind(process.stdin) : (() => {});
    rawMode(true);

    const line = this.block(S(['\nReceived %s. Press %s again to quit, press any other key to %s...', signal, 'Ctrl+C', 'continue']).dim, { footer: true });

    process.stdin.once('data', async data => {
      const byteArray = [...data];
      if (byteArray.length > 0 && byteArray[0] === 3) {
        this.lines.footer.delete(line);
        clearTimeout(timer);
        return graceful.exit(128 + os.constants.signals.SIGINT);
      }
      this.lines.footer.delete(line);
      clearTimeout(timer);
      rawMode(false);
      this.queue.start();
      this.lines.resume();
    });
  }

  get isInteractive() {
    return this.stream.isTTY && typeof process.stdin.setRawMode === 'function';
  }

  cleanup() {
    if (this.cleanedUp) {
      return;
    }

    this.cleanedUp = true;

    this.lines.clear();

    if (this.showExitInfo) {
      const total = prettyTime(process.hrtime(appStart));
      this.stream.write(eol);
      this.stream.write(S(`Total time:\t${total}${eol}`).dim.b);
      this.stream.write(eol);
    }

    if (this._options.hookStream) {
      StringExtra.unhookStream(this.stream);
    }
  }

  log(level, value, options = {}) {
    let stacktrace;

    options = {
      block: false,
      footer: false,
      header: false,
      printImmediately: false,
      showStacktrace: false,
      signal: false,
      ...options,
    };

    if (options.signal) {
      options.block = true;
    }

    // Format errors.
    if (value instanceof Error) {
      if (options.showStacktrace && value.stack) {
        const lines = value.stack.split(eol);
        const lvl = this.levels.get(level);
        value = lines[0];
        stacktrace = S(eol + lines.slice(1).join(eol));
        if (lvl) {
          stacktrace.style(lvl.styles.message);
        }
      }
      else {
        value = value.message;
      }
    }

    const line = new LoggerLine(value instanceof LoggerResult ? value.message : value, {
      ...options,
      level: value instanceof LoggerResult ? undefined : this.levels.get(level),
      stream: this.stream
    });

    if (options.header) {
      line.header;
    }

    if (value instanceof LoggerResult) {
      line.style(value.style);
    }

    if (stacktrace) {
      line.suffix(stacktrace.dim);
    }

    if (options.block) {
      line.prefix(eol).suffix(eol);
    }

    if (options.printImmediately) {
      this.stream.write(`${line}\n`);
    }
    else {
      this.lines.add(line, !!options.footer);
    }

    return line;
  }

  block(value, options = {}) {
    return this.line(value, {
      ...options,
      block: true,
    });
  }

  line(message, options = {}) {
    return this.log('', message, options);
  }

  header(message, options = {}) {
    return this.block(message, {
      ...options,
      header: true,
    });
  }

  insane(message, options = {}) {
    return this.log('insane', message, options);
  }

  debug(message, options = {}) {
    return this.log('debug', message, options);
  }

  verbose(message, options = {}) {
    return this.log('verbose', message, options);
  }

  info(message, options = {}) {
    return this.log('info', message, options);
  }

  warn(message, options = {}) {
    return this.log('warn', message, options);
  }

  success(message, options = {}) {
    return this.log('success', message, options);
  }

  error(message, options = {}) {
    options = {
      showStackTrace: true,
      ...options,
    };
    return this.log('error', message, options);
  }

  fatal(message, options = {}) {
    let level = 'fatal';

    options = {
      exitCode: 1,
      printImmediately: true,
      showStacktrace: true,
      signal: null,
      ...options,
    };

    // Change exit code to proper fatal signal value.
    // @see https://www.tldp.org/LDP/abs/html/exitcodes.html
    // @see https://www.bogotobogo.com/Linux/linux_process_and_signals.php#signals
    if (options.signal && signals.has(options.signal)) {
      options.exitCode = 128 + signals.get(options.signal);
      level = '';
    }

    // Convert message to an Error, only if not a signal.
    if (!options.signal && !(message instanceof Error) && !(message instanceof LoggerResult)) {
      message = new Error(S(message));
    }

    // Log the message.
    this.log(level, message, options);

    // Now gracefully exit.
    graceful.exit(options.exitCode);
  }

  createTask(fn, options = {}) {
    return (...args) => this.queue.add(() => LoggerTask.create(this, fn, { stream: this.stream, ...options }).run(...args));
  }

  createMultipleTasks(object, options = {}) {
    const getMethods = (object) => {
      let methods = new Set();
      let obj = object;
      const ignoreMethods = ['constructor', 'default'];
      while ((obj = Reflect.getPrototypeOf(obj))) {
        let keys = Reflect.ownKeys(object);
        keys.forEach((k) => {
          if (
            typeof k !== 'string' ||
            ignoreMethods.indexOf(k) !== -1 ||
            Object.getOwnPropertyDescriptors(object) && typeof Object.getOwnPropertyDescriptors(object)[k].get === 'function' ||
            typeof object[k] !== 'function' ||
            k[0] === '_' ||
            !k[0].match(/[a-z]/) ||
            k.endsWith('Sync')
          ) {
            return;
          }
          methods.add(k)
        });
      }
      return methods;
    };

    let methods = getMethods(object);

    // Prototype first, means that it's an instance.
    if (!methods.size) {
      methods = getMethods(object.constructor.prototype);
    }
    if (!methods.size) {
      methods = getMethods(object.constructor);
    }

    const quiet = [].concat(Array.isArray(options.quiet) ? options.quiet : []).filter(Boolean);
    const objectOptions = { ...(object[this.constructor.symbols.taskOptions] ? object[this.constructor.symbols.taskOptions]() : {}) };
    methods.forEach(method => {
      let levelLabel = method;
      if (options.name) {
        levelLabel = `${options.name}.${method}`;
      }
      else if (object.constructor && object.constructor.name && object.constructor.name !== 'Object') {
        levelLabel = `${object.constructor.name}.${method}`;
      }
      else if (object.name) {
        levelLabel = `${object.name}.${method}`;
      }
      if (!object[`${method}Async`]) {
        object[`${method}Async`] = object[method];
      }

      const taskOptions = {
        appendArguments: true,
        context: object,
        quiet: false,
        ...options,
        ...(objectOptions[method] || {}),
        levelLabel
      };

      if (taskOptions.quiet === true || quiet.indexOf(method) !== -1) {
        taskOptions.enabled = false;
      }

      object[method] = this.createTask(object[method], taskOptions);
    });
    return object;
  }

  result(value, message) {
    if (value instanceof LoggerResult) {
      if (message) {
        value.message = message;
      }
      return value;
    }
    return new LoggerResult(value, message);
  }

  setLevel(level) {
    this.levels.setLevel(level);
    return this;
  }
}

Logger.defaultOptions = {
  argv: {},
  catchUncaughtException: true,
  catchUnhandledRejection: true,
  catchSignals: true,
  hookStream: true,
  levels: null,
  parent: null,
  showTotalTime: true,
  stream: process.stderr,
};

Logger.symbols = {
  taskOptions: Symbol.for('string.js.logger.task.options')
};

module.exports = Logger;
module.exports.default = module.exports;
