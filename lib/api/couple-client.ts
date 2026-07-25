export async function requestCoupleData<TData>(
  code: string,
  body?: Record<string, unknown>,
): Promise<TData> {
  const response = await fetch("/api/couple", {
    method: body ? "POST" : "GET",
    headers: {
      "content-type": "application/json",
      "x-couple-code": code.trim(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : "请求失败";

    throw new Error(message);
  }

  return payload as TData;
}
