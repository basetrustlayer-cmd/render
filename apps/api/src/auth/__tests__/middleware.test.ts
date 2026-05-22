import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const sessionFindUniqueMock = vi.fn();
const writeAuditLogMock = vi.fn();
const verifyAccessTokenMock = vi.fn();

vi.mock("../../database/client.js", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock
    },
    authSession: {
      findUnique: sessionFindUniqueMock
    }
  }
}));

vi.mock("../../audit/log.js", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("../jwt.js", () => ({
  verifyAccessToken: verifyAccessTokenMock
}));

const { authenticate, requireRole } = await import("../middleware.js");

function replyMock() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    code: vi.fn(function (this: any, statusCode: number) {
      this.statusCode = statusCode;
      return this;
    }),
    send: vi.fn(function (this: any, payload: unknown) {
      this.payload = payload;
      return this;
    })
  };
}

function requestMock(input: {
  method?: string;
  authorization?: string;
  csrf?: string;
}) {
  return {
    method: input.method ?? "GET",
    headers: {
      authorization: input.authorization,
      "x-render-csrf": input.csrf
    }
  } as any;
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    verificationLevel: 1,
    isBusiness: false,
    isSuspended: false,
    jti: "session-jti",
    ...overrides
  };
}

function csrfHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

describe("auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userFindUniqueMock.mockReset();
    sessionFindUniqueMock.mockReset();
    verifyAccessTokenMock.mockReset();
  });

  it("rejects requests without bearer tokens", async () => {
    const request = requestMock({});
    const reply = replyMock();

    await authenticate(request, reply as any);

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({ error: "Missing bearer token." });
    expect(writeAuditLogMock).toHaveBeenCalledWith({
      request,
      action: "AUTH_MISSING_BEARER_TOKEN"
    });
  });

  it("rejects suspended token payloads before database lookup", async () => {
    const request = requestMock({ authorization: "Bearer token" });
    const reply = replyMock();

    verifyAccessTokenMock.mockReturnValueOnce(validPayload({ isSuspended: true }));

    await authenticate(request, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({ error: "User account is suspended." });
    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(sessionFindUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects invalid sessions", async () => {
    const request = requestMock({ authorization: "Bearer token" });
    const reply = replyMock();

    verifyAccessTokenMock.mockReturnValueOnce(validPayload());
    userFindUniqueMock.mockResolvedValueOnce({ id: validPayload().userId, isSuspended: false });
    sessionFindUniqueMock.mockResolvedValueOnce(null);

    await authenticate(request, reply as any);

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({ error: "Session is no longer valid." });
  });

  it("rejects protected methods without csrf token", async () => {
    const request = requestMock({
      method: "POST",
      authorization: "Bearer token"
    });
    const reply = replyMock();

    verifyAccessTokenMock.mockReturnValueOnce(validPayload());
    userFindUniqueMock.mockResolvedValueOnce({ id: validPayload().userId, isSuspended: false });
    sessionFindUniqueMock.mockResolvedValueOnce({
      id: "session-1",
      userId: validPayload().userId,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      csrfTokenHash: csrfHash("expected-csrf")
    });

    await authenticate(request, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({ error: "Missing CSRF token." });
  });

  it("rejects protected methods with invalid csrf token", async () => {
    const request = requestMock({
      method: "POST",
      authorization: "Bearer token",
      csrf: "wrong-csrf"
    });
    const reply = replyMock();

    verifyAccessTokenMock.mockReturnValueOnce(validPayload());
    userFindUniqueMock.mockResolvedValueOnce({ id: validPayload().userId, isSuspended: false });
    sessionFindUniqueMock.mockResolvedValueOnce({
      id: "session-1",
      userId: validPayload().userId,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      csrfTokenHash: csrfHash("expected-csrf")
    });

    await authenticate(request, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({ error: "Invalid CSRF token." });
  });

  it("attaches auth user for valid sessions and csrf token", async () => {
    const payload = validPayload();
    const request = requestMock({
      method: "POST",
      authorization: "Bearer token",
      csrf: "expected-csrf"
    });
    const reply = replyMock();

    verifyAccessTokenMock.mockReturnValueOnce(payload);
    userFindUniqueMock.mockResolvedValueOnce({ id: payload.userId, isSuspended: false });
    sessionFindUniqueMock.mockResolvedValueOnce({
      id: "session-1",
      userId: payload.userId,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      csrfTokenHash: csrfHash("expected-csrf")
    });

    await authenticate(request, reply as any);

    expect(reply.send).not.toHaveBeenCalled();
    expect(request.authUser).toEqual(payload);
  });

  it("enforces role rank boundaries", async () => {
    const request = {
      authUser: validPayload()
    } as any;
    const reply = replyMock();

    userFindUniqueMock.mockResolvedValueOnce({
      id: validPayload().userId,
      role: "USER",
      isSuspended: false
    });

    await requireRole("ADMIN")(request, reply as any);

    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({ error: "Insufficient permissions." });
  });

  it("allows higher ranked roles to satisfy lower ranked requirements", async () => {
    const request = {
      authUser: validPayload()
    } as any;
    const reply = replyMock();

    userFindUniqueMock.mockResolvedValueOnce({
      id: validPayload().userId,
      role: "SUPER_ADMIN",
      isSuspended: false
    });

    await requireRole("ADMIN")(request, reply as any);

    expect(reply.send).not.toHaveBeenCalled();
  });
});
