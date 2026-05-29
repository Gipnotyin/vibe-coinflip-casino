import coinFlipCasinoArtifact from "./CoinFlipCasino.json";

export const sepoliaChainId = 11155111;
export const sepoliaExplorerBaseUrl = "https://sepolia.etherscan.io";

export const coinFlipCasinoAddress = process.env.NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS;
export const coinFlipCasinoAbi = coinFlipCasinoArtifact.abi;

export const coinFlipCasinoConfig = {
  chainId: sepoliaChainId,
  address: coinFlipCasinoAddress,
  abi: coinFlipCasinoAbi,
  explorerBaseUrl: sepoliaExplorerBaseUrl,
} as const;
