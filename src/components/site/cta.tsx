import { MAIN_SITE_URL } from '@/lib/site';

export function NewsletterCTA() {
  return (
    <section className="mx-auto max-w-[1200px] px-7 pb-7">
      <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-ink px-10 py-10 text-white md:flex-row md:items-center">
        <div className="flex-1">
          <p className="eyebrow eyebrow-dot text-highlight">Free expert audit</p>
          <h3 className="headline-serif mt-3 text-[26px] leading-tight">
            Unlock brand potential &amp; enhance your user experience.
          </h3>
          <p className="mt-2 text-sm text-[#b4b2a9]">
            Design-driven solutions from a multi-disciplinary studio in Jaipur.
          </p>
        </div>
        <a
          href={`${MAIN_SITE_URL}/#connect`}
          className="rounded-full bg-highlight px-[22px] py-2.5 text-[13px] font-medium text-ink transition-opacity hover:opacity-90"
        >
          Connect now →
        </a>
      </div>
    </section>
  );
}

export function InlineCTA() {
  return (
    <aside className="my-12 rounded-xl border-l-4 border-brand bg-warm/60 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="headline-serif text-lg">Work with Trippy Ants</p>
          <p className="text-sm text-stone">Branding, UI/UX, packaging, and visual design that tells your story.</p>
        </div>
        <a href={`${MAIN_SITE_URL}/#connect`} className="btn-mock-dark shrink-0">
          Get in touch →
        </a>
      </div>
    </aside>
  );
}
