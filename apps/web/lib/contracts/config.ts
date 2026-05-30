import coinFlipCasinoArtifact from "./CoinFlipCasino.json";
import { isAddress, type Abi, type Address } from "viem";

export const sepoliaChainId = 11155111;
export const localAnvilChainId = 31337;
export const sepoliaExplorerBaseUrl = "https://sepolia.etherscan.io";
export const localAnvilRpcUrl = "http://127.0.0.1:8545";
export const isLocalAnvilEnabled = process.env.NEXT_PUBLIC_ENABLE_LOCAL_ANVIL === "true";
export const targetChainId = isLocalAnvilEnabled ? localAnvilChainId : sepoliaChainId;
export const targetChainName = isLocalAnvilEnabled ? "Local Anvil" : "Sepolia";
export const targetRpcUrl = isLocalAnvilEnabled
  ? localAnvilRpcUrl
  : process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim();
export const targetExplorerBaseUrl = isLocalAnvilEnabled ? undefined : sepoliaExplorerBaseUrl;

export const configuredCoinFlipCasinoAddress =
  process.env.NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS?.trim() ?? "";

export const coinFlipCasinoAddress = isAddress(configuredCoinFlipCasinoAddress)
  ? (configuredCoinFlipCasinoAddress as Address)
  : undefined;

export const coinFlipCasinoAddressStatus = configuredCoinFlipCasinoAddress
  ? coinFlipCasinoAddress
    ? "valid"
    : "invalid"
  : "missing";

export const coinFlipCasinoAbi = coinFlipCasinoArtifact.abi as Abi;

export const coinFlipCasinoConfig = {
  chainId: targetChainId,
  address: coinFlipCasinoAddress,
  abi: coinFlipCasinoAbi,
  explorerBaseUrl: targetExplorerBaseUrl,
} as const;
