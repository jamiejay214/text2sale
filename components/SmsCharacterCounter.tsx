"use client";

import { useMemo, useState } from "react";

const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüà".split(""),
);
const GSM_EXTENDED = new Set("^{}\\[~]|€".split(""));

function analyzeMessage(value: string) {
  let gsmUnits = 0;
  let usesUnicode = false;

  for (const character of value) {
    if (GSM_BASIC.has(character)) gsmUnits += 1;
    else if (GSM_EXTENDED.has(character)) gsmUnits += 2;
    else usesUnicode = true;
  }

  const characters = Array.from(value).length;
  const units = usesUnicode ? characters : gsmUnits;
  const singleLimit = usesUnicode ? 70 : 160;
  const multipartLimit = usesUnicode ? 67 : 153;
  const segments = units === 0 ? 0 : units <= singleLimit ? 1 : Math.ceil(units / multipartLimit);
  const currentLimit = segments <= 1 ? singleLimit : segments * multipartLimit;

  return {
    characters,
    encoding: usesUnicode ? "Unicode (UCS-2)" : "GSM-7",
    segments,
    remaining: currentLimit - units,
    nextSegmentAt: segments === 0 ? singleLimit : currentLimit + 1,
  };
}

const SAMPLE = "Hi Alex, this is Jamie with Text2Sale. Are you still looking for help? Reply STOP to opt out.";

export default function SmsCharacterCounter() {
  const [message, setMessage] = useState("");
  const result = useMemo(() => analyzeMessage(message), [message]);

  return (
    <div className="rounded-[2rem] border border-emerald-400/20 bg-zinc-950/80 p-5 shadow-2xl shadow-emerald-950/30 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Free tool</p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">SMS character & segment counter</h2>
        </div>
        <button
          type="button"
          onClick={() => setMessage(SAMPLE)}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-emerald-300 hover:text-emerald-200"
        >
          Load an example
        </button>
      </div>

      <label htmlFor="sms-message" className="mt-7 block text-sm font-bold text-zinc-200">
        Paste or write your text message
      </label>
      <textarea
        id="sms-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Type your campaign message here..."
        rows={7}
        className="mt-2 w-full resize-y rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-base leading-7 text-white outline-none placeholder:text-zinc-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        {[
          ["Characters", result.characters],
          ["SMS segments", result.segments],
          ["Encoding", result.encoding],
          ["Space in current limit", result.remaining],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
            <p className="mt-2 text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
        {result.encoding === "Unicode (UCS-2)"
          ? "This message contains an emoji or another character outside GSM-7, so each segment has a lower character limit."
          : "This message uses GSM-7. Some characters such as ^, {, }, [, ], ~, |, \\ and € count as two units."}
        {result.segments > 0 ? ` The next segment begins at unit ${result.nextSegmentAt}.` : " Start typing to calculate the segment count."}
      </div>
    </div>
  );
}
