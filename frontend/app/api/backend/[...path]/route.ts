import { type NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function proxyToBackend(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const upstreamPath = `/${path.join("/")}`;
  const url = new URL(request.url);
  const qs = url.search; // preserve query string

  const headers = new Headers();
  // Forward content-type and authorization from the client request
  const ct = request.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);
  const authHeader = request.headers.get("Authorization");
  if (authHeader) headers.set("Authorization", authHeader);

  // Forward cookies (session cookie) to the backend
  const cookie = request.headers.get("Cookie");
  if (cookie) headers.set("Cookie", cookie);

  const body = request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}${upstreamPath}${qs}`, {
      method: request.method,
      headers,
      body,
    });
  } catch {
    return NextResponse.json(
      { detail: "Backend service is unavailable. Please try again shortly." },
      { status: 502 },
    );
  }

  const responseBody = await upstream.text();
  const response = new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });

  // Forward Set-Cookie headers so session cookies land on the frontend origin
  const setCookies = upstream.headers.getSetCookie();
  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }

  return response;
}

export { proxyToBackend as DELETE, proxyToBackend as GET, proxyToBackend as PATCH, proxyToBackend as POST, proxyToBackend as PUT };
