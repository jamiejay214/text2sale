"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Check, MessageSquare, Sparkles, CalendarDays, ShieldCheck, Upload, Workflow, PhoneCall, BarChart3, ArrowDown, CheckCircle2 } from "lucide-react";
import Logo from "@/components/Logo";
import AppointmentDemo from "@/components/AppointmentDemo";
import MonthlyCostEstimator from "@/components/MonthlyCostEstimator";
import FoundingAgentOffer from "@/components/FoundingAgentOffer";

const industries = {
  "Sales Teams": { heading: "Turn more conversations into opportunities.", body: "Bring your sales outreach, lead follow-up, and appointment booking into one workspace, whether you sell on your own or with a team.", href: "/sales-team-texting-crm" },
  Insurance: { heading: "Make the most of every lead you've earned.", body: "Keep eligible insurance inquiries organized, follow up with context, and move interested prospects toward an agent conversation.", href: "/insurance-agents" },
  "Real Estate": { heading: "Turn interest into real conversations.", body: "Keep buyer and seller inquiries in one place, coordinate follow-up, and stay close to your next opportunity.", href: "/real-estate-texting-crm" },
  "Home Services": { heading: "From first inquiry to the next appointment.", body: "Organize requests, coordinate estimate follow-up, and keep customer conversations moving.", href: "/roofing" },
} as const;
type Industry = keyof typeof industries;

