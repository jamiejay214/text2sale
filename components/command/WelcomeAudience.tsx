"use client";
import { useEffect, useState } from "react";

type Audience = {total:number; marketable:number; recent:{email:string;claimed_at:string;marketable:boolean;source:string}[]};
export default function WelcomeAudience({token}:{token:string}) {
  const [data,setData] = useState<Audience | null>(null);
  const [error,setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const res = await fetch("/api/command-center/welcome-offer",{headers:{Authorization:"Bearer "+token},signal:controller.signal});
        if (!res.ok) throw new Error();
        setData(await res.json()); setError("");
      } catch { if (!controller.signal.aborted) setError("Couldn’t refresh the audience."); }
    };
    void refresh();
    const interval = setInterval(() => { if (!document.hidden) void refresh(); },60000);
    return () => {clearInterval(interval);controller.abort();};
  },[token]);
  async function download() {
    try {
      const res = await fetch("/api/command-center/welcome-offer?export=1",{headers:{Authorization:"Bearer "+token}});
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a"); a.href=url; a.download="Text2Sale-10OFF-marketing.csv"; a.click();
      setTimeout(() => URL.revokeObjectURL(url),1000);
    } catch {setError("Couldn’t export the audience. Please retry.");}
  }
  return <section className="rounded-xl border border-white/10 p-4 text-white">
    <h3 className="font-semibold">10OFF audience</h3>
    {data && <><p className="my-2 text-sm">{data.total} unique claims · {data.marketable} eligible for marketing</p>
    <button className="text-sm text-lime-300 underline" onClick={download}>Export marketing emails</button>
    {data.recent.length > 0 && <details className="mt-3"><summary>Recent claims</summary><ul className="mt-2 space-y-1 text-sm">{data.recent.map(row => <li key={row.email}>{row.email} · {new Date(row.claimed_at).toLocaleDateString()} · {row.marketable ? "Marketing eligible" : "Offer only"}</li>)}</ul></details>}</>}
    {!data && !error && <p>Loading audience…</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
