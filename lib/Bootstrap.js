const path = require('path');

const { PluginManager } = require('live-plugin-manager');
const CleanCSS = require('clean-css');

const argv = require('./argv.js');
const fs = require('./fs.js');
const logger = require('./logger.js').default;
const { absolute, relative } = require('./Paths.js').default;
const LessCompiler = require('./LessCompiler.js');
const SassCompiler = require('./SassCompiler.js');
const sri = require('./Sri.js').global;

class Bootstrap {

  constructor(version) {
    this.cleanCss = logger.createMultipleTasks(new CleanCSS({
      compatibility: 'ie8',
      level: 2,
      returnPromise: true,
    }), { level: 'info' });
    this.compilers = {
      less: logger.createMultipleTasks(new LessCompiler(), { level: 'info' }),
      sass: logger.createMultipleTasks(new SassCompiler(), { level: 'info' }),
    };
    this.version = version;
    this.paths = {
      bootstrap: absolute.assets(this.version, 'bootstrap'),
      bootswatch: absolute.assets(this.version, 'bootswatch'),
    };
  }

  [logger.symbols.taskOptions]() {
    return {
      bootswatchThemes: { quiet: true },
      iterate: { quiet: true },
      minify: { level: 'info' },
      save: { level: 'info' },
      variablesExist: { level: 'info' },
      mappedVersion: { level: 'insane' }
    };
  }

  async compile(branch) {
    return this.iterate(async function compile(compiler, name, version, theme) {
      const dest = absolute.cssOutput(version, branch, theme);
      const minDest = absolute.cssOutput(version, branch, theme, true);

      // Skip if files already exist and not forced.
      if (!argv.force && fs.pathExistsSync(dest) && fs.pathExistsSync(minDest)) {
        return true;
      }

      const imports = new Set();

      // Import SASS default variables.
      if (compiler === 'sass') {
        imports.add(relative.srcDefaultVariables(compiler, version, name));
      }

      // Import Bootstrap variables.
      imports.add(relative.assetVariables(compiler, version, 'bootstrap'));

      // Import theme variables.
      imports.add(relative.assetVariables(compiler, version, name, theme));

      // Import LESS default variables.
      if (compiler === 'less') {
        imports.add(relative.srcDefaultVariables(compiler, version, branch));
      }

      // Import Bootstrap mixins.
      imports.add(relative.assetMixins(compiler, version, 'bootstrap'));

      // Import missing variables.
      imports.add(relative.srcMissingVariables(compiler, version));

      // Import base theme styles.
      imports.add(relative.srcDrupalBootstrap(compiler, version, branch));

      logger.insane(['Imports: %j', imports]);

      const content = [...imports].map(i => `@import "${i}"`).join(';') + ';';
      return this.compilers[compiler].render(content)
        .then(({ value: output }) => this.save(dest, output)
          .then(() => this.minify(output))
          .then(({ value: minified }) => this.save(minDest, minified))
        );
    });
  }

  async minify(contents) {
    return this.cleanCss.minify(contents)
      .then(({ value }) => value.styles);
  }

  async save(dest, output) {
    const dir = path.dirname(dest);
    return fs.ensureDir(dir)
      .then(() => sri.getTarget(output, dest))
      .then(({ value: target }) => target && typeof target === 'string'
        ? fs.ensureSymlink(path.relative(dir, target), dest)
        : fs.outputFile(dest, output))
  }

  getPath(name) {
    if (!this.paths[name]) {
      throw new Error(`Invalid package: ${name}`);
    }
    return this.paths[name];
  }

  /**
   * Maps a specific version.
   *
   * While the Bootswatch project attempts to maintain version parity with
   * Bootstrap, it doesn't always happen. This causes issues when the system
   * expects a 1:1 version match between Bootstrap and Bootswatch.
   *
   * @return {String}
   *
   * @see  https://github.com/thomaspark/bootswatch/issues/892#ref-issue-410070082
   */
  mappedVersion(name) {
    if (name === 'bootswatch') {
      switch (this.version) {
        // This version is "broken" because of jsDelivr's API limit.
        case '3.4.1':
          return '3.4.0';

        // This version doesn't exist.
        case '3.1.1':
          return '3.2.0';
      }
    }
    return this.version;
  }

  async install(name) {
    return fs.remove(this.getPath(name))
      .then(() => this.mappedVersion(name))
      .then(({ value: version }) => {
        // Don't use this.paths here since the plugin manager just needs the
        // version as it installs the asset inside a matching name directory.
        const manager = new PluginManager({
          pluginsPath: absolute.assets(this.version),
        });
        return manager.install(name, version).catch(e => Promise.reject(logger.result(e)));
      });
  }

  async bootswatchThemes(version = this.version) {
    // @todo Read this from the API files?
    const themes = {
      3: [
        'cerulean',
        'cosmo',
        'cyborg',
        'darkly',
        'flatly',
        'journal',
        'lumen',
        'paper',
        'readable',
        'sandstone',
        'simplex',
        'slate',
        'spacelab',
        'superhero',
        'united',
        'yeti',
      ],
      4: [
        'cerulean',
        'cosmo',
        'cyborg',
        'darkly',
        'flatly',
        'journal',
        'litera',
        'lumen',
        'lux',
        'materia',
        'minty',
        'pulse',
        'sandstone',
        'simplex',
        'sketchy',
        'slate',
        'solar',
        'spacelab',
        'superhero',
        'united',
        'yeti',
      ],
    };
    return [...(version && themes[version[0]] || [])];
  }

  async iterate(fn) {
    const compiler = `${this.version[0]}` === '3' ? 'less' : 'sass';
    return this.bootswatchThemes().then(({value:bootswatchThemes}) => {
      return Promise.mapSeries(['bootstrap', 'bootswatch'], async (name) => {
        const themes = name === 'bootstrap' ? ['bootstrap'] : bootswatchThemes;
        return Promise.mapSeries(themes, (theme) => {
          return logger.createTask(fn, {
            appendArguments: true,
            context: this,
            level: 'verbose',
            levelLabel: `${this.constructor.name}.${fn.name || 'iterate'}`
          })(compiler, name, this.version, theme);
        });
      })
    });
  }

  async variablesExist() {
    const compiler = `${this.version[0]}` === '3' ? 'less' : 'sass';
    return Promise.mapSeries(['bootstrap', 'bootswatch'], name => {
      return fs.pathExists(absolute.assetVariables(compiler, this.version, name))
        .then(({ value: exists }) => !exists && this.install(name))
    });
  }

}

module.exports = Bootstrap;
module.exports.default = module.exports;
