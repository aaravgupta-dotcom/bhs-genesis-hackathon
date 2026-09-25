"use client"

import EngravedTicket from "@/components/ui/engraved-ticket"

export default function Demo() {
  // w-full is load-bearing: 21st centres every demo in a flex wrapper, and a
  // flex item left at width:auto shrinks to fit its contents — which, with a
  // child asking for 100%, resolves to 0px wide.
  return (
    <div className="flex w-full flex-col items-center gap-10 bg-[#0b0a0a] px-4 py-16 sm:px-10">
      <EngravedTicket variant="paper" />
      <EngravedTicket variant="crimson" />
      <p className="text-center text-xs uppercase tracking-[0.3em] text-neutral-500">
        Hold a ticket to breathe in &middot; let go to breathe out &middot; tap to re-spray
      </p>
    </div>
  )
}
