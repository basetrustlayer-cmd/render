import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const auditCreateMock = vi.fn();

vi.mock("../../database/client.js", () => ({
  prisma: {
    auditLog: {
      create: auditCreateMock
    }
  }
}));

const { writeAuditLog } = await import("../log.js");

describe("audit log", () => {
  beforeEach(() => {
    auditCreateMock.mockReset();
  });

  it("persists audit fields with request context", async () => {
    const request = {
      ip: "127.0.0.1",
      headers: {
        "user-agent": "vitest-agent"
      }
    } as any;

    await writeAuditLog({
      request,
      actorUserId: "00000000-0000-0000-0000-000000000001",
      organizationId: "00000000-0000-0000-0000-000000000002",
      action: "TEST_ACTION",
      entityType: "USER",
      entityId: "00000000-0000-0000-0000-000000000003",
      metadata: {
        boundary: "REGRESSION_TEST"
      }
    });

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: {
        actorUserId: "00000000-0000-0000-0000-000000000001",
        organizationId: "00000000-0000-0000-0000-000000000002",
        action: "TEST_ACTION",
        entityType: "USER",
        entityId: "00000000-0000-0000-0000-000000000003",
        ipAddress: "127.0.0.1",
        userAgent: "vitest-agent",
        metadata: {
          boundary: "REGRESSION_TEST"
        }
      }
    });
  });

  it("defaults optional fields to null and metadata to JsonNull", async () => {
    await writeAuditLog({
      action: "TEST_MINIMAL"
    });

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: {
        actorUserId: null,
        organizationId: null,
        action: "TEST_MINIMAL",
        entityType: null,
        entityId: null,
        ipAddress: undefined,
        userAgent: undefined,
        metadata: Prisma.JsonNull
      }
    });
  });

  it("does not throw when audit persistence fails", async () => {
    auditCreateMock.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      writeAuditLog({
        action: "TEST_FAILURE_SWALLOWED"
      })
    ).resolves.toBeUndefined();
  });
});
