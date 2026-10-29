"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, Check, MessageSquare, Sparkles, CalendarDays, ShieldCheck, Upload, Workflow, PhoneCall, BarChart3, ArrowDown, CheckCircle2 } from "lucide-react";
import Logo from "@/components/Logo";
import AppointmentDemo from "@/components/AppointmentDemo";
import FoundingAgentOffer from "@/components/FoundingAgentOffer";

const industries = {
  Insurance: { heading: "Make the most of every lead you've earned.", body: "Keep eligible insurance inquiries organized, follow up with context, and move interested prospects toward an agent conversation.", href: "/insurance-agents" },
  "Real Estate": { heading: "Turn interest into real conversations.", body: "Keep buyer and seller inquiries in one place, coordinate follow-up, and stay close to your next opportunity.", href: "/real-estate" },
  "Home Services": { heading: "From first inquiry to the next appointment.", body: "Organize requests, coordinate estimate follow-up, and keep customer conversations moving.", href: "/roofing" },
} as const;
type Industry = keyof typeof industries;

export default function MarketingHome({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [industry, setIndustry] = useState<Industry>("Insurance");
  return (
    <div className="text-[#eff6ee] bg-[#08150f]">
      <div className="relative overflow-hidden border-b border-white/10" style={{ background: "radial-gradient(ellipse at 55% 42%, #20452e 0%, #102519 38%, #08150f 75%)" }}>
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8" aria-label="Main navigation">
          <Link href="/" aria-label="Text2Sale home" className="shrink-0"><Logo size="sm" /></Link>
          <div className="hidden items-center gap-7 text-sm text-[#b3c8b8] md:flex">
            <a className="hover:text-white" href="#product">Platform</a><a className="hover:text-white" href="#solutions">Solutions</a><a className="hover:text-white" href="#ai-booking-demo">AI in action</a><a className="hover:text-white" href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center gap-3"><button onClick={onLogin} className="text-xs font-medium text-[#c5d6c8] hover:text-white sm:text-sm">Log in</button><button onClick={onSignup} className="rounded-md bg-[#d8e9d1] px-3 py-2.5 text-xs font-bold text-[#142a1b] transition hover:bg-white sm:px-5 sm:text-sm">Get Started <ArrowUpRight size={14} className="inline" /></button></div>
        </nav>

        <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-20 text-center sm:px-8 md:pt-28" aria-labelledby="luxury-hero-title">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-[#a0c59b]/30 bg-[#d9e9ce]/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#e1cfa3] sm:text-xs"><Sparkles size={14} /> Intelligent sales infrastructure</div>
          <h1 id="luxury-hero-title" className="mx-auto max-w-5xl font-serif text-[clamp(2.9rem,7vw,6.3rem)] leading-[1.07] tracking-[-.055em]">Every lead has potential.<br/><em className="font-normal text-[#c7e5c6]">Unlock more of it.</em></h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#b8c9ba] sm:text-lg">Meet the intelligent sales workspace designed to reconnect with opportunities, elevate every conversation, and turn consistent follow-up into business growth.</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3"><button onClick={onSignup} className="inline-flex items-center gap-2 rounded-md bg-[#d8e9d1] px-6 py-4 text-sm font-bold text-[#102619] transition hover:bg-white">Experience Text2Sale <ArrowUpRight size={17}/></button><a href="#ai-booking-demo" className="inline-flex items-center gap-2 rounded-md border border-[#9fb9a0]/40 px-6 py-4 text-sm font-semibold text-white transition hover:bg-white/10">Watch AI in action <ArrowRight size={17}/></a></div>
          <p className="mt-6 text-xs tracking-wide text-[#9fb2a2]">One connected workspace · AI-assisted follow-up · Built for ambitious sales teams</p>

          <div className="mx-auto mt-16 max-w-5xl rounded-2xl border border-[#7ca583]/45 bg-gradient-to-br from-[#4b7055] via-[#152c20] to-[#9cab87]/50 p-1.5 text-left shadow-[0_34px_90px_rgba(0,0,0,.55)]">
            <div className="overflow-hidden rounded-xl bg-[#f6f8f5] text-[#20372a]">
              <div className="flex items-center justify-between border-b border-[#e3ebe2] bg-white px-4 py-3 text-xs font-semibold sm:px-6"><span>✳ text<span className="text-[#43865b]">2</span>sale <span className="font-normal text-[#849487]">/ Intelligence Center</span></span><span className="rounded-full bg-[#edf5ef] px-2 py-1 text-[10px] font-medium text-[#34724a]">Illustrative workspace</span></div>
              <div className="grid md:grid-cols-[180px_minmax(0,1fr)]">
                <aside className="hidden bg-[#10271b] p-5 text-xs text-[#a7c4ad] md:block">
                  <div className="mb-6 text-[10px] font-bold tracking-[.2em] text-[#d2e9d2]">WORKSPACE</div>
                  {[[BarChart3,"Overview"],[Sparkles,"AI Assistant"],[MessageSquare,"Conversations"],[Workflow,"Campaigns"],[CalendarDays,"Appointments"],[PhoneCall,"Calling"]].map(([Icon,label],i)=><div key={label as string} className={`mb-1 flex items-center gap-3 rounded-md px-3 py-3 ${i===0?"bg-[#295039] text-white":""}`}>{<Icon size={15}/>} {label as string}</div>)}
                </aside>
                <div className="p-4 sm:p-7">
                  <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight sm:text-xl">Your growth, in motion.</h2><p className="mt-1 text-xs text-[#7b8f7e]">A clear view of every opportunity</p></div><span className="rounded-md bg-[#e8f5e9] px-3 py-2 text-[10px] font-semibold text-[#37764b]">DEMO</span></div>
                  <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">{[["Active opportunities","1,284"],["Conversations","386"],["Appointments","42"]].map(([label,value])=><div key={label} className="rounded-lg border border-[#e4ebe4] bg-white p-3 sm:p-5"><p className="text-[10px] text-[#7a8b7c] sm:text-xs">{label}</p><strong className="mt-2 block text-xl tracking-tight sm:text-3xl">{value}</strong><span className="text-[10px] text-[#8ca091]">Sample data</span></div>)}</div>
                  <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
                    <div className="rounded-lg border border-[#e4ebe4] bg-white p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-[#398559]"/> AI Conversation Studio</h3><p className="mt-1 text-[10px] text-[#849787]">Illustrative conversation</p><div className="mt-4 rounded-lg bg-[#edf3ee] p-3 text-xs leading-relaxed">Hi Alex! Would you still like to schedule a quick consultation?</div><div className="ml-5 mt-2 rounded-lg bg-[#ddf2e3] p-3 text-xs">Yes, tomorrow afternoon works.</div><div className="mt-2 rounded-lg bg-[#edf3ee] p-3 text-xs">Great! Would 2:30 PM work?</div><div className="mt-3 flex items-center gap-1 text-xs font-medium text-[#25814c]"><CheckCircle2 size={13}/> Example appointment workflow</div></div>
                    <div className="rounded-lg border border-[#e4ebe4] bg-white p-4"><h3 className="text-sm font-semibold">Opportunity Intelligence</h3><p className="mt-1 text-[10px] text-[#849787]">Illustrative campaign reporting</p><div className="mt-6 space-y-5">{[["Delivery status",86],["Responses",48],["Appointments",19]].map(([label,val])=><div key={label as string}><div className="mb-2 flex justify-between text-xs"><span>{label}</span><span className="text-[#367c4d]">{val}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eaf0e9]"><div className="h-full rounded-full bg-[#4f9a68]" style={{width:`${val}%`}}/></div></div>)}</div><p className="mt-6 text-[10px] text-[#86978a]">Example data · Not actual customer performance</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-7 text-[10px] font-bold uppercase tracking-[.26em] text-[#8da996]">Built for sales teams who expect more</p>
        </section>
      </div>

      <section id="how-it-works" className="bg-[#f1f4ee] px-5 py-20 text-[#173022] sm:px-8 md:py-28">
        <div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#66846b]">The opportunity</p><h2 className="mt-5 max-w-4xl font-serif text-4xl leading-tight tracking-[-.045em] sm:text-6xl">You worked hard for every lead.<br/><em className="text-[#64886a]">Make every follow-up count.</em></h2><p className="mt-6 max-w-3xl text-base leading-8 text-[#647367]">Opportunities get buried in disconnected systems. Conversations lose context. Follow-up slips through the cracks. Text2Sale brings your outreach and sales workflows together.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["01","Capture & organize","Bring properly consented contacts into one focused workspace."],["02","Engage intelligently","Create relevant follow-up with context and appropriate controls."],["03","Convert interest","Guide interested prospects toward conversations and appointments."],["04","See what works","Review delivery outcomes, responses, and appointment activity."]].map(([n,h,b])=><article key={n} className="rounded-lg border border-[#dae4d9] bg-white p-6"><span className="font-serif text-3xl text-[#a59469]">{n}</span><h3 className="mt-5 text-lg font-semibold">{h}</h3><p className="mt-3 text-sm leading-7 text-[#687b6c]">{b}</p></article>)}</div>
        </div>
      </section>

      <section id="product" className="px-5 py-20 sm:px-8 md:py-28">
        <div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#d8c298]">The Text2Sale advantage</p><h2 className="mt-5 font-serif text-4xl leading-tight tracking-[-.045em] sm:text-6xl">Powerful by design.<br/><em className="text-[#b6d9b7]">Effortless by intention.</em></h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">{[
            [Sparkles,"AI that respects context","Configure AI with your scripts and goals, review previous conversations, and keep the human in control."],
            [MessageSquare,"Conversations that move forward","Keep two-way messaging, outreach, contact history, and calling in one connected workspace."],
            [BarChart3,"Clarity behind every send","Understand messaging status, responses, and campaign performance rather than relying on send counts alone."],
            [Upload,"Your leads, organized","Import contacts, map fields, manage lists, and identify the right next step."],
            [Workflow,"Flexible follow-up","Build sequences with personalized messaging, waiting steps, and opt-out handling."],
            [ShieldCheck,"Responsible messaging tools","Use consent records, suppression tools, quiet hours, and guided 10DLC registration. Carrier delivery is not guaranteed."]
          ].map(([Icon,h,b])=><article key={h as string} className="rounded-xl border border-[#6d9275]/30 bg-[#12281c] p-7 transition hover:border-[#a7cba4]/65"><Icon size={26} className="text-[#c2d9ac]"/><h3 className="mt-6 text-lg font-semibold">{h as string}</h3><p className="mt-3 text-sm leading-7 text-[#a8bcae]">{b as string}</p></article>)}</div>
        </div>
      </section>

      <section id="solutions" className="bg-[#f1f4ee] px-5 py-20 text-[#173022] sm:px-8 md:py-24"><div className="mx-auto max-w-5xl text-center"><p className="text-xs font-bold uppercase tracking-[.24em] text-[#67846d]">Made for your industry</p><h2 className="mt-5 font-serif text-4xl tracking-[-.045em] sm:text-6xl">Built around the way<br/><em className="text-[#65896b]">real businesses sell.</em></h2><div className="mt-9 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose industry">{(Object.keys(industries) as Industry[]).map(name=><button key={name} onClick={()=>setIndustry(name)} aria-pressed={industry===name} className={`rounded-md border px-5 py-3 text-sm transition ${industry===name?"border-[#244b31] bg-[#244b31] text-white":"border-[#d0ddd0] bg-white text-[#42604a] hover:border-[#6c9571]"}`}>{name}</button>)}</div><div className="mx-auto mt-5 max-w-3xl rounded-xl border border-[#dce6d9] bg-white p-8 text-left sm:p-10"><span className="text-xs font-bold uppercase tracking-[.18em] text-[#64896b]">{industry} solutions</span><h3 className="mt-4 font-serif text-3xl tracking-tight sm:text-4xl">{industries[industry].heading}</h3><p className="mt-4 text-base leading-8 text-[#637669]">{industries[industry].body}</p><Link className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#30683f]" href={industries[industry].href}>Explore this solution <ArrowUpRight size={16}/></Link></div></div></section>

      <AppointmentDemo />
      <FoundingAgentOffer />
      <section className="px-5 py-20 text-center sm:px-8 md:py-28" style={{background:"radial-gradient(ellipse at 50% 5%, #20492f, #08150f 70%)"}}><p className="text-xs font-bold uppercase tracking-[.24em] text-[#e0c99d]">The future of follow-up starts here</p><h2 className="mx-auto mt-5 max-w-5xl font-serif text-4xl leading-tight tracking-[-.045em] sm:text-6xl">Don't just manage leads.<br/><em className="text-[#c1dfbf]">Move business forward.</em></h2><p className="mx-auto mt-6 max-w-xl text-base leading-8 text-[#b5c9b8]">Bring clarity, consistency, and intelligence to your next customer conversation.</p><div className="mt-9 flex flex-wrap justify-center gap-3"><button onClick={onSignup} className="inline-flex items-center gap-2 rounded-md bg-[#d8e9d1] px-7 py-4 text-sm font-bold text-[#102619] hover:bg-white">Get started <ArrowUpRight size={17}/></button><a href="#pricing" className="inline-flex items-center gap-2 rounded-md border border-[#91b197]/50 px-7 py-4 text-sm font-semibold text-white hover:bg-white/10">View plans <ArrowDown size={17}/></a></div><p className="mt-6 text-xs text-[#91a894]"><Check size={14} className="mr-1 inline"/> Appropriate consent required · Carrier and registration rules apply</p></section>
    </div>
  );
}
