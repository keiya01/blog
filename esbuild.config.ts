import { build, BuildOptions } from "esbuild";
import { vanillaExtractPlugin } from "@vanilla-extract/esbuild-plugin";
import { copy } from "cpx";

import { getEntryPathname } from "./build/esbuild/path";
import { generateManifest } from "./build/esbuild/manifest";

const outputRoot = "./dist";

const isProduction = process.env.NODE_ENV === "production";
const shouldWatch = process.env.ESBUILD_SHOULD_WATCH === "true";

const promiseAllFlat = async <T extends unknown>(
  promises: Promise<T[]>[]
): Promise<T[]> => await Promise.all(promises).then((res) => res.flat());

const run = async () => {
  const libOptions: BuildOptions = {
    format: "esm",
    entryPoints: await promiseAllFlat([
      getEntryPathname("./src/lib/pages"),
      getEntryPathname("./src/lib/features"),
    ]),
    entryNames: isProduction ? "[name].[hash]" : undefined,
    outdir: `${outputRoot}/site/lib`,
    metafile: true,
    minify: true,
    bundle: true,
    watch: shouldWatch,
  };
  const { metafile: metafileForLib } = await build(libOptions);

  const layoutOptions: BuildOptions = {
    format: "cjs",
    entryPoints: await promiseAllFlat([
      getEntryPathname("./src/layouts/pages"),
      getEntryPathname("./src/layouts/partials"),
    ]),
    entryNames: isProduction ? "[name].[hash].11ty" : "[name].11ty",
    outdir: `${outputRoot}/layouts`,
    platform: "node",
    metafile: true,
    minify: true,
    bundle: true,
    watch: shouldWatch,
    plugins: [vanillaExtractPlugin()],
  };
  const { metafile: metafileForLayout } = await build(layoutOptions);

  await generateManifest({ outputRoot }, metafileForLayout, metafileForLib);

  // copy extracted css to serve css from `site` directory
  copy("./dist/layouts/*.css", "./dist/site/layouts");
};

run();
