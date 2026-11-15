import { SCOPE } from "@/lib/landingContent";
import { ScopeSelector } from "./ScopeSelector";
import { SectionHead } from "./SectionHead";
import { SECTION } from "./styles";

// Sheet 7.
export function Scope() {
  return (
    <section id="scope" className={SECTION}>
      <div className="wrap">
        <SectionHead title={SCOPE.title} lead={SCOPE.lead} />
        <ScopeSelector />
      </div>
    </section>
  );
}
