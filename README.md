# Liquidsoap prettier

This package provides a [Prettier](https://prettier.io/) plugin for liquidsoap code
as well as a `liquidsoap-prettier` binary for formatting liquidsoap scripts.

## Installation

### `liquidsoap-prettier`

The `liquidsoap-prettier` command-line utility should be installed with this
package and should be available following the usual node package binary
conventions.

It works as follows:

```shell
$ liquidsoap-prettier [-w|--write] path/to/file.liq "path/with/glob/pattern/**/*.liq"
```

### Prettier plugin

The package also provides a prettier plugin which can be used to add liquidsoap script parsing to
your project. To enable, you need a local `package.json`.

First, install the required packages:

```sh
npm install -D prettier liquidsoap-prettier
```

Then add the plugin to your Prettier config:

```json
// .prettierrc
{
  "plugins": ["liquidsoap-prettier"]
}
```
