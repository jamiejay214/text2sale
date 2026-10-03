"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import WorkspaceNavigation, { type WorkspaceTab } from "@/components/WorkspaceNavigation";
import { logoutUser } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/owner";
import { supabase } from "@/lib/supabase";
import { fetchProfile } from "@/lib/supabase-data";
import type { Profile } from "@/lib/types";
import { Search, X } from "lucide-react";

const OverviewWorkspace = dynamic(() => import("./views/OverviewWorkspace"), {
  loading: () => <WorkspaceLoading label="Preparing your overview" />,
});
const ConversationsWorkspace = dynamic(
  () => import("./views/ConversationsWorkspace"),
  { loading: () => <WorkspaceLoading label="Opening conversations" /> },
);
const CampaignsWorkspace = dynamic(() => import("./views/CampaignsWorkspace"), {
  loading: () => <WorkspaceLoading label="Opening campaigns" />,
});
const ContactsWorkspace = dynamic(() => import("./views/ContactsWorkspace"), {
  loading: () => <WorkspaceLoading label="Opening contacts" />,
});
const OperationsWorkspace = dynamic(() => import("./views/OperationsWorkspace"), {
  loading: () => <WorkspaceLoading label="Opening workspace" />,
});

const VALID_TABS = new Set<WorkspaceTab>([
  "overview",
  "conversations",
  "pipeline",
  "calls",
  "aicalls",
  "campaigns",
  "contacts",
  "appointments",
  "upload",
  "templates",
  "website",
  "settings",
  "learn",
]);

export type WorkspaceViewProps = {
  profile: Profile;
  onProfile: (profile: Profile) => void;
  onNavigate: (tab: WorkspaceTab, subtab?: string) => void;
};

function WorkspaceLoading({ label }: { label: string }) {
  return (
    <div className="v2-loading" role="status" aria-live="polite">
      <span />
      <strong>{label}</strong>
      <small>Loading only what this screen needs.</small>
    </div>
  );
}

