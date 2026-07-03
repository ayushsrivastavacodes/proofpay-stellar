import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const circuitDir = path.resolve("noir/payroll_batch");
const targetDir = path.join(circuitDir, "target");
const artifactDir = path.resolve("artifacts/noir/payroll_batch");
const witnessToolDir = path.resolve("tools/noir-witness");

function run(cmd, args, cwd = circuitDir) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env },
  });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with status ${result.status}`);
  }
}

run("cargo", ["run", "--quiet"], witnessToolDir);
run("nargo", ["check"]);
run("nargo", ["execute"]);

const jsonPath = path.join(targetDir, "payroll_batch.json");
const witnessPath = path.join(targetDir, "payroll_batch.gz");

run(
  "bb",
  [
    "prove",
    "-b",
    jsonPath,
    "-w",
    witnessPath,
    "-o",
    targetDir,
    "--scheme",
    "ultra_honk",
    "--oracle_hash",
    "keccak",
    "--output_format",
    "bytes_and_fields",
  ],
  process.cwd()
);

run(
  "bb",
  [
    "write_vk",
    "-b",
    jsonPath,
    "-o",
    targetDir,
    "--scheme",
    "ultra_honk",
    "--oracle_hash",
    "keccak",
    "--output_format",
    "bytes_and_fields",
  ],
  process.cwd()
);

const nestedVk = path.join(targetDir, "vk", "vk");
const flatVk = path.join(targetDir, "vk");
if (fs.existsSync(nestedVk)) {
  const tmp = path.join(targetDir, "vk.tmp");
  fs.renameSync(nestedVk, tmp);
  fs.rmdirSync(flatVk);
  fs.renameSync(tmp, flatVk);
}

run(
  "bb",
  [
    "verify",
    "-k",
    path.join(targetDir, "vk"),
    "-p",
    path.join(targetDir, "proof"),
    "-i",
    path.join(targetDir, "public_inputs"),
    "--scheme",
    "ultra_honk",
    "--oracle_hash",
    "keccak",
  ],
  process.cwd()
);

for (const file of ["proof", "public_inputs", "vk"]) {
  const full = path.join(targetDir, file);
  const stat = fs.statSync(full);
  console.log(`${file}: ${stat.size} bytes`);
}

fs.rmSync(artifactDir, { recursive: true, force: true });
fs.mkdirSync(artifactDir, { recursive: true });

for (const file of [
  "proof",
  "proof_fields.json",
  "public_inputs",
  "public_inputs_fields.json",
  "vk",
  "vk_fields.json",
]) {
  fs.copyFileSync(path.join(targetDir, file), path.join(artifactDir, file));
}

console.log(`artifacts exported to ${path.relative(process.cwd(), artifactDir)}`);
