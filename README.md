# Crypto Casino

Verifiable coin-flip casino skeleton for the Sepolia testnet. Phase 1 contains only repository infrastructure: a Next.js frontend workspace, a Foundry contracts workspace, shared configuration, and project documentation.

No Solidity contract implementation or frontend casino logic is included yet.

## Placeholders

- Live URL (testnet dApp): TBD
- Contract address (Sepolia): TBD

## Roadmap

1. Phase 1: Repository skeleton and tooling configuration.
2. Phase 2: Verifiable coin-flip Solidity contract with Chainlink VRF.
3. Phase 3: Deployment scripts and Sepolia verification.
4. Phase 4: Next.js wallet connection and game UI.
5. Phase 5: End-to-end testnet validation and public testnet release.

## Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
```

## Frontend Local Run

Install workspace dependencies:

```bash
pnpm install
```

Copy `.env.example` to `.env` and set frontend values as needed:

```bash
NEXT_PUBLIC_SEPOLIA_RPC_URL=
NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

`NEXT_PUBLIC_COIN_FLIP_CASINO_ADDRESS` can stay empty before a Sepolia
deployment exists. The web app will show a contract-address-missing state and
will not attempt contract reads.

Run the web app locally:

```bash
pnpm --filter @crypto-casino/web dev
```

## Repository Structure

```text
crypto-casino/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── .eslintrc.json
│       ├── next-env.d.ts
│       ├── next.config.mjs
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       └── tsconfig.json
├── packages/
│   └── contracts/
│       ├── lib/
│       │   └── .gitkeep
│       ├── script/
│       │   └── .gitkeep
│       ├── src/
│       │   └── .gitkeep
│       ├── test/
│       │   └── .gitkeep
│       ├── foundry.toml
│       └── package.json
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Files and Directories

### Root

- `apps/`: Application workspaces.
- `packages/`: Shared package workspaces.
- `README.md`: Project overview, placeholders, roadmap, commands, and repository structure.
- `CHANGELOG.md`: Empty changelog placeholder for future release notes.
- `.env.example`: Example Sepolia, Chainlink VRF, block explorer, and frontend environment variables.
- `.gitignore`: Ignore rules for Node.js, pnpm, Next.js, Foundry, local env files, and editor/OS artifacts.
- `package.json`: Private monorepo manifest with top-level `dev`, `build`, `test`, and `lint` scripts.
- `pnpm-workspace.yaml`: pnpm workspace definition for `apps/*` and `packages/*`.

### `apps/web`

- `apps/web/`: Frontend workspace for the Next.js dApp.
- `apps/web/package.json`: Next.js workspace package manifest and frontend scripts.
- `apps/web/.eslintrc.json`: ESLint preset configuration for Next.js.
- `apps/web/app/`: Next.js App Router directory.
- `apps/web/app/layout.tsx`: Root layout for the App Router.
- `apps/web/app/page.tsx`: Empty home page placeholder.
- `apps/web/app/globals.css`: Tailwind CSS entry file and base global styles.
- `apps/web/tsconfig.json`: TypeScript configuration for the Next.js app.
- `apps/web/next-env.d.ts`: Next.js TypeScript environment references.
- `apps/web/tailwind.config.js`: Tailwind content and theme configuration.
- `apps/web/postcss.config.js`: PostCSS configuration for Tailwind.
- `apps/web/next.config.mjs`: Minimal Next.js configuration.

### `packages/contracts`

- `packages/contracts/`: Foundry workspace for Solidity contracts and deployment scripts.
- `packages/contracts/package.json`: Foundry workspace package manifest and contract scripts.
- `packages/contracts/foundry.toml`: Foundry configuration for sources, tests, scripts, build output, cache, and Sepolia RPC placeholder.
- `packages/contracts/src/`: Solidity source directory, intentionally empty for Phase 1.
- `packages/contracts/src/.gitkeep`: Tracks the empty source directory.
- `packages/contracts/test/`: Foundry test directory, intentionally empty for Phase 1.
- `packages/contracts/test/.gitkeep`: Tracks the empty test directory.
- `packages/contracts/script/`: Foundry script directory, intentionally empty for Phase 1.
- `packages/contracts/script/.gitkeep`: Tracks the empty script directory.
- `packages/contracts/lib/`: Foundry dependency directory placeholder.
- `packages/contracts/lib/.gitkeep`: Tracks the empty dependency placeholder directory.
