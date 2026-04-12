#!/usr/bin/env node

import parseArgs from "minimist";
import prettier from "prettier";
import fs from "node:fs";
import { glob } from "glob";
import BluebirdPromise from "bluebird";
import { createRequire } from "node:module";
import * as prettierPluginLiquidsoap from "./index.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const HELP = `\
Usage: liquidsoap-prettier [options] <file> [<file> ...]
       liquidsoap-prettier [options] --stdin-filepath <name>

Format Liquidsoap (.liq) files.

Arguments:
  <file>                   One or more files or glob patterns to format.

Options:
  -w, --write              Write formatted output back to each file in place.
  -c, --check              Check if files are already formatted (exit 2 if not).
      --print-width        Maximum line width (default: 80).
      --stdin-filepath     Read from stdin; use <name> in error messages.
      --dump-ast           Parse and dump the AST as JSON (for debugging).
  -v, --version            Print the version and exit.
  -h, --help               Show this help message and exit.

Examples:
  liquidsoap-prettier script.liq               # print formatted output to stdout
  liquidsoap-prettier -w script.liq            # format file in place
  liquidsoap-prettier -w '**/*.liq'            # format all .liq files in place
  liquidsoap-prettier -c '**/*.liq'            # check formatting of all .liq files
  liquidsoap-prettier -c script.liq            # check formatting (CI mode)
  cat script.liq | liquidsoap-prettier --stdin-filepath script.liq
  liquidsoap-prettier --dump-ast script.liq    # dump parsed AST as JSON
`;

const readStdin = () =>
  new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });

const run = async () => {
  try {
    const {
      _: patterns,
      write,
      w,
      check,
      c,
      version: showVersion,
      v,
      help,
      h,
      "print-width": printWidth = 80,
      "stdin-filepath": stdinFilepath,
      "dump-ast": dumpAst,
    } = parseArgs(process.argv.slice(2), {
      boolean: ["w", "write", "c", "check", "v", "version", "h", "help", "dump-ast"],
      string: ["stdin-filepath"],
      number: ["print-width"],
    });

    if (help || h) {
      process.stdout.write(HELP);
      process.exit(0);
    }

    if (showVersion || v) {
      console.log(version);
      process.exit(0);
    }

    if (stdinFilepath) {
      if (write || w) {
        console.error("--write cannot be used with --stdin-filepath");
        process.exit(1);
      }
      const code = await readStdin();
      try {
        if (dumpAst) {
          const ast = prettierPluginLiquidsoap.parsers.liquidsoap.parse(code);
          process.stdout.write(JSON.stringify(ast, null, 2) + "\n");
        } else if (check || c) {
          const isFormatted = await prettier.check(code, {
            parser: "liquidsoap",
            plugins: [prettierPluginLiquidsoap],
            printWidth,
          });
          process.exit(isFormatted ? 0 : 2);
        } else {
          const formattedCode = await prettier.format(code, {
            parser: "liquidsoap",
            plugins: [prettierPluginLiquidsoap],
            printWidth,
          });
          process.stdout.write(formattedCode);
        }
      } catch (err) {
        console.error(`Error while processing ${stdinFilepath}: ${err}`);
        process.exit(1);
      }
      process.exit(0);
    }

    if (patterns.length === 0) {
      console.error("No filename passed!");
      process.exit(1);
    }

    const files = (
      await BluebirdPromise.map(patterns, (pattern) => glob(pattern))
    ).flat();

    if (files.length > 1 && !w && !write && !dumpAst && !c && !check) {
      console.error(
        "-w|--write or -c|--check must be used when passing more than one file!",
      );
      process.exit(1);
    }

    if (files.length === 0) {
      console.error("No file found matching the given pattern(s)!");
      process.exit(1);
    }

    let exitCode = 0;

    await BluebirdPromise.each(files, async (file) => {
      if (!fs.existsSync(file)) {
        console.error(`File ${file} does not exist!`);
        exitCode = 1;
      }

      const code = "" + fs.readFileSync(file);

      try {
        if (dumpAst) {
          const ast = prettierPluginLiquidsoap.parsers.liquidsoap.parse(code);
          process.stdout.write(JSON.stringify(ast, null, 2) + "\n");
        } else if (check || c) {
          const isFormatted = await prettier.check(code, {
            parser: "liquidsoap",
            plugins: [prettierPluginLiquidsoap],
            printWidth,
          });
          exitCode = isFormatted ? 0 : 2;
        } else {
          const formattedCode = await prettier.format(code, {
            parser: "liquidsoap",
            plugins: [prettierPluginLiquidsoap],
            printWidth,
          });

          if (write || w) {
            console.log(`Writing formatted ${file}`);
            fs.writeFileSync(file, formattedCode);
          } else {
            process.stdout.write(formattedCode);
          }
        }
      } catch (err) {
        console.error(`Error while processing file ${file}: ${err}`);
        exitCode = 1;
      }
    });

    process.exit(exitCode);
  } catch (err) {
    console.error(`Error while running liquidsoap-prettier: ${err}`);
    process.exit(1);
  }
};

run();
