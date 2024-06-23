#!/usr/bin/env node

import { Downloader } from "nodejs-file-downloader";
import { exec } from "node:child_process";
import { finished } from "node:stream/promises";
import path from "node:path";
import fs from "node:fs";
import tmp from "tmp";
import gunzip from "gunzip-maybe";
import tar from "tar-fs";

tmp.setGracefulCleanup();

const archive = "archive.tgz";

const liqFile = "dist/liquidsoap.cjs";

const destFile = path.resolve(path.dirname(process.argv[1]), "..", liqFile);

if (fs.existsSync(destFile)) {
  console.log("Liquidsoap parser file present!");
  process.exit();
}

exec("npm view liquidsoap-prettier dist.tarball", async (_, stdout) => {
  console.log("Downloading liquidsoap parser file..");

  const { name: tmpdir } = tmp.dirSync();

  const downloader = new Downloader({
    url: stdout.trim(),
    directory: tmpdir,
    fileName: archive,
    cloneFiles: false,
  });

  await downloader.download();

  await finished(
    fs
      .createReadStream(path.join(tmpdir, archive))
      .pipe(gunzip())
      .pipe(tar.extract(tmpdir)),
  );
  await fs.promises.rename(path.join(tmpdir, "package", liqFile), destFile);
});
