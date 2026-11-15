import { SCOPE } from "@/lib/landingContent";
import { InView } from "./InView";
import { ScopeSelector } from "./ScopeSelector";
import { SectionHead } from "./SectionHead";
import { SECTION } from "./styles";

// Sheet 7.
export function Scope() {
  return (
    <section id="scope" className={SECTION}>
      <InView kind="draw" className="sheet-rule" />
      <div className="wrap">
        <SectionHead title={SCOPE.title} lead={SCOPE.lead} />
        <ScopeSelector />
      </div>
    </section>
  );
}
