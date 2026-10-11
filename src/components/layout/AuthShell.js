import Link from "next/link";
import CleanLoopLogo from "@/components/CleanLoopLogo";
import { IconCheckCircle } from "@/components/icons";

const HIGHLIGHTS = [
  "Live truck alerts and collection progress for every zone",
  "Routes, crews, and vehicles planned in one place",
  "Issues reported in the field reach operations instantly",
];

/**
 * Split-screen frame for login, registration, and password reset: a brand
 * panel on large screens, and the form on a clean white surface.
 */
export default function AuthShell({ children }) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-loop-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 0% 0%, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0) 60%), radial-gradient(50% 50% at 100% 100%, rgba(5,150,105,0.25) 0%, rgba(5,150,105,0) 60%)",
          }}
          aria-hidden="true"
        />
        <Link href="/" className="relative" aria-label="CleanLoop home">
          <CleanLoopLogo tone="dark" size={34} />
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Cleaner neighbourhoods, run on one connected platform.
          </h2>
          <p className="mt-4 text-base text-loop-300">
            CleanLoop connects residents, operations teams, collection crews,
            and volunteers, from the schedule to the last stop.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-loop-200">
                <IconCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" />
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-loop-500">
          &copy; {new Date().getFullYear()} CleanLoop · Municipal waste operations
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden" aria-label="CleanLoop home">
            <CleanLoopLogo size={30} />
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
