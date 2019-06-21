const eol = require('os').EOL;

const { create:S } = require('@unicorn-fail/string-extra').default;
const less = require('less');
const LessPluginAutoPrefix = require('less-plugin-autoprefix');
const LessPluginCleanCSS = require('less-plugin-clean-css');


const logger = require('./logger.js').default;

class LessCompiler {

  constructor(...options) {
    this.less = less;
    this.options = {
      paths: [
        ...(options.paths || []),
      ],
      plugins: [
        new LessPluginCleanCSS({
          advanced: true
        }),
        new LessPluginAutoPrefix({
          browsers: [
            "Android 2.3",
            "Android >= 4",
            "Chrome >= 20",
            "Firefox >= 24",
            "Explorer >= 8",
            "iOS >= 6",
            "Opera >= 12",
            "Safari >= 6"
          ],
          map: true
        }),
        ...(options.plugins || []),
      ],
      ...options
    };
  }

  async render(content = '', options = {}) {
    const stacktrace = new Error().stack.split(eol).slice(1).join(eol);

    // Wrap renderer in a timeout to ensure promise chain isn't exponentially
    // affected (possible bug with the less module?).
    return new Promise((resolve) => setTimeout(() => {
      this.less.render(content, options).then(resolve);
    }))
      .then (result => {
        return result.css;
      })
      .catch(e => {
        let code = '';
        if (e.extract && e.extract.length) {
          e.extract.splice(2, 0, ' '.repeat(e.column) + '⋀');
          code = eol + eol + e.extract.filter(Boolean).map((string, index) => {
            const lineNumber = S(`${index === 2 ? '' : e.line - (index > 2 ? 2 : 1) + index}`).padLeft(6, ' ');
            const line = S(`${string}`);
            if (index !== 1 && index !== 2) {
              lineNumber.yellow.dim;
              line.yellow.dim;
            }
            else if (index === 1) {
              lineNumber.redBright.bold;
              line.redBright.bold;
            }
            return line.prefix(lineNumber, '    ').toString();
          }).join(eol) + eol + eol;
        }
        if (!e.stack) {
          e.stack = `${e.type}Error ${e.message}${code}    at (${e.filename}:${e.line}:${e.column})\n${stacktrace}`;
        }
        return logger.fatal(e);
      });
  }

}

module.exports = LessCompiler;
module.exports.default = LessCompiler;
