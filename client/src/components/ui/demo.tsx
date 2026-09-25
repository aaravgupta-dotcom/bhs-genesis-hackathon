"use client"

import TigerTearReveal from "@/components/ui/tiger-tear-reveal"

export default function Demo() {
  return (
    // w-full: 21st centres demos in a flex wrapper that would shrink this to 0px.
    <div className="w-full">
      <TigerTearReveal />
      <section className="flex h-[60svh] w-full items-center justify-center bg-[#f2f1ee] px-6 text-center">
        <p className="max-w-md font-mono text-xs uppercase leading-relaxed tracking-[0.3em] text-neutral-500">
          Scroll back up to close it again.
        </p>
      </section>
    </div>
  )
}
