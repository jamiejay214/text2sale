import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const req = createRequire(import.meta.url);
req.extensions['.ts'] = (mod, path) => mod._compile(ts.transpileModule(readFileSync(path,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,path);
const { TELNYX_VERTICALS, getIndustry, registrationVertical } = req('../lib/industries.ts');
const { defaultSiteConfig } = req('../lib/site-config.ts');
const { buildBrandPayload, buildCampaignPayload } = req('../lib/telnyx-10dlc.ts');
test('every Telnyx selection carries through to the site, program disclosure and campaign samples', () => {
  const headlines=new Set();
  for (const industry of Object.keys(TELNYX_VERTICALS)) {
    const profile=getIndustry(industry);
    const businessName='Example Co', phone='3055550100', site='https://example.org';
    const page=defaultSiteConfig({businessName,industry});
    const brand=buildBrandPayload({businessName,industry,businessType:'llc',ein:'123456789',street:'12 Main St',city:'Miami',state:'FL',postalCode:'33101',phone,email:'a@example.org',website:site});
    const campaign=buildCampaignPayload({businessName,industry,brandId:'fixture',contactPhone:phone,contactEmail:'a@example.org',websiteUrl:site});
    assert.equal(brand.vertical,industry);
    assert.ok(page.services.length >= 3);
    assert.ok(campaign.description.includes(profile.messageTypes));
    assert.ok(campaign.messageFlow.includes(profile.messageTypes));
    assert.equal(campaign.optinKeywords,'START,SUBSCRIBE,YES');
    for (const sample of [campaign.sample1,campaign.sample2]) {assert.ok(sample.includes(businessName));assert.ok(sample.includes('STOP'));}
    headlines.add(page.headline);
  }
  assert.equal(headlines.size,23);
  assert.equal(registrationVertical('health_insurance'),'INSURANCE');
  assert.notEqual(getIndustry('health_insurance').headline,getIndustry('INSURANCE').headline);
});
