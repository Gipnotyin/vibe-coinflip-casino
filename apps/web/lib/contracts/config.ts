import coinFlipCasinoArtifact from "./CoinFlipCasino.json";
import { isAddress, type Abi, type Address } from "viem";

export const sepoliaChainId = 11155111;
export const sepoliaExplorerBaseUrl = "https://sepolia.etherscan.io";

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
  chainId: sepoliaChainId,
  address: coinFlipCasinoAddress,
  abi: coinFlipCasinoAbi,
  explorerBaseUrl: sepoliaExplorerBaseUrl,
} as const;
