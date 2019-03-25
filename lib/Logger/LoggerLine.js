const { create:S, StringJs, StringExtra } = require('@unicorn-fail/string-extra').default;
const cliSpinners = require('cli-spinners').default;
const prettyTime = require('pretty-time');

const LoggerResult = require('./LoggerResult.js').default;

class LoggerLine extends StringExtra {

  constructor(value, options = {}) {
    if (typeof options.spinner !== 'object') {
      if (process.platform === 'win32') {
        options.spinner = cliSpinners.line;
      }
      else if (options.spinner === undefined) {
        // Set default spinner
        options.spinner = cliSpinners.dots;
      }
      else if (cliSpinners[options.spinner]) {
        options.spinner = cliSpinners[options.spinner];
      }
      else {
        throw new Error(`There is no built-in spinner named '${options.spinner}'. See https://github.com/sindresorhus/cli-spinners/blob/master/spinners.json for a full list.`);
      }
    }

    if (!Array.isArray(options.spinner.frames) || !options.spinner.frames.every(i => typeof i === 'string' || i instanceof StringExtra )) {
      throw new Error('The given spinner must have a `frames` property that is an array of strings.');
    }

    super(value, {
      hideCursor: true,
      level: null,
      paused: false,
      pausedStyle: 'yellow',
      spinnerStyle: 'cyan',
      stream: process.stderr,
      task: null,
      ...options
    });

    this.frameIndex = 0;
    this.printed = false;
  }

  get enabled() {
    const level = this.getOption('level');

    // Manual override.
    let enabled = this.getOption('enabled');

    if (enabled === undefined) {
      enabled = level ? level.isWritable : true;

      // If line is a task, that means the stream needs to be interactive so
      // it can dynamically update the line at certain intervals.
      if (enabled && this.isRunning) {
        const stream = this.getOption('stream');
        enabled = (stream && stream.isTTY) && !process.env.CI;
      }
    }

    return enabled;
  }

  set enabled(value) {
    this.setOption('enabled', !!value);
  }

  get hasStarted() {
    return !!this.getOption('started');
  }

  get hasFinished() {
    return !!this.getOption('stopped');
  }

  get interval() {
    let interval = this.getOption('interval');
    if (interval === undefined) {
      const spinner = this.getOption('spinner');
      interval = spinner.interval || 100;
      this.setOption('interval', interval);
    }
    return parseInt(interval, 10);
  }

  get isPaused() {
    return this.isTask && !!this.getOption('paused');
  }

  pause() {
    if (!this.isRunning || this.isPaused) {
      return this;
    }
    return this.setOption('paused', process.hrtime(this.getOption('started')));
  }

  resume() {
    if (!this.isRunning || !this.isPaused) {
      return this;
    }
    return this.setOption('paused', false);
  }

  get isTask() {
    return !!this.getOption('task');
  }

  get isRunning() {
    return this.isTask && !this.hasFinished;
  }

  get stream() {
    return this.getOption('stream');
  }

  elapsed() {
    const paused = this.getOption('paused');
    const time = paused ? paused : this.getOption('stopped');
    const elapsed = prettyTime(time ? time : process.hrtime(this.getOption('started')));
    return S(`(${elapsed})${paused ? ' [paused]' : ''}`).dim;
  }

  format() {
    // Immediately return an empty string if not enabled.
    if (!this.enabled) {
      return '';
    }

    /** @type {LoggerLevel} */
    const level = this.getOption('level');

    let prefix = '';
    let suffix = '';

    if (this.isTask) {
      suffix = this.elapsed();
      if (this.isPaused) {
        prefix = S('≡').style(this.getOption('pausedStyle'));
        this.style(this.getOption('pausedStyle'));
      }
      else if (this.isRunning) {
        prefix = this.spinner();
        this.style(this.getOption('spinnerStyle'));
      }
      else if (this.hasFinished) {
        const result = this.result || new LoggerResult();
        prefix = S(result.icon).style(result.style);
      }
    }
    else if (level && level.name === 'success') {
      const result = new LoggerResult(true);
      prefix = S(result.icon).style(result.style);
    }
    else if (!level || level.name !== '') {
      prefix = S(' ');
    }

    if (this.result) {
      this.style(this.result.style);
    }

    if (level) {
      if (!this.getOption('style')) {
        this.style(level.styles.message);
      }
      const levelLabel = this.getOption('levelLabel');
      const label = level.getLabel(levelLabel, !levelLabel);
      if (label) {
        if (!label.getOption('style')) {
          if (this.result) {
            label.style(this.result.style);
          }
          else if (this.isPaused) {
            label.style(this.getOption('pausedStyle'));
          }
          else if (this.isRunning) {
            label.style(this.getOption('spinnerStyle'));
          }
        }
        prefix = prefix ? prefix.suffix(label) : label;
      }
    }

    const formatted = super.format();

    return S(formatted).prefix(prefix).suffix(suffix).toString();
  }

  spinner() {
    const {frames} = this.getOption('spinner');
    const frame = S(frames[this.frameIndex]).style(this.getOption('spinnerStyle'));
    this.frameIndex = ++this.frameIndex % frames.length;
    this.resetFormatted();
    return frame;
  }

  start() {
    // Immediately return if already running.
    if (!this.isTask || this.hasStarted) {
      return this;
    }

    // Render the spinner frame every half a second, only if enabled.
    if (this.enabled) {
      this.poll = setInterval(this.spinner.bind(this), this.interval);
    }

    return this.setOption('started', process.hrtime());
  }

  stop(result) {
    // Stop the polling.
    if (this.poll) {
      this.poll = clearInterval(this.poll);
    }

    // Immediately return if not already running.
    if (!this.isTask || this.hasFinished) {
      return this;
    }

    this.result = result instanceof LoggerResult ? result : new LoggerResult(result);

    this.setOption('stopped', process.hrtime(this.getOption('started')));
  }

}

module.exports = LoggerLine;
module.exports.default = module.exports;
