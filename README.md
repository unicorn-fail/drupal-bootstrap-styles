# Drupal Bootstrap Styles

> Styles used to bridge the gap between Drupal and Bootstrap.

The primary purpose of this project is to compile the source files for all
branches, versions and themes. These variables cause permutations that number
in the hundreds and the majority of them simply duplicates previously compiled
output.

# Installing

```bash
yarn install
```

# Compiling

```bash
yarn build
```

# API

After the project has been compiled, there is a `./dist/api.json` file that is
generated alongside  the compiled source files. This file contains a record
of all files generated. If a file has a `symlink` entry, it means the file is
a duplicate of a previously generated file and you should use it instead. This
file is necessary since NPM does not actually publish symlinks. 

# History

See: [Move "overrides" source files and generated CSS to separate project](https://www.drupal.org/project/bootstrap/issues/2852156)


[Bootstrap Framework]: https://getbootstrap.com/docs/3.4/
[Bootstrap Framework Source Files]: https://github.com/twbs/bootstrap-sass
[Drupal Bootstrap]: https://www.drupal.org/project/bootstrap
[Drupal Bootstrap Styles]: https://github.com/unicorn-fail/drupal-bootstrap-styles
[Sass]: http://sass-lang.com