export default function WorkspaceApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewerEmail, setViewerEmail] = useState("");
  const [impersonated, setImpersonated] = useState(false);
  const profileId = profile?.id;

  const requestedTab = searchParams.get("tab") as WorkspaceTab | null;
  const impersonateId = searchParams.get("impersonate") || "";
  const activeTab = requestedTab && VALID_TABS.has(requestedTab) ? requestedTab : "overview";
  const settingsTab = searchParams.get("subtab") || "numbers";
  const aiAccess = !!profile?.ai_plan || !!profile?.free_ai_plan;

  const loadShell = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/");
        return;
      }
      if (!session.user.email_confirmed_at && session.user.app_metadata?.role !== "admin") {
        router.replace("/verify");
        return;
      }
      const viewer = await fetchProfile(session.user.id);
      setViewerEmail(session.user.email || viewer?.email || "");
      let account = viewer;
      let viewingAnotherAccount = false;
      if (viewer && impersonateId && impersonateId !== viewer.id) {
        const target = await fetchProfile(impersonateId);
        const mayView =
          isOwnerEmail(session.user.email || viewer.email) ||
          viewer.role === "admin" ||
          (viewer.role === "manager" && target?.manager_id === viewer.id);
        if (!mayView || !target) throw new Error("You do not have access to that workspace.");
        account = target;
        viewingAnotherAccount = true;
      }
      if (!account || account.paused) {
        await logoutUser();
        router.replace("/");
        return;
      }
      setProfile(account);
      setImpersonated(viewingAnotherAccount);

      const { data: unreadRows } = await supabase
        .from("conversations")
        .select("unread")
        .eq("user_id", account.id)
        .gt("unread", 0)
        .limit(1000);
      setUnread(
        (unreadRows || []).reduce(
          (total, row) => total + Number(row.unread || 0),
          0,
        ),
      );

      const saved = window.localStorage.getItem("t2s_theme");
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open your workspace.");
    } finally {
      setLoading(false);
    }
  }, [impersonateId, router]);

  useEffect(() => {
    loadShell();
  }, [loadShell]);

  useEffect(() => {
    if (!profileId) return;
    const wallet = supabase
      .channel(`workspace-profile-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${profileId}`,
        },
        (payload) => {
          const next = payload.new as Partial<Profile>;
          setProfile((current) => (current ? { ...current, ...next } : current));
        },
      )
      .subscribe();
    const conversations = supabase
      .channel(`workspace-unread-${profileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `user_id=eq.${profileId}` },
        () => {
          supabase
            .from("conversations")
            .select("unread")
            .eq("user_id", profileId)
            .gt("unread", 0)
            .limit(1000)
            .then(({ data }) =>
              setUnread((data || []).reduce((sum, row) => sum + Number(row.unread || 0), 0)),
            );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(wallet);
      supabase.removeChannel(conversations);
    };
  }, [profileId]);

  const navigate = useCallback(
    (tab: WorkspaceTab, subtab?: string) => {
      const aiOnly = tab === "aicalls" || (tab === "settings" && subtab === "ai");
      const destinationTab = aiOnly && !aiAccess ? "settings" : tab;
      const destinationSubtab = aiOnly && !aiAccess ? "upgrade" : subtab;
      const params = new URLSearchParams();
      if (impersonateId) params.set("impersonate", impersonateId);
      if (destinationTab !== "overview") params.set("tab", destinationTab);
      if (destinationTab === "settings" && destinationSubtab) params.set("subtab", destinationSubtab);
      const query = params.toString();
      router.replace(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
    },
    [aiAccess, impersonateId, router],
  );

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      window.localStorage.setItem("t2s_theme", next);
      return next;
    });
  };

  const logout = async () => {
    await logoutUser();
    router.replace("/");
  };

  const view = useMemo(() => {
    if (!profile) return null;
    const shared: WorkspaceViewProps = { profile, onProfile: setProfile, onNavigate: navigate };
    if (!aiAccess && (activeTab === "aicalls" || (activeTab === "settings" && settingsTab === "ai"))) {
      return <OperationsWorkspace {...shared} tab="settings" settingsTab="upgrade" />;
    }
    switch (activeTab) {
      case "overview":
        return <OverviewWorkspace {...shared} />;
      case "conversations":
        return <ConversationsWorkspace {...shared} />;
      case "campaigns":
        return <CampaignsWorkspace {...shared} />;
      case "contacts":
        return <ContactsWorkspace {...shared} />;
      default:
        return <OperationsWorkspace {...shared} tab={activeTab} settingsTab={settingsTab} />;
    }
  }, [activeTab, aiAccess, navigate, profile, settingsTab]);

  if (loading) {
    return (
      <main className="crm-theme workspace-v2 t2s-light v2-entry-loading">
        <WorkspaceLoading label="Opening Text2Sale" />
      </main>
    );
  }

  if (!profile || error) {
    return (
      <main className="crm-theme workspace-v2 t2s-light v2-entry-loading">
        <div className="v2-error-card">
          <strong>We couldn&apos;t open the workspace.</strong>
          <p>{error || "Your session is no longer available."}</p>
          <button onClick={loadShell}>Try again</button>
        </div>
      </main>
    );
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "My";
  return (
    <main className={`crm-theme workspace-v2 workspace-app t2s-${theme}`}>
      <WorkspaceNavigation
        activeTab={activeTab}
        settingsTab={settingsTab}
        onNavigate={navigate}
        name={displayName}
        balance={Number(profile.wallet_balance || 0)}
        unread={unread}
        theme={theme}
        onTheme={toggleTheme}
        onSearch={() => setSearchOpen(true)}
        onLogout={logout}
        owner={isOwnerEmail(viewerEmail)}
        aiAccess={aiAccess}
        onAdmin={() => router.push("/admin")}
      />
      <section className="workspace-content v2-workspace-content">
        {impersonated && (
          <div className="v2-impersonation">
            <span>Viewing {displayName}&apos;s workspace</span>
            <small>Owner preview · actions still follow account permissions</small>
            <button onClick={() => router.push("/admin")}>Return to owner console</button>
          </div>
        )}
        {view}
      </section>
      {searchOpen && (
        <div className="v2-command-backdrop" onMouseDown={() => setSearchOpen(false)}>
          <div className="v2-command" onMouseDown={(event) => event.stopPropagation()}>
            <div className="v2-command-input">
              <Search size={18} />
              <input autoFocus placeholder="Jump to a workspace…" aria-label="Search workspace" />
              <button onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={18} /></button>
            </div>
            <div className="v2-command-links">
              {[
                ["conversations", "Open conversations"],
                ["campaigns", "Build a campaign"],
                ["contacts", "Find a contact"],
                ["calls", "Open the power dialer"],
                ["website", "Edit your website"],
                ["settings", "Manage phone numbers"],
                ["learn", "Open tutorials"],
              ].map(([tab, label]) => (
                <button key={tab} onClick={() => { navigate(tab as WorkspaceTab, tab === "settings" ? "numbers" : undefined); setSearchOpen(false); }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
