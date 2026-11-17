import type { Digest } from "./digest";

interface DeployDigestProps {
  digest: Digest;
  activeId: string | null;
  onActivate: (id: string | null) => void;
}

export const DeployDigest = ({ digest, activeId, onActivate }: DeployDigestProps) => (
  <section aria-labelledby="digest-headline" className="grid gap-6 lg:grid-cols-12 lg:gap-10">
    <h1
      id="digest-headline"
      className="text-balance text-[1.75rem] leading-[1.1] font-bold tracking-[-0.025em] text-ink sm:text-[2.125rem] lg:col-span-6 lg:text-[2.5rem]"
    >
      {digest.headline}
    </h1>
    {digest.claims.length > 0 && (
      <ul className="space-y-1 text-[1.0625rem] leading-relaxed text-body lg:col-span-6 lg:pt-1">
        {digest.claims.map((claim) => (
          <li
            key={claim.deployId}
            className={`-mx-3 rounded-block px-3 py-2 transition-colors duration-150 ease-out ${
              claim.deployId === activeId ? "bg-highlight" : ""
            }`}
          >
            <a
              href={`#deploy-${claim.deployId}`}
              onMouseEnter={() => onActivate(claim.deployId)}
              onMouseLeave={() => onActivate(null)}
              onFocus={() => onActivate(claim.deployId)}
              onBlur={() => onActivate(null)}
              className="font-semibold text-ink underline decoration-line-strong transition-[text-decoration-color] duration-150 ease-out hover:decoration-ink"
            >
              {claim.subject}
            </a>{" "}
            {claim.text}
          </li>
        ))}
      </ul>
    )}
  </section>
);
