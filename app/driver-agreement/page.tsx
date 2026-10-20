import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, CONTACT, LegalDoc } from "../components/LegalDoc";

export const metadata: Metadata = { title: "Driver agreement · e-Tekisi" };

export default function DriverAgreementPage() {
  return (
    <LegalDoc title="Driver agreement" updated="20 October 2026">
      <p>
        This agreement is between you, as a driver, and {COMPANY}. It adds to the{" "}
        <Link href="/terms" className="underline">terms of use</Link> and the{" "}
        <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>

      <h2>Before you can take trips</h2>
      <ul>
        <li>
          You must hold a valid driver&apos;s licence with a professional driving permit (PrDP), and the vehicle must
          have a valid operating licence for the routes you drive and a roadworthy certificate.
        </li>
        <li>You upload these documents in the app. Our operators check them before approving your account.</li>
        <li>Tell us straight away if any of them expires, is suspended or changes. We may ask for them again.</li>
        <li>[Insurance requirements, taxi association membership, and the operator/owner&apos;s consent if you don&apos;t own the vehicle.]</li>
      </ul>

      <h2>Taking trips</h2>
      <ul>
        <li>You set the fare in your offer. The commuter pays it only if they accept.</li>
        <li>Only accept trips you can complete, and drive safely and lawfully.</li>
        <li>While you are online, your location is shared with e-Tekisi to match trips. Commuters see only an approximate position of nearby taxis, without your identity, until you are matched.</li>
      </ul>

      <h2>Earnings and payouts</h2>
      <ul>
        <li>Fares for completed trips are added to your e-Tekisi balance. [Commission or fees, if any.]</li>
        <li>
          You can request a payout to your bank account or eWallet. Our operators approve and pay it within [number]
          business days. Bank details are stored encrypted.
        </li>
        <li>You are responsible for your own tax. [Whether e-Tekisi issues statements.]</li>
      </ul>

      <h2>Suspension</h2>
      <p>
        We may suspend your account if your documents lapse, if there are serious complaints or safety incidents, or
        if you break this agreement. We will tell you why, and you can ask us to review the decision: {CONTACT}.
      </p>

      <h2>Your relationship with e-Tekisi</h2>
      <p>[Independent contractor or other relationship; to be drafted by a lawyer.]</p>
    </LegalDoc>
  );
}
