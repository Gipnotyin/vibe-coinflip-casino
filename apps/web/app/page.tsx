import { CasinoStatus } from "@/components/CasinoStatus";
import { CoinFlipCard } from "@/components/CoinFlipCard";
import { DepositCard } from "@/components/DepositCard";
import { NetworkGuard } from "@/components/NetworkGuard";
import { PendingBetCard } from "@/components/PendingBetCard";
import { WalletConnect } from "@/components/WalletConnect";
import { WithdrawCard } from "@/components/WithdrawCard";
import { isLocalAnvilEnabled, targetChainName } from "@/lib/contracts/config";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-2 border-b border-slate-800 pb-5">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">{targetChainName} MVP</p>
          <h1 className="text-3xl font-semibold text-white">CoinFlip Casino Console</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            Wallet connection, contract status, and casino actions for the {targetChainName} deployment.
          </p>
        </header>

        {isLocalAnvilEnabled ? (
          <section className="rounded-lg border border-sky-400/40 bg-sky-950/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-sky-200">Local Anvil mode</p>
            <p className="mt-2 text-sm text-sky-100">
              The app is configured for chain ID 31337 and local mock VRF testing. Do not use this mode for Sepolia
              verification.
            </p>
          </section>
        ) : null}

        <WalletConnect />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
          <NetworkGuard />
          <CasinoStatus />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <DepositCard />
          <WithdrawCard />
          <CoinFlipCard />
        </div>

        <PendingBetCard />
      </div>
    </main>
  );
}
