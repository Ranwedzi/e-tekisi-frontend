# Languages

The commuter and driver screens are available in English, isiZulu, Sesotho,
Afrikaans and Xitsonga. People choose under Profile → Language, or on the
sign-in and sign-up pages. The choice is kept per device. On a first visit
the app follows the phone's language when it's one of these.

**The isiZulu, Sesotho, Afrikaans and Xitsonga texts are first drafts. They
must be read by a native speaker before release.** They were written without
one. Expect awkward phrasing and wrong word choices, especially in Xitsonga
and Sesotho; the taxi and wallet vocabulary in particular should match what
people actually say at the rank.

## What is and isn't translated

| Translated | Still English |
|---|---|
| Every commuter and driver screen, the account-recovery pages, the trip-sharing page | The operations console (`/ops`), used by staff |
| Toasts, dialogs and form errors in the app | Terms of use, privacy policy and driver agreement: legal texts need a qualified translation |
| Common error codes from the backend (`error.*` keys) | Other backend error text, and notification messages written by the backend (offers, arrivals, payouts) |

## How it works

- `app/i18n/en.ts` holds the English source text, about 480 messages. Its keys are
  the only valid ones: `t("home.requestTaxi")` fails to compile if the key
  doesn't exist.
- Each other language has its own file (`zu.ts`, `st.ts`, `af.ts`, `ts.ts`).
  A message missing there shows in English.
- `{placeholders}` are filled in at runtime and must appear in every
  translation (`"Offer of R{amount} sent…"`).
- `app/lib/i18n.tsx` provides `useT()` / `useLocale()` and the `<LanguagePicker>`
  component, and `translateNow()` for code outside components.

## Reviewing a language

1. Give the reviewer the language file next to `en.ts`. Each key says where the text
   appears (`home.*` is the commuter home screen, `driver.*` the driver
   dashboard, `wallet.*` the wallet, and so on).
2. Ask them to keep placeholders and the brand name (e-Tekisi) as they are.
   Keep button labels short, because they share a phone-width line.
3. Check their changes on a phone: Profile → Language.

## Adding text

Add the English message to `app/i18n/en.ts`, use it with `t("area.key")`,
and add it to the other four files, or leave it out of them so it shows in
English until it's translated.
