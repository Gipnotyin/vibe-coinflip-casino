import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const contractsRoot = resolve(__dirname, "..");
const repoRoot = resolve(contractsRoot, "../..");

const artifactPath = resolve(contractsRoot, "out/CoinFlipCasino.sol/CoinFlipCasino.json");
const outputPath = resolve(repoRoot, "apps/web/lib/contracts/CoinFlipCasino.json");

const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

if (!Array.isArray(artifact.abi)) {
  throw new Error(`No ABI array found in ${artifactPath}`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ abi: artifact.abi }, null, 2)}\n`);

console.log(`Exported CoinFlipCasino ABI to ${outputPath}`);
