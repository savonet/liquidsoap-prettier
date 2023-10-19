#!/usr/bin/env node

import parseArgs from "minimist";
import prettier from "prettier";
import fs from "node:fs";
import * as prettierPluginLiquidsoap from "./index.js";

const {
  _: [filename],
  write,
  w,
} = parseArgs(process.argv.slice(2), { boolean: ["w", "write"] });

if (!filename) {
  console.error("No filename passed!");
  process.exit(1);
}

if (!fs.existsSync(filename)) {
  console.error(`File ${filename} does not exist!`);
  process.exit(1);
}

const code = "" + fs.readFileSync(filename);

prettier
  .format(code, {
    parser: "liquidsoap",
    plugins: [prettierPluginLiquidsoap],
  })
  .then((formattedCode) => {
    if (write || w) {
      console.log(`Writting formatted ${filename}`);
      fs.writeFileSync(filename, formattedCode);
    } else {
      process.stdout.write(formattedCode);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error(`Error while processing file ${filename}: ${err}`);
    process.exit(1);
  });
