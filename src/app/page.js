import Link from "next/link";
import CleanLoopLogo from "@/components/CleanLoopLogo";
import RouteMap from "@/components/RouteMap";
import Reveal from "@/components/Reveal";
import {
  IconHouse,
  IconClipboard,
  IconTruck,
  IconLeaf,
  IconFlag,
  IconRoute,
  IconCheckCircle,
  IconRefresh,
} from "@/components/icons";

// --- Content data ------------------------------------------------------
// Kept as plain arrays at the top of the file (rather than inline in JSX)
// so copy can be edited without hunting through markup.

const ROLES = [
  {
    icon: IconHouse,
    code: "R-01",
    title: "Resident",
    tag: "Report it once, track it to close",
    desc: "Flag a missed pickup, an overflowing bin, or a hazard from your phone in under a minute. Every report carries a photo, a location pin, and a status you can watch move.",
    features: [
      "Photo + location reports in under 60 seconds",
      "Live status from received to resolved",
      "Collection calendar with change alerts",
    ],
  },
  {
    icon: IconClipboard,
    code: "O-02",
    title: "Operations",
    tag: "One queue, not five inboxes",
    desc: "Every resident report and crew flag lands in a single triage queue, pre-sorted by street and urgency, so nothing sits unassigned because it fell down someone's inbox.",
    features: [
      "Auto-sorted complaint queue by zone",
      "Drag-to-reassign scheduling board",
      "Escalation rules for overdue stops",
    ],
  },
  {
    icon: IconTruck,
    code: "C-03",
    title: "Collection crew",
    tag: "The route, the stops, the hazards",
    desc: "Crews open one screen at the start of a shift: today's stops in order, any hazard flags raised on that street, and a single tap to confirm each collection as it happens.",
    features: [
      "Turn-by-turn stop sequencing",
      "One-tap hazard and skip flags",
      "Offline mode for low-signal routes",
    ],
  },
  {
    icon: IconLeaf,
    code: "V-04",
    title: "Volunteer",
    tag: "Turn the loop into a movement",
    desc: "Organize recycling drives and cleanup days, recruit neighbors by street, and see the tonnage your community has diverted — turning individual reports into collective impact.",
    features: [
      "Drive scheduling with RSVP tracking",
      "Street-level volunteer recruitment",
      "Community impact leaderboard",
    ],
  },
];

const STEPS = [
  {
    icon: IconFlag,
    num: "01",
    title: "Report",
    desc: "A resident flags a missed pickup or hazard with a photo and pin.",
  },
  {
    icon: IconRoute,
    num: "02",
    title: "Route",
    desc: "Operations triages it into the right zone and the next crew run.",
  },
  {
    icon: IconTruck,
    num: "03",
    title: "Collect",
    desc: "The crew confirms the stop on-site, hazard flags included.",
  },
  {
    icon: IconRefresh,
    num: "04",
    title: "Close the loop",
    desc: "The resident is notified, and volunteers get the data for the next drive.",
  },
];

