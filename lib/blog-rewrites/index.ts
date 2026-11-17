// Long-form rewrites of existing posts. Each replaces the original entry
// with the same slug (see the override loop in lib/blog-posts.ts), so the
// URL, internal links and original publish date are preserved.
//
// The blog is being rebuilt post by post, highest search demand first.
// To add one: create a file here exporting a full BlogPost and list it below.

import type { BlogPost } from "../blog-posts";
import { PREDICTIVE_DIALER } from "./predictive-dialer";
import { SPEED_TO_LEAD } from "./speed-to-lead";
import { TCPA_COMPLIANCE } from "./tcpa-compliance";
import { TENDLC_REGISTRATION } from "./tendlc-registration";

export const BLOG_REWRITES: BlogPost[] = [TENDLC_REGISTRATION, TCPA_COMPLIANCE, PREDICTIVE_DIALER, SPEED_TO_LEAD];
