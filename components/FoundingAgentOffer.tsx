export default function FoundingAgentOffer() {
  return (
    <section id="founding-agent-offer" className="border-y border-emerald-800 bg-[#102c23] px-6 py-14 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-lime-200">For sales professionals &amp; businesses</p>
        <h2 className="mt-3 text-3xl font-bold">Guided onboarding</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-emerald-100">Get help mapping your lead file, choosing a follow-up sequence and connecting your calendar. Ask support about current onboarding availability before subscribing.</p>
        <ul className="mt-6 grid gap-3 text-base sm:grid-cols-2">
          {["Text2Sale AI + appointment booking", "CRM + campaign automation", "Google Calendar integration", "Priority onboarding after confirmation"].map((feature) => <li key={feature}>✓ {feature}</li>)}
        </ul>
        <p className="mt-6 text-base leading-7 text-emerald-100">Text $39.99/month, Dialer $89.99/month, Complete $119.99/month. Calling, messaging and AI usage are separate. A $500+ wallet purchase unlocks the existing reduced rate of $0.0135 per outbound SMS segment.</p>
        <a href="mailto:support@text2sale.com?subject=Guided%20Onboarding%20Request" className="mt-6 inline-block rounded-xl bg-lime-300 px-6 py-3 font-bold text-emerald-950">Request onboarding help</a>
        <p className="mt-4 text-sm leading-6 text-emerald-200">Support confirms availability and enrollment before priority onboarding is promised. This is a request, not an automatic reservation. There is no free trial.</p>
      </div>
    </section>
  );
}
