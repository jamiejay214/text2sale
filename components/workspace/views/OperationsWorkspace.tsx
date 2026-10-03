"use client";

import dynamic from "next/dynamic";
import type { WorkspaceTab } from "@/components/WorkspaceNavigation";
import type { WorkspaceViewProps } from "../WorkspaceApp";

type Props = WorkspaceViewProps & { tab: WorkspaceTab; settingsTab: string };

const CallingWorkspace = dynamic(() => import("./operations/CallingWorkspace"), { loading: ScreenLoading });
const BusinessWorkspace = dynamic(() => import("./operations/BusinessWorkspace"), { loading: ScreenLoading });
const UploadWorkspace = dynamic(() => import("./operations/UploadWorkspace"), { loading: ScreenLoading });
const SettingsWorkspace = dynamic(() => import("./operations/SettingsWorkspace"), { loading: ScreenLoading });
const LearnWorkspace = dynamic(() => import("./operations/LearnWorkspace"), { loading: ScreenLoading });

function ScreenLoading() {
  return <div className="v2-loading"><span /><strong>Opening workspace</strong><small>Loading only this feature.</small></div>;
}

export default function OperationsWorkspace(props: Props) {
  if (props.tab === "calls") return <CallingWorkspace {...props} mode="dialer" />;
  if (props.tab === "aicalls") return <CallingWorkspace {...props} mode="ai" />;
  if (props.tab === "upload") return <UploadWorkspace {...props} />;
  if (props.tab === "settings") return <SettingsWorkspace {...props} />;
  if (props.tab === "learn") return <LearnWorkspace {...props} />;
  return <BusinessWorkspace {...props} mode={props.tab as "pipeline" | "appointments" | "templates"} />;
}
