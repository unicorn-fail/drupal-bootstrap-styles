const { create:S } = require('@unicorn-fail/string-extra');
const chalk = require('chalk').default;

class LoggerLevel {

  constructor(levels, name, options = {}) {
    options = {
      showLabel: true,
      styles: {
        message: chalk,
        label: null,
        ...(options.styles || {})
      },
      writable: null,
      ...options
    };

    this.styles = options.styles;

    if (!this.styles.label) {
      this.styles.label = typeof options.styles.label === 'function' ? options.styles.label : options.styles.message && options.styles.message.bgBlackBright;
    }

    this.levels = levels;
    this.name = name;
    this.writable = options.writable;
    this.showLabel = options.showLabel;
  }

  getLabel(label = this.name, applyStyle = true) {
    if (!label || !this.showLabel) {
      return '';
    }
    label = S(label);
    if (applyStyle && this.styles.label) {
      label.style(this.styles.label);
    }
    return label;
  }

  get alwaysWritable() {
    return this.writable !== null && this.writable !== undefined && !!this.writable;
  }

  get isWritable() {
    if (this.alwaysWritable) {
      return true;
    }
    return this.levels.index(this.name) <= this.levels.currentLevel;
  }

}

module.exports = LoggerLevel;