const STATS = [
  { value: "01", unit: "loop", label: "platform, four connected roles" },
  { value: "<60", unit: "sec", label: "average time to file a report" },
  { value: "100", unit: "%", label: "reports visible to operations in real time" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* ================================================================
          HERO — dark "ink" surface, film-grain + emerald glow for the
          cinematic read, RouteMap as the signature element on the right.
      ================================================================= */}
      <div className="relative overflow-hidden bg-loop-900 bg-hero-glow grain">
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-12">
          <CleanLoopLogo tone="dark" />
          <nav className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary-on-dark">
              Log in
            </Link>
            <Link href="/register" className="btn-primary">
              Create account
            </Link>
          </nav>
        </header>

        <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-8 md:grid-cols-2 md:px-12 md:pb-28">
          <div>
            <span className="badge border border-white/15 text-loop-400">
              SDG 11 · Sustainable cities &nbsp;·&nbsp; SDG 12 · Responsible consumption
            </span>

            <h1 className="text-balance mt-5 font-display text-5xl font-bold leading-[1.05] text-loop-50 md:text-6xl">
              One loop, four roles,
              <br />
              no missed collection.
            </h1>

            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-loop-400">
              CleanLoop connects residents, operations staff, collection crews, and
              community volunteers on a single platform — so a reported issue
              reaches the right person the moment it&rsquo;s raised, and stays
              visible until it&rsquo;s resolved.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                Get started
              </Link>
              <Link href="/login" className="btn-secondary-on-dark">
                I already have an account
              </Link>
            </div>

            {/* Manifest-style stat strip — mono type doing its one job:
                signaling "this is data," not marketing copy. */}
            <dl className="mt-10 flex max-w-md gap-8 border-t border-white/10 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-mono text-2xl font-medium text-loop-50">
                    {s.value}
                    <span className="text-sm text-brand-400">{s.unit}</span>
                  </dd>
                  <dd className="manifest-label mt-1 max-w-[9rem] normal-case tracking-normal text-loop-400">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-center md:justify-end">
            <RouteMap />
          </div>
        </section>
      </div>

      {/* ================================================================
          ABOUT — light "paper" surface, deliberate contrast cut against
          the dark hero above.
      ================================================================= */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-12 md:py-28">
        <Reveal>
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
            <div>
              <p className="manifest-label text-loop-500">About CleanLoop</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-loop-950 md:text-4xl">
                Built for the gap between a report and a resolution.
              </h2>
            </div>
            <div className="space-y-4 text-[15px] leading-relaxed text-loop-500">
              <p>
                Most missed collections aren&rsquo;t missed because no one
                reported them. They&rsquo;re missed because the report went into
                a call log, the call log wasn&rsquo;t read until Monday, and by
                then the truck had already passed that street. CleanLoop closes
                that gap by putting every role that touches a collection —
                resident, operations, crew, volunteer — on one shared timeline
                instead of four disconnected ones.
              </p>
              <p>
                The platform was built around a simple constraint: a report is
                only useful if the person who can act on it sees it before the
                next scheduled run. Every screen in CleanLoop, from the
                resident&rsquo;s report form to the crew&rsquo;s stop list, is
                designed against that one deadline.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================================================================
          ROLES — four detailed role cards.
      ================================================================= */}
      <section className="bg-loop-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <Reveal>
            <p className="manifest-label text-loop-500">Four roles, one timeline</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold text-loop-950 md:text-4xl">
              Everyone sees the part of the loop that&rsquo;s theirs.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {ROLES.map((role, i) => (
              <Reveal key={role.title} delay={i * 90}>
                <article className="card h-full">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <role.icon />
                    </span>
                    <span className="manifest-label text-loop-300">{role.code}</span>
                  </div>

                  <h3 className="mt-5 font-display text-xl font-bold text-loop-950">
                    {role.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-loop-700">{role.tag}</p>
                  <p className="mt-3 text-sm leading-relaxed text-loop-500">{role.desc}</p>

                  <ul className="mt-5 space-y-2 border-t border-loop-200 pt-4">
                    {role.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-loop-700">
                        <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-loop-700" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS — genuine 4-step sequence, so numbering is earned.
      ================================================================= */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:px-12 md:py-28">
        <Reveal>
          <p className="manifest-label text-loop-500">How the loop runs</p>
          <h2 className="mt-3 max-w-lg font-display text-3xl font-bold text-loop-950 md:text-4xl">
            Four steps. No handoff drops in between.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.num} delay={i * 100} className="relative">
              <span className="font-mono text-xs text-loop-300">{step.num}</span>
              <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full border border-loop-200 text-loop-700">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-loop-950">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-loop-500">{step.desc}</p>

              {/* Connector line to the next step — hidden on mobile and after the last item. */}
              {i < STEPS.length - 1 && (
                <span className="absolute right-[-1rem] top-[3.25rem] hidden h-px w-8 bg-loop-200 md:block" />
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================================================================
          CTA BAND — back to the dark ink surface, bookending the hero.
      ================================================================= */}
      <section className="bg-loop-900 bg-hero-glow grain">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center md:px-12 md:py-20">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-loop-50 md:text-4xl">
              Your street is already on someone&rsquo;s route.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-loop-400">
              Bring it onto the loop — report the first issue, or set up your
              team&rsquo;s operations queue, in a few minutes.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary">
                Create your account
              </Link>
              <Link href="/login" className="btn-secondary-on-dark">
                Log in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================
          FOOTER
      ================================================================= */}
      <footer className="bg-loop-900">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-12">
          <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <CleanLoopLogo tone="dark" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-loop-400">
                A shared platform for residents, operations, crews, and
                volunteers to keep neighborhood collection on schedule.
              </p>
            </div>

            <FooterColumn
              title="Roles"
              links={["Resident", "Operations", "Collection crew", "Volunteer"]}
            />
            <FooterColumn title="Product" links={["How it works", "Reports", "Routes"]} />
            <FooterColumn title="Company" links={["About", "Contact"]} />
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-loop-400 md:flex-row md:items-center md:justify-between">
            <span>&copy; {new Date().getFullYear()} CleanLoop. All rights reserved.</span>
            <span>Aligned with SDG 11 (Sustainable Cities) &amp; SDG 12 (Responsible Consumption)</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <p className="manifest-label text-loop-400">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((label) => (
          <li key={label}>
            <a href="#" className="text-sm text-loop-300 transition-colors hover:text-loop-50">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}