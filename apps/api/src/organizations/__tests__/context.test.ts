import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();

vi.mock("../../database/client.js", () => ({
  prisma: {
    organizationMember: {
      findFirst: findFirstMock
    }
  }
}));

const {
  getRequestedOrganizationId,
  requireActiveOrganizationMembership,
  resolveOptionalOrganizationContext,
  requireListingOrganizationAccess
} = await import("../context.js");

function requestWithOrgHeader(value?: string | string[]) {
  return {
    headers: {
      "x-render-organization-id": value
    }
  } as any;
}

describe("organization context", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns undefined when organization header is missing", () => {
    expect(getRequestedOrganizationId(requestWithOrgHeader())).toBeUndefined();
  });

  it("rejects malformed organization header values", () => {
    expect(getRequestedOrganizationId(requestWithOrgHeader("not-a-uuid"))).toBeUndefined();
  });

  it("accepts valid organization UUID header values", () => {
    expect(
      getRequestedOrganizationId(
        requestWithOrgHeader("00000000-0000-0000-0000-000000000001")
      )
    ).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("requires active organization membership", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "membership-1" });

    const membership = await requireActiveOrganizationMembership({
      userId: "00000000-0000-0000-0000-000000000010",
      organizationId: "00000000-0000-0000-0000-000000000001"
    });

    expect(membership).toEqual({ id: "membership-1" });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        userId: "00000000-0000-0000-0000-000000000010",
        organizationId: "00000000-0000-0000-0000-000000000001",
        organization: {
          status: "ACTIVE"
        }
      },
      include: {
        organization: true
      }
    });
  });

  it("returns null when optional organization context is absent", async () => {
    const membership = await resolveOptionalOrganizationContext({
      request: requestWithOrgHeader(),
      userId: "00000000-0000-0000-0000-000000000010"
    });

    expect(membership).toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("denies listing organization access when requested context does not match listing organization", async () => {
    const allowed = await requireListingOrganizationAccess({
      request: requestWithOrgHeader("00000000-0000-0000-0000-000000000002"),
      userId: "00000000-0000-0000-0000-000000000010",
      organizationId: "00000000-0000-0000-0000-000000000001"
    });

    expect(allowed).toBe(false);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("allows public listing access when listing has no organization", async () => {
    const allowed = await requireListingOrganizationAccess({
      request: requestWithOrgHeader(),
      userId: "00000000-0000-0000-0000-000000000010",
      organizationId: null
    });

    expect(allowed).toBe(true);
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("allows listing organization access for active matching members", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "membership-1" });

    const allowed = await requireListingOrganizationAccess({
      request: requestWithOrgHeader("00000000-0000-0000-0000-000000000001"),
      userId: "00000000-0000-0000-0000-000000000010",
      organizationId: "00000000-0000-0000-0000-000000000001"
    });

    expect(allowed).toBe(true);
  });
});
