#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = join(process.cwd(), "apps/web/src");

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (extname(full) === ".ts" || extname(full) === ".tsx") {
      files.push(full);
    }
  }
  return files;
}

function replaceImports(content: string, filePath: string): string {
  // Calculate relative path from file to apps/web/src
  const relToSrc = relative(ROOT, filePath).split("/").length - 1;
  const prefix = "../".repeat(relToSrc + 1);

  let result = content;

  // Replace composicion imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}composicion"`, "g"),
    `from "@/composicion"`
  );

  // Replace http imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}http/`, "g"),
    `from "@/http/`
  );

  // Replace auth imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}auth/`, "g"),
    `from "@/auth/`
  );

  // Replace vistas imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}vistas/`, "g"),
    `from "@/vistas/`
  );

  // Replace portada imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}portada/`, "g"),
    `from "@/portada/`
  );

  // Replace calendario imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}calendario/`, "g"),
    `from "@/calendario/`
  );

  // Replace tiempo-real imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}tiempo-real/`, "g"),
    `from "@/tiempo-real/`
  );

  // Replace publico imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}publico/`, "g"),
    `from "@/publico/`
  );

  // Replace components imports
  result = result.replace(
    new RegExp(`from\\s+"${prefix}components/`, "g"),
    `from "@/components/`
  );

  return result;
}

const files = walk(ROOT);
let changed = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const newContent = replaceImports(content, file);
  if (newContent !== content) {
    writeFileSync(file, newContent, "utf8");
    changed++;
    console.log(`Actualizado: ${relative(ROOT, file)}`);
  }
}

console.log(`\nTotal archivos modificados: ${changed}`);