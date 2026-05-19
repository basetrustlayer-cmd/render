import type { FastifyInstance } from "fastify";
import { z } from "zod";

const ghanaCardSchema = z.object({
  userId: z.string().uuid(),
  ghanaCardNumber: z.string().min(5).max(30)
});

export async function registerTrustLayerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/trustlayer/health", async () => {
    return {
      status: "ok",
      provider: "TrustLayer",
      configured: Boolean(process.env.TRUSTLAYER_API_KEY)
    };
  });

  app.get("/verify/status", async () => {
    return {
      verification: {
        configured: Boolean(process.env.TRUSTLAYER_API_KEY),
        provider: "TrustLayer"
      }
    };
  });

  app.post("/verify/ghana-card", async (request, reply) => {
    const parsed = ghanaCardSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid Ghana Card verification payload."
      });
    }

    return reply.code(501).send({
      error: "TrustLayer Ghana Card verification integration pending.",
      request: {
        userId: parsed.data.userId,
        ghanaCardNumber: parsed.data.ghanaCardNumber
      }
    });
  });
}
