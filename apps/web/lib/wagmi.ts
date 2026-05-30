import { QueryClient } from "@tanstack/react-query";
import { defineChain } from "viem";
import { http, createConfig, injected, type CreateConnectorFn } from "wagmi";
import { sepolia } from "wagmi/chains";
import { isLocalAnvilEnabled, localAnvilChainId, localAnvilRpcUrl, targetRpcUrl } from "@/lib/contracts/config";

export const localAnvil = defineChain({
  id: localAnvilChainId,
  name: "Local Anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Anvil ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [localAnvilRpcUrl],
    },
  },
});

const connectors: CreateConnectorFn[] = [injected({ shimDisconnect: true })];

export const wagmiConfig = isLocalAnvilEnabled
  ? createConfig({
      chains: [localAnvil, sepolia],
      connectors,
      ssr: true,
      transports: {
        [localAnvil.id]: http(localAnvilRpcUrl),
        [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim() || undefined),
      },
    })
  : createConfig({
      chains: [sepolia],
      connectors,
      ssr: true,
      transports: {
        [sepolia.id]: http(targetRpcUrl || undefined),
      },
    });

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });
}
