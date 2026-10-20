"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Phone,
  Sparkles,
  Megaphone,
  Users,
  Upload,
  CalendarDays,
  Kanban,
  BookOpen,
  Wallet,
  Plug,
  ShieldCheck,
  Settings,
  FileText,
  Search,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  LockKeyhole,
  Globe2,
} from "lucide-react";
import Logo from "@/components/Logo";

export type WorkspaceTab =
  | "overview"
  | "conversations"
  | "pipeline"
  | "calls"
  | "aicalls"
  | "campaigns"
  | "contacts"
  | "appointments"
  | "upload"
  | "templates"
  | "website"
  | "settings"
  | "learn";
type Props = {
  activeTab: WorkspaceTab;
  settingsTab: string;
  onNavigate: (tab: WorkspaceTab, settingsTab?: string) => void;
  name: string;
  balance: number;
  unread: number;
  theme: "light" | "dark";
  onTheme: () => void;
  onSearch: () => void;
  onLogout: () => void;
  aiAccess: boolean;
  // Dialer and AI receptionist: only on the owner's account for now.
  callingEnabled: boolean;
  /** AI receptionist settings; owner only, even when callingEnabled. */
  aiCallingEnabled?: boolean;
  /** Texting tools (inbox, campaigns, AI texting, messaging setup) are on the plan. */
  textingEnabled?: boolean;
};

const TEXTING_ITEMS = new Set(["conversations", "campaigns", "templates", "settings:ai", "settings:10dlc"]);

// Calling-first navigation: keep daily sales tools prominent and move setup to Manage.
const groups = [
  { label: "Sales workspace", items: [
    { tab: "overview", label: "Dashboard", icon: LayoutDashboard },
    { tab: "calls", label: "Dialer", icon: Phone },
    { tab: "contacts", label: "Leads", icon: Users },
    { tab: "conversations", label: "Conversations", icon: MessageSquare },
    { tab: "appointments", label: "Appointments", icon: CalendarDays },
    { tab: "pipeline", label: "Pipeline", icon: Kanban },
  ] },
  { label: "Automation", items: [
    { tab: "campaigns", label: "Campaigns", icon: Megaphone },
    { tab: "settings", sub: "ai", label: "AI follow-up", icon: Sparkles, aiOnly: true },
    { tab: "aicalls", label: "AI receptionist", icon: Phone, aiOnly: true },
  ] },
  { label: "Manage", items: [
    { tab: "upload", label: "Import leads", icon: Upload },
    { tab: "settings", sub: "numbers", label: "Phone numbers", icon: Phone },
    { tab: "settings", sub: "billing", label: "Billing & funds", icon: Wallet },
    { tab: "settings", sub: "10dlc", label: "Messaging setup", icon: ShieldCheck },
    { tab: "settings", sub: "integrations", label: "Integrations", icon: Plug },
    { tab: "settings", sub: "team", label: "Workspace & team", icon: Settings },
    { tab: "website", label: "Website", icon: Globe2 },
    { tab: "templates", label: "Templates", icon: FileText },
    { tab: "settings", sub: "support", label: "Support", icon: MessageSquare },
    { tab: "learn", label: "Tutorials", icon: BookOpen },
  ] },
] as const;

export default function WorkspaceNavigation(props: Props) {
  const [open, setOpen] = useState(false);
  const selected = groups
    .flatMap((g) => [...g.items])
    .find(
      (item) =>
        item.tab === props.activeTab &&
        (!("sub" in item) || item.sub === props.settingsTab),
    );
  const navigate = (tab: WorkspaceTab, sub?: string) => {
    props.onNavigate(tab, sub);
    setOpen(false);
  };
  return (
    <>
      {open && (
        <button
          className="workspace-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`workspace-sidebar ${open ? "is-open" : ""}`}
        aria-label="Workspace navigation"
      >
        <a className="workspace-brand" href="/dashboard">
          <Logo size="sm" />
        </a>
        <button
          className="workspace-mobile-close"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
        <div className="workspace-identity">
          <span className="workspace-avatar">
            {props.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <strong>{props.name.split(" ")[0]}&apos;s workspace</strong>
            <small>Sales Command Center</small>
          </div>
        </div>
        <nav>
          {groups.map((group) => (
            <div className="workspace-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const sub = "sub" in item ? item.sub : undefined;
                // Features outside the plan stay listed and open an upgrade page.
                const offPlan =
                  (item.tab === "calls" && !props.callingEnabled) ||
                  (item.tab === "aicalls" && !(props.aiCallingEnabled ?? props.callingEnabled)) ||
                  (props.textingEnabled === false && TEXTING_ITEMS.has(sub ? `${item.tab}:${sub}` : item.tab));
                const locked = offPlan || ("aiOnly" in item && item.aiOnly && !props.aiAccess);
                const active =
                  props.activeTab === item.tab &&
                  (!sub || props.settingsTab === sub);
                return (
                  <button
                    key={item.label}
                    className={active ? "is-active" : ""}
                    aria-current={active ? "page" : undefined}
                    onClick={() => navigate(item.tab, sub)}
                  >
                    <item.icon size={17} />
                    <span>{item.label}</span>
                    {item.tab === "conversations" && props.unread > 0 && (
                      <b className="workspace-unread">
                        {props.unread > 99 ? "99+" : props.unread}
                      </b>
                    )}
                    {locked && <b className="workspace-ai-badge"><LockKeyhole size={10} /> Upgrade</b>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="workspace-sidebar-footer">
          <button onClick={props.onLogout}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <header className="workspace-topbar">
        <div className="workspace-page-label">
          <button
            className="workspace-mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>
          <span>
            Workspace <span className="workspace-divider">/</span>{" "}
            <strong>{selected?.label || (props.settingsTab === "upgrade" ? "Upgrade to AI" : "Settings")}</strong>
          </span>
        </div>
        <div className="workspace-topbar-actions">
          <button
            className="workspace-search"
            onClick={props.onSearch}
            aria-label="Search workspace"
          >
            <Search size={17} />
            <span>Search anything</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className="workspace-balance"
            onClick={() => navigate("settings", "billing")}
            title="Account balance · Add funds"
          >
            <Wallet size={16} />
            <span>
              <small>Balance</small>
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(props.balance)}
              </strong>
            </span>
            <span aria-hidden="true">+</span>
          </button>
          <button
            className="workspace-theme-toggle"
            onClick={props.onTheme}
            aria-label={`Switch to ${props.theme === "light" ? "dark" : "light"} theme`}
          >
            {props.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>
    </>
  );
}
