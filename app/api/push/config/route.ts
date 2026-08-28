import { env } from "cloudflare:workers";

export const runtime = "edge";

type PushEnvironment = {
  VAPID_SERVER_PUBLIC_KEY?: string;
};

export async function GET() {
  const pushEnv =
    env as unknown as PushEnvironment;

  const publicKey =
    pushEnv.VAPID_SERVER_PUBLIC_KEY?.trim();

  if (!publicKey) {
    return Response.json(
      {
        error:
          "当前环境尚未配置 Push 公钥",
      },
      { status: 503 },
    );
  }

  return Response.json({
    publicKey,
  });
}
