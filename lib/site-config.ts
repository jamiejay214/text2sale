import { getIndustry } from "./industries";

export const SITE_CONFIG_VERSION = 1;

export type BusinessSiteTemplate = "studio" | "trust" | "bold";

export type BusinessSiteService = {
  title: string;
  description: string;
};

export type BusinessSiteConfig = {
  version: number;
  template: BusinessSiteTemplate;
  primaryColor: string;
  accentColor: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  announcement: string;
  logoUrl: string;
  services: BusinessSiteService[];
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export type SiteConfigSeed = {
  businessName: string;
  industry?: string | null;
  description?: string | null;
  logoUrl?: string | null;
};

const PALETTES: Record<BusinessSiteTemplate, { primary: string; accent: string }> = {
  studio: { primary: "#153f32", accent: "#d9f779" },
  trust: { primary: "#173c66", accent: "#8fd7ff" },
  bold: { primary: "#4b2b80", accent: "#ffcb65" },
};

const clean = (value: unknown, fallback: string, max: number) =>
  (typeof value === "string" ? value.trim() : fallback).slice(0, max) || fallback;

const color = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;

const safeLogo = (value: unknown, fallback = "") => {
  const candidate = typeof value === "string" ? value.trim().slice(0, 500) : fallback;
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? candidate : "";
  } catch {
    return "";
  }
};

export function defaultSiteConfig(seed: SiteConfigSeed): BusinessSiteConfig {
  const industry = getIndustry(seed.industry);
  const now = new Date().toISOString();
  return {
    version: SITE_CONFIG_VERSION,
    template: "studio",
    primaryColor: PALETTES.studio.primary,
    accentColor: PALETTES.studio.accent,
    headline: industry.headline,
    subheadline: seed.description?.trim() || industry.defaultDescription(seed.businessName),
    ctaLabel: industry.cta,
    announcement: "Friendly, local help when you need it.",
    logoUrl: seed.logoUrl?.trim() || "",
    services: industry.services.slice(0, 6).map((service) => ({
      title: service.title,
      description: service.desc,
    })),
    showPhone: true,
    showEmail: true,
    showAddress: true,
    publishedAt: null,
    updatedAt: now,
  };
}

export function normalizeSiteConfig(value: unknown, seed: SiteConfigSeed): BusinessSiteConfig {
  const defaults = defaultSiteConfig(seed);
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const template: BusinessSiteTemplate =
    input.template === "trust" || input.template === "bold" || input.template === "studio"
      ? input.template
      : defaults.template;
  const palette = PALETTES[template];
  const rawServices = Array.isArray(input.services) ? input.services : defaults.services;
  const services = rawServices
    .slice(0, 6)
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        title: clean(row.title, "Service", 60),
        description: clean(row.description, "Professional guidance tailored to your needs.", 220),
      };
    })
    .filter((item) => item.title && item.description);

  return {
    version: SITE_CONFIG_VERSION,
    template,
    primaryColor: color(input.primaryColor, palette.primary),
    accentColor: color(input.accentColor, palette.accent),
    headline: clean(input.headline, defaults.headline, 100),
    subheadline: clean(input.subheadline, defaults.subheadline, 420),
    ctaLabel: clean(input.ctaLabel, defaults.ctaLabel, 42),
    announcement: clean(input.announcement, defaults.announcement, 90),
    logoUrl: safeLogo(input.logoUrl, defaults.logoUrl),
    services: services.length ? services : defaults.services,
    showPhone: input.showPhone !== false,
    showEmail: input.showEmail !== false,
    showAddress: input.showAddress !== false,
    publishedAt: typeof input.publishedAt === "string" ? input.publishedAt : null,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : defaults.updatedAt,
  };
}

export function publishSiteConfig(value: unknown, seed: SiteConfigSeed): BusinessSiteConfig {
  const config = normalizeSiteConfig(value, seed);
  const now = new Date().toISOString();
  return { ...config, publishedAt: now, updatedAt: now };
}

export function readableTextColor(hex: string): "#ffffff" | "#10231a" {
  const normalized = color(hex, "#153f32").slice(1);
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.57 ? "#10231a" : "#ffffff";
}
