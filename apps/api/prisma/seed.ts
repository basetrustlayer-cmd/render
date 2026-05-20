import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seller = await prisma.user.upsert({
    where: { trustlayerUserId: "seed_seller_render" },
    update: {
      phone: "+233240000001",
      verificationLevel: 3,
      trustScore: 914,
      trustTier: "TRUSTED",
      isBusiness: true,
      whatsappNumber: "+233240000001"
    },
    create: {
      trustlayerUserId: "seed_seller_render",
      phone: "+233240000001",
      verificationLevel: 3,
      trustScore: 914,
      trustTier: "TRUSTED",
      isBusiness: true,
      whatsappNumber: "+233240000001"
    }
  });

  await prisma.listing.upsert({
    where: { id: "96c2d5f5-7061-4170-b43d-6101ccb88c48" },
    update: { status: "LIVE" },
    create: {
      id: "96c2d5f5-7061-4170-b43d-6101ccb88c48",
      sellerId: seller.id,
      title: "Toyota Corolla 2016",
      description: "Clean verified vehicle listing seeded for Render MVP testing.",
      price: 85000,
      category: "VEHICLES",
      condition: "GOOD",
      locationRegion: "Greater Accra",
      status: "LIVE"
    }
  });
}

main().finally(async () => prisma.$disconnect());
