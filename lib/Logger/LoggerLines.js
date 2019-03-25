const eol = require('os').EOL;

const ansiEscapes = require('ansi-escapes').default;
const cliCursor = require('cli-cursor');

class LoggerLines {

  constructor(options = {}) {
    options = {
      stream: process.stderr,
      ...options,
    };

    /** @type {Set<LoggerLine>} */
    this.lines = new Set();

    /** @type {Set<LoggerLine>} */
    this.footer = new Set();

    this.stream = options.stream;

    this.paused = false;

    this.poll = null;
  }

  add(line, footer = false) {
    if (footer) {
      if (!this.footer.has(line)) {
        this.footer.add(line);
      }
    }
    else {
      if (!this.lines.has(line)) {
        this.lines.add(line);
      }
    }
    this.update();
  }

  delete(line, footer = false) {
    if (footer) {
      if (!this.footer.has(line)) {
        return this;
      }
      this.footer.delete(line);
    }
    else {
      if (!this.lines.has(line)) {
        return this;
      }
      this.lines.delete(line);
    }
    this.update();
  }

  clear() {
    for (let line of this.lines) {
      line.stop(false);
    }
    for (let line of this.footer) {
      line.stop(false);
    }
    this.lines.clear();
    this.footer.clear();
    this.update();
  }

  has(line, footer = false) {
    if (footer) {
      return this.footer.has(line);
    }
    return this.lines.has(line);
  }

  forEach(...args) {
    this.lines.forEach(...args);
    this.update();
  }

  pause() {
    this.paused = true;
    for (let line of this.lines) {
      line.pause();
    }
    this.update();
  }

  resume() {
    this.paused = false;
    for (let line of this.lines) {
      line.resume();
    }
    this.update();
  }

  write(lines) {
    const array = [...lines];
    const output = [];
    for (let i = 0, l = array.length; i < l; i++) {
      const line = array[i];
      const string = line.toString();
      if (string.length) {
        output.push(`${string}${ansiEscapes.eraseEndLine}`);
        line.printed = true;
      }
    }
    if (output.length) {
      output.push('');
      this.stream.write(output.join(eol));
    }
    return output;
  }

  update() {
    // Ignore disabled lines (nothing can be done with them here).
    const lines = [...this.lines, ...this.footer].filter(l => l.enabled);

    const stopUpdate = (lines = []) => {
      if (!lines.length && this.poll) {
        this.poll = clearInterval(this.poll);
        cliCursor.show(this.stream);
      }
      else if (lines.length && !this.poll) {
        cliCursor.hide(this.stream);
        this.poll = setInterval(this.update.bind(this), 100);
      }

      this.updating = false;
    };

    // Immediately return if nothing to print.
    if (!lines.length) {
      return stopUpdate(lines);
    }

    // Determine the number of currently printed lines and the move cursor up.
    const printed = lines.filter(l => l.printed);
    const currentNewLines = printed.map(line => line.toString()).concat('').join(eol).split(eol).length;
    if (currentNewLines) {
      this.stream.write(ansiEscapes.cursorLeft + ansiEscapes.cursorUp(currentNewLines - 1));
    }

    const firstRunningIndex = lines.findIndex(l => l.isRunning);

    // Print out finished lines.
    const finished = lines.slice(0, firstRunningIndex !== -1 ? firstRunningIndex : undefined);
    this.write(finished);

    // Remove finished lines.
    finished.forEach(l => {
      if (this.lines.has(l)) {
        this.lines.delete(l);
      }
      else if (this.footer.has(l)) {
        this.footer.delete(l);
      }
    });

    // Return if there are no lines running.
    if (firstRunningIndex === -1) {
      return stopUpdate(lines);
    }

    // Move cursor up to the first running line so the lines can be reprinted.
    const remaining = lines.slice(firstRunningIndex);

    // Reset printed status on running lines.
    remaining.filter(l => l.isRunning).forEach(l => l.printed = false);

    const output = this.write(remaining);

    stopUpdate(output);
  }

}

module.exports = LoggerLines;
module.exports.default = module.exports;
