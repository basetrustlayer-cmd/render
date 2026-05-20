import Link from "next/link";
import { getListing } from "../../../lib/get-listing";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric"
  });
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { listing, seller } = await getListing(params.id);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: 24 }}>
      <Link href="/listings">← Back to listings</Link>

      <div style={{ display: "grid", gap: 24, marginTop: 24 }}>
        <section style={{ border: "1px solid #ddd", borderRadius: 24, padding: 24, background: "#fff" }}>
          <p style={{ color: "#666", margin: 0 }}>{listing.category}</p>
          <h1 style={{ fontSize: 42, lineHeight: 1.05, margin: "12px 0" }}>{listing.title}</h1>
          <p>{listing.locationRegion}</p>
          <h2>GH₵ {String(listing.price)}</h2>
          <p style={{ fontSize: 18, lineHeight: 1.6 }}>{listing.description}</p>

          <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
            <Info label="Condition" value={listing.condition || "Not specified"} />
            <Info label="Trust Status" value={seller.verificationStatus} />
            <Info label="Safe Deal" value="Escrow Protection Available Soon" />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <Link href="/messages" style={buttonBlack}>
              Message Seller
            </Link>

            <Link href={`/safe-deal/new?listingId=${listing.id}`} style={buttonWhite}>
              Start Safe Deal
            </Link>
          </div>
        </section>

        <aside style={{ border: "1px solid #ddd", borderRadius: 24, padding: 24, background: "#fff" }}>
          <p style={{ color: "#b7791f", fontWeight: 700, margin: 0 }}>Verified Seller</p>
          <h2 style={{ fontSize: 30, margin: "10px 0" }}>{seller.displayName}</h2>

          <div style={{ background: "#ecfdf5", borderRadius: 18, padding: 18, marginTop: 18 }}>
            <p style={{ margin: 0, color: "#666" }}>TrustScore</p>
            <strong style={{ fontSize: 42, color: "#047857" }}>{seller.trustScore}/1000</strong>
            <p style={{ margin: 0 }}>{seller.trustTier}</p>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            <Metric label="Reviews" value={`${seller.reviewCount} ★★★★★`} />
            <Metric label="Completed Deals" value={String(seller.completedDeals)} />
            <Metric label="Active Listings" value={String(seller.activeListings)} />
            <Metric label="Member Since" value={formatDate(seller.memberSince)} />
          </div>

          <div style={{ border: "1px solid #bbf7d0", background: "#ecfdf5", borderRadius: 18, padding: 18, marginTop: 20 }}>
            <strong>Buy with Confidence</strong>
            <p style={{ marginBottom: 0 }}>
              This seller has completed identity verification and has an active Render marketplace profile.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 16 }}>
      <p style={{ margin: 0, color: "#666" }}>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16,
        alignItems: "center",
        borderBottom: "1px solid #eee",
        paddingBottom: 10
      }}
    >
      <span style={{ color: "#666" }}>{label}</span>
      <strong style={{ color: "#111", textAlign: "right", whiteSpace: "nowrap" }}>
        {value || "0"}
      </strong>
    </div>
  );
}

const buttonBlack = {
  background: "#111",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: 12,
  textDecoration: "none"
};

const buttonWhite = {
  background: "#fff",
  color: "#111",
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #ddd",
  textDecoration: "none"
};
