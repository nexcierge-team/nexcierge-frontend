import { cardStrings } from "@/lib/cardStrings";
import { AGENT } from "@/lib/landingContent";
import { AgentConsole, type FileGroup } from "./AgentConsole";
import { InView } from "./InView";
import { SectionHead } from "./SectionHead";
import { SECTION } from "./styles";

// The nine fields a brief needs before it can go to an account manager
// (the canonical definition is the `rfqs.is_complete` generated column).
// Labels come from the same table the real brief card uses, so the
// preview and the product can't drift apart. Resolved here on the server
// so the client island doesn't ship the whole i18n table.
function fileGroups(language: string): FileGroup[] {
  const s = cardStrings(language);
  return [
    {
      title: s.sectionMachine,
      labels: [s.labelType, s.labelApplication, s.labelQuantity],
    },
    {
      title: s.sectionDelivery,
      labels: [s.labelCountry, s.labelCityPort, s.labelTimeline],
    },
    {
      title: s.sectionBuyer,
      labels: [s.labelName, s.labelCompany, s.labelEmail],
    },
  ];
}

// Sheet 4. Not a demo: the composer is real, and whatever the visitor
// sends first opens the live agent on /chat with that message already on
// its way. Nothing here creates a session, so scrolling past costs nothing.
export function Agent() {
  return (
    <section id="agent" className={SECTION}>
      <InView kind="draw" className="sheet-rule" />
      <div className="wrap">
        <SectionHead title={AGENT.title} lead={AGENT.lead} />
        <AgentConsole
          fileGroups={{ en: fileGroups("en"), zh: fileGroups("zh") }}
        />
      </div>
    </section>
  );
}
