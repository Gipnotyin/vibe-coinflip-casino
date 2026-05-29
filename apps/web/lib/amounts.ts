import { BaseError, formatEther, parseEther } from "viem";

const ETH_AMOUNT_PATTERN = /^\d+(\.\d{0,18})?$/;

export type AmountValidation = {
  wei?: bigint;
  error?: string;
};

export function validateEthAmount(
  value: string,
  options: {
    maxWei?: bigint;
    maxLabel?: string;
  } = {},
): AmountValidation {
  const trimmedValue = value.trim();

  if (!trimmedValue) return { error: "Enter an ETH amount." };
  if (!ETH_AMOUNT_PATTERN.test(trimmedValue)) {
    return { error: "Use a positive ETH amount with up to 18 decimals." };
  }

  const wei = parseEther(trimmedValue);
  if (wei === BigInt(0)) return { error: "Amount must be greater than zero." };

  if (options.maxWei !== undefined && wei > options.maxWei) {
    return { error: `Amount exceeds ${options.maxLabel ?? "available balance"}.` };
  }

  return { wei };
}

export function formatEth(value?: bigint) {
  if (value === undefined) return "Not available";

  const formatted = formatEther(value);
  const numericValue = Number(formatted);
  if (!Number.isFinite(numericValue)) return `${formatted} ETH`;

  return `${numericValue.toLocaleString("en-US", {
    maximumFractionDigits: 6,
  })} ETH`;
}

export function calculatePayoutWei(amount: bigint) {
  return (amount * BigInt(190)) / BigInt(100);
}

export function getFriendlyError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof BaseError) return error.shortMessage || error.message;
  if (error instanceof Error) return error.message;

  return "Transaction failed.";
}
