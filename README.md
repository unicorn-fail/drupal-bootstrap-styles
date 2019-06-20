# Drupal Bootstrap Styles

> Styles used to bridge the gap between Drupal and Bootstrap.

The primary purpose of this project is to provide additional default styling for
[Drupal Bootstrap] based sub-themes.

## Source Files

#### 8.x-3.x ([documentation](https://drupal-bootstrap.org/api/bootstrap/docs!Sub-Theming.md/group/sub_theming/8.x-3.x))
- [LESS](src/3.x.x/8.x-3.x/less/)
- [SASS](src/3.x.x/8.x-3.x/scss/)

#### 7.x-3.x ([documentation](https://drupal-bootstrap.org/api/bootstrap/docs!Sub-Theming.md/group/sub_theming/7.x-3.x))
- [LESS](src/3.x.x/7.x-3.x/less/)
- [SASS](src/3.x.x/7.x-3.x/scss/)

---

## CDN (Distributed)

For CDN based sub-themes, this project compiles the above source files for all
branches, versions and themes and publishes them as a package available on
[NPM]. This is primarily due to the shear number of permutations created by
these variables; which number in the hundreds, of which the majority of them
are simply duplicates of previously compiled output.

## Development

When developing locally, you must first install [Node.js] and [Yarn]. Once
installed, you may run the following commands from the root directory of this
project.

#### Project Installation

```bash
yarn install
```

#### Compiling

```bash
yarn build
```

#### API

After the project has been compiled, there is a `./dist/api.json` file that is
generated alongside  the compiled source files. This file contains a record
of all files generated. If a file has a `symlink` entry, it means the file is
a duplicate of a previously generated file and you should use it instead. This
file is necessary since [NPM] does not actually publish symlinks. 

## History

This project was created in an effort to consolidate and simplify the tedious
task of compiling multiple permutations of the generated styles within the
project. It was also done in an effort to reduce the overall packaged size of
the base theme as not everyone will need these styles and, if so, would only
need a single compiled versions based on the version and theme chosen. For more
information, see the following original Drupal.org issue:

[Move "overrides" source files and generated CSS to separate project](https://www.drupal.org/project/bootstrap/issues/2852156)


[Bootstrap Framework]: https://getbootstrap.com/docs/3.4/
[Bootstrap Framework Source Files]: https://github.com/twbs/bootstrap-sass
[Drupal Bootstrap]: https://www.drupal.org/project/bootstrap
[Drupal Bootstrap Styles]: https://github.com/unicorn-fail/drupal-bootstrap-styles
[Sass]: http://sass-lang.com
[NPM]: https://www.npmjs.com/package/@unicorn-fail/drupal-bootstrap-styles
[Node.js]: https://nodejs.org
[Yarn]: https://yarnpkg.com
