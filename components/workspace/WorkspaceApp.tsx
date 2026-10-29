"use client";

import WorkspaceSearch from "./WorkspaceSearch";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import WorkspaceNavigation, { type WorkspaceTab } from "@/components/WorkspaceNavigation";
import { getSession, logoutUser } from "@/lib/auth";
import { authFetch } from "@/lib/auth-fetch";
import { isOwnerEmail } from "@/lib/owner";
import { canCall, canText } from "@/lib/entitlements";
import PlanPicker from "./PlanPicker";
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
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setSearchOpen(v=>!v);}if(e.key==="Escape")setSearchOpen(false);};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[]);
  const [viewerEmail, setViewerEmail] = useState("");
  const [impersonated, setImpersonated] = useState(false);
  const profileId = profile?.id;

  const requestedTab = searchParams.get("tab") as WorkspaceTab | null;
  const impersonateId = searchParams.get("impersonate") || "";
  const activeTab = requestedTab && VALID_TABS.has(requestedTab) ? requestedTab : "overview";
  const settingsTab = searchParams.get("subtab") || "numbers";
  const subscribed =
    !!profile?.free_subscription ||
    ["active", "canceling"].includes(String(profile?.subscription_status || ""));
  const aiAccess = subscribed || !!profile?.free_ai_plan;
  // What the plan includes (lib/entitlements.ts): Text → texting, Dialer →
  // calling, Complete → both. Agents an account sponsors (calling_sponsors)
  // also get the browser phone and dialer, not the AI receptionist settings.
  // Locked features stay in the menu and open an upgrade page instead.
  const textingEnabled = canText(profile);
  const ownerCalling = canCall(profile);
  const [sponsoredCalling, setSponsoredCalling] = useState(false);
  const callingEnabled = ownerCalling || sponsoredCalling;
  const aiCallingEnabled = ownerCalling;

  const loadShell = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await getSession();
      if (!session?.user) {
        router.replace("/");
        return;
      }
      if (!session.user.email_confirmed_at && session.user.app_metadata?.role !== "admin") {
        router.replace("/verify");
        return;
      }
      const viewer = await fetchProfile(session.user.id, { throwOnError: true });
      setViewerEmail(session.user.email || viewer?.email || "");
      let account = viewer;
      let viewingAnotherAccount = false;
      if (viewer && impersonateId && impersonateId !== viewer.id) {
        const check = await authFetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "open", targetId: impersonateId }) });
        if (!check.ok) throw new Error((await check.json()).error || "Workspace access denied.");
        const target = await fetchProfile(impersonateId);
        const mayView =
          isOwnerEmail(session.user.email || viewer.email) ||
          viewer.role === "admin" ||
          (viewer.role === "manager" && target?.manager_id === viewer.id);
        if (!mayView || !target) throw new Error("You do not have access to that workspace.");
        account = target;
        viewingAnotherAccount = true;
      }
      if (!account) throw new Error("Your account could not be loaded. Please try again.");
      if (account.paused) throw new Error("This account is paused. Contact support.");
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
    if (!profileId || !subscribed || impersonated) return;
    let cancelled = false;
    authFetch("/api/normalize-subscription", { method: "POST" })
      .then((response) => response.json().catch(() => ({})).then((data) => ({ response, data })))
      .then(async ({ response, data }) => {
        if (cancelled || !response.ok) return;
        if (data.changed) {
          const latest = await fetchProfile(profileId);
          if (!cancelled && latest) setProfile(latest);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profileId, subscribed, impersonated]);

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

  useEffect(() => {
    if (!profileId || ownerCalling) return;
    let live = true;
    void supabase
      .from("calling_sponsors")
      .select("agent_id")
      .eq("agent_id", profileId)
      .maybeSingle()
      .then(({ data }) => { if (live) setSponsoredCalling(!!data); });
    return () => { live = false; };
  }, [profileId, ownerCalling]);

  const navigate = useCallback(
    (requested: WorkspaceTab, subtab?: string) => {
      const tab = requested;
      const aiOnly = tab === "aicalls" || (tab === "settings" && subtab === "ai");
      const destinationTab = aiOnly && !aiAccess ? "settings" : tab;
      const destinationSubtab = aiOnly && !aiAccess ? "upgrade" : subtab;
      const params = new URLSearchParams();
      if (impersonateId) params.set("impersonate", impersonateId);
      if (destinationTab !== "overview") params.set("tab", destinationTab);
      if (destinationTab === "settings" && destinationSubtab) params.set("subtab", destinationSubtab);
      const contact = sessionStorage.getItem("t2s_contact_id");
      if(destinationTab === "conversations" && contact) params.set("contact",contact);
      const campaign=sessionStorage.getItem("t2s_campaign_id");
      if(destinationTab==="campaigns" && campaign)params.set("campaign",campaign);
      const appointment=sessionStorage.getItem("t2s_appointment_id");
      if(destinationTab==="appointments" && appointment)params.set("appointment",appointment);
      const query = params.toString();
      router.push(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
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
    const textingTab =
      activeTab === "conversations" || activeTab === "campaigns" || activeTab === "templates" ||
      (activeTab === "settings" && (settingsTab === "ai" || settingsTab === "10dlc"));
    const lockedFeature =
      !callingEnabled && activeTab === "calls" ? "calling" :
      !aiCallingEnabled && activeTab === "aicalls" ? "calling" :
      !textingEnabled && textingTab ? "texting" : null;
    if (lockedFeature) {
      return (
        <div className="v2-upgrade-page">
          <h1>{lockedFeature === "texting" ? "Texting isn't on your plan" : "Calling isn't on your plan"}</h1>
          <p>
            {lockedFeature === "texting"
              ? "Texting, campaigns and AI text replies come with Text2Sale Text and Complete. After upgrading, register your business for texting (EIN and business details) to start sending."
              : "The dialer, browser phone and AI receptionist come with Text2Sale Dialer and Complete."}
          </p>
          <PlanPicker profile={profile} onProfile={setProfile} highlight={lockedFeature} onMessagingSetup={() => navigate("settings", "10dlc")} />
        </div>
      );
    }
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
  }, [activeTab, aiAccess, aiCallingEnabled, callingEnabled, navigate, profile, settingsTab, textingEnabled]);

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
          <button onClick={logout}>Sign out</button>
        </div>
      </main>
    );
  }

  if (!subscribed && !impersonated) {
    return (
      <main className="crm-theme workspace-v2 t2s-light v2-entry-loading">
        <div className="v2-error-card">
          <strong>Choose your Text2Sale plan</strong>
          <p>Your account is created. Pick a plan to unlock the workspace; there is no free trial. You can upgrade or switch later.</p>
          <PlanPicker profile={profile} onProfile={setProfile} />
          <button onClick={logout}>Sign out</button>
        </div>
      </main>
    );
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "My";
  return (
    <main className={`crm-theme workspace-v2 workspace-app emerald-workspace t2s-${theme}`}>
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
        aiAccess={aiAccess}
        callingEnabled={callingEnabled}
        aiCallingEnabled={aiCallingEnabled}
        textingEnabled={textingEnabled}
      />
      <section className="workspace-content v2-workspace-content">
        {impersonated && (
          <div className="v2-impersonation">
            <span>Viewing {displayName}&apos;s workspace</span>
            <small>Managing as yourself · workspace actions are recorded. Billing and credentials stay with the account holder.</small>
            <button onClick={() => router.push(isOwnerEmail(viewerEmail) ? "/admin" : "/dashboard?tab=settings&subtab=team")}>Exit account</button>
          </div>
        )}
        {view}
      </section>
      {searchOpen && profile && <WorkspaceSearch userId={profile.id} onNavigate={navigate} onClose={()=>setSearchOpen(false)}/>}
    </main>
  );
}
