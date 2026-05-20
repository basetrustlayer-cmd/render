import { PrismaClient } from "@prisma/client";

const DEMO_USER_TRUSTLAYER_ID = "seed_seller_render";
const DEMO_LISTING_ID = "96c2d5f5-7061-4170-b43d-6101ccb88c48";

export async function ensureDemoListing(prisma: PrismaClient) {
  const seller = await prisma.user.upsert({
    where: { trustlayerUserId: DEMO_USER_TRUSTLAYER_ID },
    update: {
      phone: "+233240000001",
      verificationLevel: 3,
      trustScore: 914,
      trustTier: "TRUSTED",
      isBusiness: true,
      whatsappNumber: "+233240000001"
    },
    create: {
      trustlayerUserId: DEMO_USER_TRUSTLAYER_ID,
      phone: "+233240000001",
      verificationLevel: 3,
      trustScore: 914,
      trustTier: "TRUSTED",
      isBusiness: true,
      whatsappNumber: "+233240000001"
    }
  });

  await prisma.listing.upsert({
    where: { id: DEMO_LISTING_ID },
    update: {
      status: "LIVE",
      sellerId: seller.id,
      title: "Toyota Corolla 2016",
      description: "Clean verified vehicle listing seeded automatically for Render MVP testing.",
      price: 85000,
      category: "VEHICLES",
      condition: "GOOD",
      locationRegion: "Greater Accra"
    },
    create: {
      id: DEMO_LISTING_ID,
      sellerId: seller.id,
      title: "Toyota Corolla 2016",
      description: "Clean verified vehicle listing seeded automatically for Render MVP testing.",
      price: 85000,
      category: "VEHICLES",
      condition: "GOOD",
      locationRegion: "Greater Accra",
      status: "LIVE"
    }
  });
}

export async function bootstrapDemoData(prisma: PrismaClient) {
  if (process.env.BOOTSTRAP_DEMO_DATA === "true") {
    await ensureDemoListing(prisma);
  }
}
