import { LoginTrigger } from "@/components/auth/LoginTrigger";
import { ACCOUNT } from "@/lib/landingContent";
import { InView } from "./InView";
import { OrderHistory } from "./OrderHistory";
import { H2, LEAD, SECTION } from "./styles";

export function FactList({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ul className="border-t border-rule-strong">
      {items.map((f) => (
        <li
          key={f.title}
          className="grid gap-1 border-b border-rule-strong py-4"
        >
          <b className="type-title font-bold">{f.title}</b>
          <span className="text-ink-soft">{f.text}</span>
        </li>
      ))}
    </ul>
  );
}

// Sheet 5. "Log in" uses the app's own sign-in modal (LoginTrigger); a
// buyer who is already signed in gets a link into their account instead.
export function Account() {
  return (
    <section id="account" className={SECTION}>
      <InView kind="draw" className="sheet-rule" />
      <div className="wrap grid gap-[clamp(28px,5vw,64px)] min-[960px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[960px]:items-start">
        <div className="grid content-start gap-[22px]">
          <InView kind="plot" as="h2" className={H2}>
            <span className="block">{ACCOUNT.title[0]}</span>
            <span className="block">{ACCOUNT.title[1]}</span>
          </InView>
          <p className={LEAD}>{ACCOUNT.lead}</p>
          <FactList items={ACCOUNT.facts} />
          <div>
            <LoginTrigger
              buttonSize="lg"
              signedInLabel="Open your account"
            >
              {ACCOUNT.cta}
            </LoginTrigger>
          </div>
        </div>
        <OrderHistory />
      </div>
    </section>
  );
}
