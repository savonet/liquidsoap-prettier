# Liquidsoap prettier

This package provides a [Prettier](https://prettier.io/) plugin for liquidsoap code
as well as a `liquidsoap-prettier` binary for formatting liquidsoap scripts.

## Installation

### `liquidsoap-prettier`

The `liquidsoap-prettier` command-line utility should be installed with this
package and should be available following the usual node package binary
conventions.

Format one or more files in place:

```shell
$ liquidsoap-prettier -w path/to/file.liq "path/with/glob/pattern/**/*.liq"
```

Print formatted output to stdout (single file only):

```shell
$ liquidsoap-prettier path/to/file.liq
```

Read from stdin and write to stdout:

```shell
$ cat path/to/file.liq | liquidsoap-prettier --stdin-filepath file.liq
```

Check whether files are already formatted (useful in CI):

```shell
$ liquidsoap-prettier -c path/to/file.liq "path/with/glob/pattern/**/*.liq"
```

Returns exit code `0` when all files are already formatted, `2` otherwise.

Dump the parsed AST as JSON (useful when debugging the printer):

```shell
$ liquidsoap-prettier --dump-ast path/to/file.liq
```

Print the version or show all options:

```shell
$ liquidsoap-prettier --version
$ liquidsoap-prettier --help
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

If you are working on changes to the liquidsoap language and want to rebuild the parser, you can either
install your changes using `opam pin` and then run `dune build`, or build against your local liquidsoap
tree directly without pinning by pointing `OCAMLPATH` at the build artifacts:

```shell
# 1. Build and stage the liquidsoap libraries (no install required)
cd /path/to/liquidsoap && dune build @install

# 2. Build the prettier parser against those libraries
cd /path/to/liquidsoap-prettier
OCAMLPATH=/path/to/liquidsoap/_build/install/default/lib dune build
```

`OCAMLPATH` makes the OCaml toolchain find the liquidsoap libraries from the local build tree rather than
the opam switch, so your changes are picked up immediately without any pinning or reinstallation.
