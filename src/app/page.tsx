import Image from "next/image";
import Link from "next/link";
import { InkTrail } from "@/components/ink-trail";

export default function LandingPage() {
  return (
    <main className="relative isolate grid min-h-screen place-items-center bg-[#F7F8F3] px-5 text-[#181818]">
      <InkTrail />
      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <Link href="/" className="flex items-center gap-3 text-3xl font-black sm:text-4xl">
          <Image src="/canvas-ratio.png" alt="" width={52} height={52} className="h-12 w-12 rounded-full border-2 border-[#1A1A1A] bg-white object-cover" />
          Canvas Ratio
        </Link>
        <nav className="flex flex-wrap justify-center gap-4">
          <Link href="/canvas" className="border-2 border-[#1A1A1A] bg-[#EF4444] px-6 py-3 font-black shadow-[4px_4px_0_#1A1A1A] transition hover:bg-[#DC2626]">Open Canvas</Link>
          <Link href="/study-lab" className="border-2 border-[#1A1A1A] bg-[#8BCF3F] px-6 py-3 font-black shadow-[4px_4px_0_#1A1A1A] transition hover:bg-[#6FAF2F]">Study Lab</Link>
          <Link href="/project-files" className="border-2 border-[#1A1A1A] bg-[#6FB6FF] px-6 py-3 font-black shadow-[4px_4px_0_#1A1A1A] transition hover:bg-[#4A9FE8]">Project Files</Link>
          <Link href="/weekly-review" className="border-2 border-[#1A1A1A] bg-[#FFD91A] px-6 py-3 font-black shadow-[4px_4px_0_#1A1A1A] transition hover:bg-[#F4C400]">Weekly Review</Link>
          <Link href="/monthly-review" className="border-2 border-[#1A1A1A] bg-[#22D3EE] px-6 py-3 font-black shadow-[4px_4px_0_#1A1A1A] transition hover:bg-[#06B6D4]">Monthly Review</Link>
          <button type="button" disabled className="cursor-not-allowed border-2 border-[#1A1A1A] bg-[#D946EF] px-6 py-3 font-black text-white opacity-70 shadow-[4px_4px_0_#1A1A1A]">???</button>
        </nav>
      </section>
    </main>
  );
}
