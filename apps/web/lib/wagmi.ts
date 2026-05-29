import { QueryClient } from "@tanstack/react-query";
import { http, createConfig, injected, type CreateConnectorFn } from "wagmi";
import { sepolia } from "wagmi/chains";

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL?.trim();

const connectors: CreateConnectorFn[] = [injected({ shimDisconnect: true })];

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors,
  ssr: true,
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl || undefined),
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
