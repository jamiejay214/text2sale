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
  ArrowUpRight,
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
  owner: boolean;
  onAdmin: () => void;
};

const groups = [
  {
    label: "Workspace",
    items: [
      { tab: "overview", label: "Overview", icon: LayoutDashboard },
      { tab: "conversations", label: "Conversations", icon: MessageSquare },
      { tab: "calls", label: "Calling", icon: Phone },
      { tab: "settings", sub: "ai", label: "AI texting", icon: Sparkles },
      { tab: "aicalls", label: "AI receptionist", icon: Phone },
      { tab: "campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Your business",
    items: [
      { tab: "contacts", label: "Contacts", icon: Users },
      { tab: "upload", label: "Lead imports", icon: Upload },
      { tab: "pipeline", label: "Pipeline", icon: Kanban },
      { tab: "appointments", label: "Calendar", icon: CalendarDays },
      { tab: "templates", label: "Message templates", icon: FileText },
    ],
  },
  {
    label: "Manage",
    items: [
      { tab: "settings", sub: "numbers", label: "Phone numbers", icon: Phone },
      {
        tab: "settings",
        sub: "billing",
        label: "Billing & funds",
        icon: Wallet,
      },
      {
        tab: "settings",
        sub: "10dlc",
        label: "Messaging setup",
        icon: ShieldCheck,
      },
      {
        tab: "settings",
        sub: "integrations",
        label: "Integrations",
        icon: Plug,
      },
      {
        tab: "settings",
        sub: "team",
        label: "Workspace settings",
        icon: Settings,
      },
      { tab: "learn", label: "Tutorials", icon: BookOpen },
    ],
  },
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
            <strong>{props.name}&apos;s workspace</strong>
            <small>Text2Sale CRM</small>
          </div>
        </div>
        <nav>
          {groups.map((group) => (
            <div className="workspace-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const sub = "sub" in item ? item.sub : undefined;
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
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="workspace-sidebar-footer">
          {props.owner && (
            <button onClick={props.onAdmin}>
              <ShieldCheck size={16} />
              Owner console
              <ArrowUpRight size={14} />
            </button>
          )}
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
            <strong>{selected?.label || "Settings"}</strong>
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
