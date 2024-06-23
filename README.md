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

## Developer doc

The code is built using the `prettier` API and a JSON parser exported via `js_of_ocaml` from
the liquidsoap code.

The JSON parser builtin from liquidsoap code is not commited to this repository. You can download
it using the `dev:prepare` npm script. For instance:

```shell
npm run dev:prepare
```

If you are working on some changes on the liquidsoap language and want to update the parser file, you need
to install a pinned version of your changes from the liquidsoap code repository using `opam` and then run
`dune build` inside this repository. This should rebuild the parser file using your latest changes.
