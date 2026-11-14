import Image from "next/image";
import { ArrowDown, ArrowUpRight, CalendarCheck2 } from "lucide-react";
import "./insurance-agent.css";

export default function InsuranceHero() {
  return <section className="ia-hero" aria-labelledby="insurance-headline">
    <div className="ia-grid"><div className="ia-copy">
      <p className="ia-kicker"><span />CRM for insurance agents</p>
      <h1 id="insurance-headline">Their quote.<br />Your next <em>conversation.</em></h1>
      <p className="ia-intro">When a prospect texts “after lunch works,” keep the reply, quote notes, and callback together. Text2Sale helps your agency pick up exactly where you left off.</p>
      <div className="ia-actions"><a href="#quote-walkthrough">Try the walkthrough <ArrowDown size={17}/></a><a href="/pricing">Compare plans <ArrowUpRight size={16}/></a></div>
    </div><figure className="ia-photo"><Image src="/home/client-meeting.jpg" alt="An agent greeting a client at a meeting" width={960} height={720} priority sizes="(max-width: 760px) 90vw, 42vw"/>
      <figcaption><div className="ia-icon"><CalendarCheck2 size={24}/></div><div><small>Sample callback</small><strong>Taylor · Today at 2:30</strong><span>“After lunch works.”</span></div></figcaption>
    </figure></div>
  </section>;
}
