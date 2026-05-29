"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "../../../components/dashboard/dashboard-shell";
import { apiFetch } from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

type SellerLead = {
  id: string;
  source: string;
  status: string;
  listingId: string | null;
  listingTitle: string;
  buyerId: string | null;
  notificationStatus?: "UNREAD" | "READ";
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function SellerLeadsPage() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [leads, setLeads] = useState<SellerLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingLeadId, setExportingLeadId] = useState<string | null>(null);
  const unreadLeads = leads.filter((lead) => lead.notificationStatus !== "READ").length;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function loadLeads() {
      try {
        setLoading(true);
        const result = await apiFetch<{ leads: SellerLead[] }>("/leads/my");

        if (!cancelled) {
          setLeads(result.leads);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load seller leads.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLeads();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);


  async function exportToWhispeRM(leadId: string) {
    try {
      setExportingLeadId(leadId);
      await apiFetch(`/leads/${leadId}/whisperm-export`, {
        method: "POST"
      });
      setLeads((current) =>
        current.map((lead) =>
          lead.id === leadId ? { ...lead, status: "EXPORT_QUEUED" } : lead
        )
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to export lead to WhispeRM.");
    } finally {
      setExportingLeadId(null);
    }
  }

  return (
    <DashboardShell>
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-amber-700">
              Seller Leads
            </p>
            <h2 className="text-2xl font-black text-gray-950">Buyer Attention</h2>
            <p className="mt-2 text-sm text-gray-600">
              WhatsApp lead activity captured from marketplace listing contacts.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800">
            {unreadLeads} new · {leads.length} total
          </span>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-gray-600">Loading leads...</p>
        ) : leads.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600">
            No WhatsApp leads captured yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {leads.map((lead) => (
              <article key={lead.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                        {lead.source}
                      </span>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                        {lead.status}
                      </span>
                    </div>

                    <h3 className="mt-3 font-bold text-gray-950">{lead.listingTitle}</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Buyer activity captured {formatDate(lead.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {lead.listingId ? (
                      <Link
                        href={`/listings/${lead.listingId}`}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-700 hover:bg-gray-50"
                      >
                        View listing
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => exportToWhispeRM(lead.id)}
                      disabled={exportingLeadId === lead.id}
                      className="rounded-xl bg-gray-950 px-4 py-2 text-center text-sm font-bold text-white hover:bg-black disabled:bg-gray-400"
                    >
                      {exportingLeadId === lead.id ? "Queueing..." : "Export to WhispeRM"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