export default function MarketingHome({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [industry, setIndustry] = useState<Industry>("Sales Teams");
  return (
    <div className="text-[#f8f2ff] bg-[#16101c]">
      <div className="relative overflow-hidden border-b border-white/10" style={{ background: "radial-gradient(ellipse at 55% 42%, #492a84 0%, #1c0a41 38%, #16101c 75%)" }}>
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8" aria-label="Main navigation">
          <Link href="/" aria-label="Text2Sale home" className="shrink-0"><Logo size="sm" /></Link>
          <div className="hidden items-center gap-7 text-sm text-[#d1b8f2] md:flex">
            <a className="hover:text-white" href="#product">Platform</a><a className="hover:text-white" href="#solutions">Solutions</a><a className="hover:text-white" href="#ai-booking-demo">AI in action</a><a className="hover:text-white" href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-3"><button onClick={onLogin} className="text-xs font-medium text-[#d9cde7] hover:text-white sm:text-sm">Log in</button><button onClick={onSignup} className="rounded-md bg-[#eae0f6] px-3 py-2.5 text-xs font-bold text-[#210d4a] transition hover:bg-white sm:px-5 sm:text-sm">Get Started <ArrowUpRight size={14} className="inline" /></button></div>
        </nav>

        <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-20 text-center sm:px-8 md:pt-28" aria-labelledby="luxury-hero-title">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-[#cab1ea]/30 bg-[#eae0f6]/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#e1cfa3] sm:text-xs"><Sparkles size={14} /> Sales &amp; business outreach CRM</div>
          <h1 id="luxury-hero-title" className="mx-auto max-w-5xl font-serif text-[clamp(2.9rem,7vw,6.3rem)] leading-[1.07] tracking-[-.055em]">AI texting &amp; calling.<br/><em className="font-normal text-[#ecd2ff]">Built for sales. Ready for your business.</em></h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#d3baf4] sm:text-lg">Connect with prospects, follow up consistently, and turn more conversations into appointments. Text2Sale brings AI texting, calling, and lead management into one workspace for sales professionals, teams, and business owners.</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3"><Link href="/pricing" className="inline-flex items-center gap-2 rounded-md bg-[#eae0f6] px-6 py-4 text-sm font-bold text-[#1c0a44] transition hover:bg-white">Compare plans <ArrowUpRight size={17}/></Link><a href="#ai-booking-demo" className="inline-flex items-center gap-2 rounded-md border border-[#c5a2f7]/40 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10">Watch AI in action <ArrowRight size={17}/></a></div>
          <p className="mt-6 text-xs tracking-wide text-[#bca1e1]">Texting plans from $39.99/user/month · Usage billed separately · Texting registration included</p>

          <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-[#af89e9]/45 bg-gradient-to-br from-[#7854b5] via-[#231149] to-[#d29d35]/50 p-1.5 text-left shadow-[0_34px_90px_rgba(0,0,0,.55)]">
            <div className="overflow-hidden rounded-xl bg-[#f6f8f5] text-[#2f1b56]">
              <div className="flex items-center justify-between border-b border-[#ede6f5] bg-white px-4 py-3 text-xs font-semibold sm:px-6"><span>✳ text<span className="text-[#8d59f0]">2</span>sale <span className="font-normal text-[#978ca4]">/ Intelligence Center</span></span><span className="rounded-full bg-[#f7f0fe] px-2 py-1 text-[10px] font-medium text-[#7747d5]">Illustrative workspace</span></div>
              <div className="grid md:grid-cols-[180px_minmax(0,1fr)]">
                <aside className="hidden bg-[#1d0c44] p-5 text-xs text-[#cbb2eb] md:block">
                  <div className="mb-6 text-[10px] font-bold tracking-[.2em] text-[#e9dff5]">WORKSPACE</div>
                  {[[BarChart3,"Overview"],[Sparkles,"AI Assistant"],[MessageSquare,"Conversations"],[Workflow,"Campaigns"],[CalendarDays,"Appointments"],[PhoneCall,"Calling"]].map(([Icon,label],i)=><div key={label as string} className={`mb-1 flex items-center gap-3 rounded-md px-3 py-3 ${i===0?"bg-[#553591] text-white":""}`}>{<Icon size={15}/>} {label as string}</div>)}
                </aside>
                <div className="p-4 sm:p-7">
                  <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight sm:text-xl">Your growth, in motion.</h2><p className="mt-1 text-xs text-[#997ebf]">A clear view of every opportunity</p></div><span className="rounded-md bg-[#f8eeff] px-3 py-2 text-[10px] font-semibold text-[#7b4add]">DEMO</span></div>
                  <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">{[["Active opportunities","1,284"],["Conversations","386"],["Appointments","42"]].map(([label,value])=><div key={label} className="rounded-lg border border-[#ede7f4] bg-white p-3 sm:p-5"><p className="text-[10px] text-[#947cb7] sm:text-xs">{label}</p><strong className="mt-2 block text-xl tracking-tight sm:text-3xl">{value}</strong><span className="text-[10px] text-[#aa90ce]">Sample data</span></div>)}</div>
                  <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
                    <div className="rounded-lg border border-[#ede7f4] bg-white p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-[#8a54f5]"/> AI Conversation Studio</h3><p className="mt-1 text-[10px] text-[#a186c5]">Illustrative conversation</p><div className="mt-4 rounded-lg bg-[#f5effd] p-3 text-xs leading-relaxed">Hi Alex! Would you still like to schedule a quick consultation?</div><div className="ml-5 mt-2 rounded-lg bg-[#f3e9ff] p-3 text-xs">Yes, tomorrow afternoon works.</div><div className="mt-2 rounded-lg bg-[#f5effd] p-3 text-xs">Great! Would 2:30 PM work?</div><div className="mt-3 flex items-center gap-1 text-xs font-medium text-[#834af9]"><CheckCircle2 size={13}/> Example appointment workflow</div></div>
                    <div className="rounded-lg border border-[#ede7f4] bg-white p-4"><h3 className="text-sm font-semibold">Opportunity Intelligence</h3><p className="mt-1 text-[10px] text-[#a186c5]">Illustrative campaign reporting</p><div className="mt-6 space-y-5">{[["Delivery status",86],["Responses",48],["Appointments",19]].map(([label,val])=><div key={label as string}><div className="mb-2 flex justify-between text-xs"><span>{label}</span><span className="text-[#804bec]">{val}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#f2ecfa]"><div className="h-full rounded-full bg-[#a267ff]" style={{width:`${val}%`}}/></div></div>)}</div><p className="mt-6 text-[10px] text-[#9a8ea7]">Example data · Not actual customer performance</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-7 text-[10px] font-bold uppercase tracking-[.26em] text-[#b494e0]">Built for sales teams who expect more</p>
        </section>
      </div>

      <section id="how-it-works" className="bg-[#f7f1fe] px-5 py-20 text-[#271351] sm:px-8 md:py-28">
        <div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#8e6cc3]">The opportunity</p><h2 className="mt-5 max-w-4xl font-serif text-4xl leading-tight tracking-[-.045em] sm:text-6xl">You worked hard for every lead.<br/><em className="text-[#926cd1]">Make every follow-up count.</em></h2><p className="mt-6 max-w-3xl text-base leading-8 text-[#756b82]">Opportunities get buried in disconnected systems. Conversations lose context. Follow-up slips through the cracks. Text2Sale brings your outreach and sales workflows together.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["01","Capture & organize","Bring properly consented contacts into one focused workspace."],["02","Engage intelligently","Create relevant follow-up with context and appropriate controls."],["03","Convert interest","Guide interested prospects toward conversations and appointments."],["04","See what works","Review delivery outcomes, responses, and appointment activity."]].map(([n,h,b])=><article key={n} className="rounded-lg border border-[#e6def0] bg-white p-6"><span className="font-serif text-3xl text-[#a59469]">{n}</span><h3 className="mt-5 text-lg font-semibold">{h}</h3><p className="mt-3 text-sm leading-7 text-[#846ba7]">{b}</p></article>)}</div>
        </div>
      </section>

      <section id="product" className="px-5 py-20 sm:px-8 md:py-28">
        <div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#d8c298]">The Text2Sale advantage</p><h2 className="mt-5 font-serif text-4xl leading-tight tracking-[-.045em] sm:text-6xl">Powerful by design.<br/><em className="text-[#dfc5ff]">Effortless by intention.</em></h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">{[
            [Sparkles,"AI that respects context","Configure AI with your scripts and goals, review previous conversations, and keep the human in control."],
            [MessageSquare,"Conversations that move forward","Keep two-way messaging, outreach, contact history, and calling in one connected workspace."],
            [BarChart3,"Clarity behind every send","Understand messaging status, responses, and campaign performance rather than relying on send counts alone."],
            [Upload,"Your leads, organized","Import contacts, map fields, manage lists, and identify the right next step."],
            [Workflow,"Flexible follow-up","Build sequences with personalized messaging, waiting steps, and opt-out handling."],
            [ShieldCheck,"Responsible messaging tools","Use consent records, suppression tools, quiet hours, and guided 10DLC registration. Carrier delivery is not guaranteed."]
          ].map(([Icon,h,b])=><article key={h as string} className="rounded-xl border border-[#9d76da]/30 bg-[#1f0d45] p-7 transition hover:border-[#d0b7f0]/65"><Icon size={26} className="text-[#e0c7ff]"/><h3 className="mt-6 text-lg font-semibold">{h as string}</h3><p className="mt-3 text-sm leading-7 text-[#c6ace9]">{b as string}</p></article>)}</div>
        </div>
      </section>

      <section id="solutions" className="bg-[#f7f1fe] px-5 py-20 text-[#271351] sm:px-8 md:py-24"><div className="mx-auto max-w-5xl text-center"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#8e6dc0]">Made for the way you sell</p><h2 className="mt-5 font-serif text-4xl tracking-[-.045em] sm:text-6xl">Built around the way<br/><em className="text-[#946dd2]">real businesses sell.</em></h2><div className="mt-9 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose a sales solution">{(Object.keys(industries) as Industry[]).map(name=><button key={name} onClick={()=>setIndustry(name)} aria-pressed={industry===name} className={`rounded-md border px-5 py-3 text-sm transition ${industry===name?"border-[#4f2e8f] bg-[#4f2e8f] text-white":"border-[#e0d5ec] bg-white text-[#68499b] hover:border-[#a074e8]"}`}>{name}</button>)}</div><div className="mx-auto mt-5 max-w-3xl rounded-xl border border-[#e9dff4] bg-white p-8 text-left sm:p-10"><span className="text-xs font-bold uppercase tracking-[.18em] text-[#936cd2]">{industry} solutions</span><h3 className="mt-4 font-serif text-3xl tracking-tight sm:text-4xl">{industries[industry].heading}</h3><p className="mt-4 text-base leading-8 text-[#7e67a0]">{industries[industry].body}</p><Link className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#6c3ec9]" href={industries[industry].href}>Explore this solution <ArrowUpRight size={16}/></Link></div></div></section>

      <AppointmentDemo />
      <MonthlyCostEstimator/>
      <FoundingAgentOffer />
      <section className="px-5 py-20 text-center sm:px-8 md:py-28" style={{background:"radial-gradient(ellipse at 50% 5%, #4c2c8e, #16101c 70%)"}}><p className="text-xs font-bold uppercase tracking-[.24em] text-[#e0c99d]">The future of follow-up starts here</p><h2 className="mx-auto mt-5 max-w-5xl font-serif text-4xl leading-tight tracking-[-.045em] sm:text-6xl">Don't just manage leads.<br/><em className="text-[#e6ccff]">Move business forward.</em></h2><p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[#d2b9f3]">Bring clarity, consistency, and intelligence to your next customer conversation.</p><div className="mt-9 flex flex-wrap justify-center gap-3"><button onClick={onSignup} className="inline-flex items-center gap-2 rounded-md bg-[#eae0f6] px-7 py-4 text-sm font-bold text-[#1c0a44] hover:bg-white">Start free trial <ArrowUpRight size={17}/></button><a href="#pricing" className="inline-flex items-center gap-2 rounded-md border border-[#bd98f3]/50 px-7 py-4 text-sm font-semibold text-white hover:bg-white/10">View plans <ArrowDown size={17}/></a></div><p className="mt-6 text-xs text-[#b394de]"><Check size={14} className="mr-1 inline"/> Appropriate consent required · Carrier and registration rules apply</p></section>
    </div>
  );
}
