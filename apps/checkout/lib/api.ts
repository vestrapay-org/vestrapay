import type {
  ApiResponse,
  ChargeCardData,
  ChargeCardRequest,
  ChargeBankTransferData,
  ChargeBankTransferRequest,
  ThreeDsCompleteData,
  ThreeDsCompleteRequest,
  VerifyTransactionData,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY!;

async function apiFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<T> {
  const method = options?.method ?? "POST";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "x-correlation-id": crypto.randomUUID(),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    ...(options?.body != null ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function chargeCard(req: ChargeCardRequest): Promise<ApiResponse<ChargeCardData>> {
  return apiFetch<ApiResponse<ChargeCardData>>("/api/v1/public/payment/charge/card", {
    body: req,
  });
}

export async function complete3ds(
  req: ThreeDsCompleteRequest,
): Promise<ApiResponse<ThreeDsCompleteData>> {
  return apiFetch<ApiResponse<ThreeDsCompleteData>>(
    "/api/v1/public/payment/charge/card/3ds-complete",
    { body: req },
  );
}

export async function chargeBankTransfer(
  req: ChargeBankTransferRequest,
): Promise<ApiResponse<ChargeBankTransferData>> {
  return apiFetch<ApiResponse<ChargeBankTransferData>>(
    "/api/v1/public/payment/charge/bank-transfer",
    { body: req },
  );
}

export async function verifyTransaction(
  reference: string,
): Promise<ApiResponse<VerifyTransactionData>> {
  return apiFetch<ApiResponse<VerifyTransactionData>>(
    `/api/v1/public/payment/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
}
