import { ListingGrid } from "../../components/listing-grid";

const categories = [
  "All",
  "Vehicles",
  "Real Estate",
  "Electronics",
  "Jobs",
  "Services",
  "Fashion"
];

export default function ListingsPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "32px" }}>
      <section style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <p style={{ color: "var(--gold)", fontWeight: 700 }}>Browse Render</p>

        <h1 style={{ fontSize: "48px", margin: "12px 0" }}>
          Verified listings only when trust matters.
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "14px",
            margin: "28px 0",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "18px",
            background: "#fff"
          }}
        >
          <input
            placeholder="Search cars, apartments, phones, jobs..."
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              fontSize: "16px"
            }}
          />

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "999px",
                  background: category === "All" ? "var(--ink)" : "#fff",
                  color: category === "All" ? "#fff" : "var(--ink)",
                  padding: "10px 14px",
                  fontWeight: 700
                }}
              >
                {category}
              </button>
            ))}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="checkbox" defaultChecked />
            Verified sellers only
          </label>
        </div>

        <ListingGrid />
      </section>
    </main>
  );
}
