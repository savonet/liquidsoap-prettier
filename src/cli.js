#!/usr/bin/env node

import parseArgs from "minimist";
import prettier from "prettier";
import fs from "node:fs";
import { glob } from "glob";
import BluebirdPromise from "bluebird";
import * as prettierPluginLiquidsoap from "./index.js";

const run = async () => {
  try {
    const {
      _: [filename],
      write,
      w,
      check,
      c,
    } = parseArgs(process.argv.slice(2), {
      boolean: ["w", "write", "c", "check"],
    });

    if (!filename) {
      console.error("No filename passed!");
      process.exit(1);
    }

    const files = await glob(filename);

    if (files.length > 1 && !w && !write) {
      console.error(
        "-w|--write must be used when formatting more than one file at a time!",
      );
      process.exit(1);
    }

    if (files.length === 0) {
      console.error("No file passed!");
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
        if (check || c) {
          const isFormatted = await prettier.check(code, {
            parser: "liquidsoap",
            plugins: [prettierPluginLiquidsoap],
          });
          exitCode = isFormatted ? 0 : 2;
        } else {
          const formattedCode = await prettier.format(code, {
            parser: "liquidsoap",
            plugins: [prettierPluginLiquidsoap],
          });

          if (write || w) {
            console.log(`Writting formatted ${file}`);
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
