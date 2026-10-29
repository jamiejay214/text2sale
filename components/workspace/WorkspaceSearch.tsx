"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { contactSearchFilter } from "@/lib/supabase-data";
import type { WorkspaceTab } from "@/components/WorkspaceNavigation";
type Result = {
  id: string;
  label: string;
  kind: WorkspaceTab;
  contact?: string;
};
export default function WorkspaceSearch({
  userId,
  onNavigate,
  onClose,
}: {
  userId: string;
  onNavigate: (tab: WorkspaceTab) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState(
    "Type a name, phone number, campaign or appointment title.",
  );
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setStatus("Searching your workspace…");
      const clean = query
        .replace(/[%_,()]/g, " ")
        .trim()
        .slice(0, 80);
      const [contacts, campaigns, appointments, conversations] =
        await Promise.all([
          supabase
            .from("contacts")
            .select("id,first_name,last_name,phone")
            .eq("user_id", userId)
            .or(contactSearchFilter(clean) || "id.is.null")
            .limit(8),
          supabase
            .from("campaigns")
            .select("id,name")
            .eq("user_id", userId)
            .ilike("name", `%${clean}%`)
            .limit(5),
          supabase
            .from("appointments")
            .select("id,title,date")
            .eq("user_id", userId)
            .ilike("title", `%${clean}%`)
            .limit(5),
          supabase
            .from("conversations")
            .select("id,contact_id,preview")
            .eq("user_id", userId)
            .ilike("preview", `%${clean}%`)
            .limit(5),
        ]);
      if (cancelled) return;
      if (
        [contacts, campaigns, appointments, conversations].some((r) => r.error)
      ) {
        setStatus("Search could not be completed. Please retry.");
        setResults([]);
        return;
      }
      setResults([
        ...(contacts.data || []).map((c) => ({
          id: c.id,
          label: `${c.first_name} ${c.last_name} · ${c.phone}`,
          kind: "conversations" as const,
          contact: c.id,
        })),
        ...(conversations.data || []).map((c) => ({
          id: c.id,
          label: `Conversation · ${c.preview}`,
          kind: "conversations" as const,
          contact: c.contact_id,
        })),
        ...(campaigns.data || []).map((c) => ({
          id: c.id,
          label: `Campaign · ${c.name}`,
          kind: "campaigns" as const,
        })),
        ...(appointments.data || []).map((c) => ({
          id: c.id,
          label: `Appointment · ${c.title} · ${c.date}`,
          kind: "appointments" as const,
        })),
      ]);
      setStatus(
        "Matching records · refine your search for more specific results.",
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, userId]);
  return (
    <div className="v2-command-backdrop" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search workspace"
        className="v2-command"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="v2-command-input">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search records"
            placeholder="Search contacts, conversations, campaigns…"
          />
          <button onClick={onClose} aria-label="Close search">
            ×
          </button>
        </div>
        <p role="status">{status}</p>
        <div className="v2-command-links">
          {results.map((r) => (
            <button
              key={`${r.kind}-${r.id}`}
              onClick={() => {
                if (r.contact)
                  sessionStorage.setItem("t2s_contact_id", r.contact);
                if (r.kind === "campaigns")
                  sessionStorage.setItem("t2s_campaign_id", r.id);
                if (r.kind === "appointments")
                  sessionStorage.setItem("t2s_appointment_id", r.id);
                onNavigate(r.kind);
                onClose();
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        {query && !results.length && <p>No matching records shown.</p>}
      </div>
    </div>
  );
}
