import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthUserMock = vi.fn();
const getRequestedOrganizationIdMock = vi.fn();
const requireActiveOrganizationMembershipMock = vi.fn();

vi.mock("../../auth/middleware.js", () => ({
  requireAuthUser: requireAuthUserMock
}));

vi.mock("../../organizations/context.js", () => ({
  getRequestedOrganizationId: getRequestedOrganizationIdMock,
  requireActiveOrganizationMembership: requireActiveOrganizationMembershipMock
}));

const { requireAdminOrganizationScope } = await import("../scope.js");

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

describe("admin organization scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthUserMock.mockReturnValue({
      userId: "00000000-0000-0000-0000-000000000001"
    });
  });

  it("allows platform-scope admin access when no organization header is present", async () => {
    getRequestedOrganizationIdMock.mockReturnValueOnce(undefined);
    const reply = replyMock();

    const scope = await requireAdminOrganizationScope({} as any, reply as any);

    expect(scope).toEqual({
      authUser: {
        userId: "00000000-0000-0000-0000-000000000001"
      },
      organizationId: null
    });
    expect(requireActiveOrganizationMembershipMock).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("allows organization admin access for OWNER membership", async () => {
    getRequestedOrganizationIdMock.mockReturnValueOnce("00000000-0000-0000-0000-000000000010");
    requireActiveOrganizationMembershipMock.mockResolvedValueOnce({
      role: "OWNER"
    });
    const reply = replyMock();

    const scope = await requireAdminOrganizationScope({} as any, reply as any);

    expect(scope?.organizationId).toBe("00000000-0000-0000-0000-000000000010");
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("allows organization admin access for ADMIN membership", async () => {
    getRequestedOrganizationIdMock.mockReturnValueOnce("00000000-0000-0000-0000-000000000010");
    requireActiveOrganizationMembershipMock.mockResolvedValueOnce({
      role: "ADMIN"
    });
    const reply = replyMock();

    const scope = await requireAdminOrganizationScope({} as any, reply as any);

    expect(scope?.organizationId).toBe("00000000-0000-0000-0000-000000000010");
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("rejects organization admin access for MEMBER membership", async () => {
    getRequestedOrganizationIdMock.mockReturnValueOnce("00000000-0000-0000-0000-000000000010");
    requireActiveOrganizationMembershipMock.mockResolvedValueOnce({
      role: "MEMBER"
    });
    const reply = replyMock();

    const scope = await requireAdminOrganizationScope({} as any, reply as any);

    expect(scope).toBeNull();
    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({ error: "Invalid organization admin context." });
  });

  it("rejects organization admin access when membership is missing", async () => {
    getRequestedOrganizationIdMock.mockReturnValueOnce("00000000-0000-0000-0000-000000000010");
    requireActiveOrganizationMembershipMock.mockResolvedValueOnce(null);
    const reply = replyMock();

    const scope = await requireAdminOrganizationScope({} as any, reply as any);

    expect(scope).toBeNull();
    expect(reply.statusCode).toBe(403);
    expect(reply.payload).toEqual({ error: "Invalid organization admin context." });
  });
});
