"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WorkspaceViewProps } from "./WorkspaceApp";
export default function TodayQueue({
  profile,
  onNavigate,
}: Pick<WorkspaceViewProps, "profile" | "onNavigate">) {
  const [due, setDue] = useState<
    { id: string; first_name: string; phone: string; follow_up_at: string }[]
  >([]);
  const [unread, setUnread] = useState(0),
    [failed, setFailed] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase
        .from("contacts")
        .select("id,first_name,phone,follow_up_at")
        .eq("user_id", profile.id)
        .eq("dnc", false)
        .lte("follow_up_at", new Date().toISOString())
        .order("follow_up_at")
        .limit(10),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gt("unread", 0)
        .eq("archived", false),
      supabase
        .from("scheduled_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("status", "failed"),
    ]).then(([a, b, c]) => {
      if (!alive) return;
      if (a.error || b.error || c.error) {
        setError("Could not load all work items. Refresh to retry.");
        return;
      }
      setDue(a.data || []);
      setUnread(b.count || 0);
      setFailed(c.count || 0);
    });
    return () => {
      alive = false;
    };
  }, [profile.id]);
  return (
    <section className="v2-panel" aria-label="Today work queue">
      <div className="v2-panel-head">
        <div>
          <h2>Today · your next actions</h2>
          <p>Replies first, then promised follow-ups and exceptions.</p>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="emerald-overview-actions">
        <button onClick={() => onNavigate("conversations")}>
          <span>
            <strong>{unread} conversations with unread messages</strong>
            <small>Open your inbox</small>
          </span>
        </button>
        <button onClick={() => onNavigate("appointments")}>
          <span>
            <strong>Appointments</strong>
            <small>Prepare, reschedule and record outcomes</small>
          </span>
        </button>
        <button onClick={() => onNavigate("campaigns")}>
          <span>
            <strong>{failed} failed scheduled messages</strong>
            <small>Review campaign activity before retrying</small>
          </span>
        </button>
      </div>
      {due.map((c) => (
        <div className="v2-toolbar" key={c.id}>
          <button
            onClick={() => {
              sessionStorage.setItem("t2s_contact_id", c.id);
              onNavigate("conversations");
            }}
          >
            {c.first_name || c.phone} · Follow-up due{" "}
            {new Date(c.follow_up_at).toLocaleString()}
          </button>
          <button
            onClick={async () => {
              const { error } = await supabase
                .from("contacts")
                .update({ follow_up_at: null })
                .eq("user_id", profile.id)
                .eq("id", c.id);
              if (error) setError("Could not complete this follow-up.");
              else setDue((d) => d.filter((x) => x.id !== c.id));
            }}
          >
            Mark complete
          </button>
        </div>
      ))}
    </section>
  );
}
