import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, CONTACT, LegalDoc } from "../components/LegalDoc";

export const metadata: Metadata = { title: "Terms of use · e-Tekisi" };

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of use" updated="20 October 2026">
      <p>
        These terms are an agreement between you and {COMPANY} (&quot;e-Tekisi&quot;, &quot;we&quot;) for using the
        e-Tekisi app and website. By creating an account you accept them, together with the{" "}
        <Link href="/privacy" className="underline">privacy policy</Link>. Drivers also accept the{" "}
        <Link href="/driver-agreement" className="underline">driver agreement</Link>.
      </p>

      <h2>What e-Tekisi does</h2>
      <p>
        e-Tekisi connects commuters with minibus-taxi drivers. A commuter requests a trip, a driver offers a fare, and
        the trip goes ahead only if the commuter accepts that fare. [State clearly whether e-Tekisi is the transport
        operator or a booking platform; the driver agreement assumes the driver and their operator provide the
        transport.]
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least [18] years old and give true details.</li>
        <li>Keep your password to yourself. You are responsible for what is done with your account.</li>
        <li>You need to verify your email address or phone number before you can book or pay.</li>
        <li>You can delete your account at any time from your profile.</li>
      </ul>

      <h2>Fares, wallet and payments</h2>
      <ul>
        <li>You are charged the fare (and any tip) you accepted, from your wallet, when you accept the offer.</li>
        <li>
          Wallet money can only be used for trips on e-Tekisi. [Set out refunds of unused wallet balances, fees, and
          the payment provider used.]
        </li>
        <li>
          If a trip doesn&apos;t happen after you paid, contact us at [support contact] and we will look into a refund.
          [Set out the refund and dispute process and timelines.]
        </li>
      </ul>

      <h2>Safety and conduct</h2>
      <ul>
        <li>Treat drivers, commuters and our staff with respect. No harassment, threats or discrimination.</li>
        <li>
          The panic button alerts our operators. It is not a replacement for emergency services: in an emergency call
          10111 (police) or 112 from a mobile phone.
        </li>
        <li>Don&apos;t misuse the app: no fake bookings, fraud, or attempts to break or overload it.</li>
        <li>We may suspend or close accounts that break these terms or put others at risk.</li>
      </ul>

      <h2>Liability</h2>
      <p>
        [Limitation of liability, consumer rights under the Consumer Protection Act, and the extent to which e-Tekisi
        is or is not responsible for the transport itself. To be drafted by a lawyer.]
      </p>

      <h2>Changes and contact</h2>
      <p>
        We will ask you to accept new versions of these terms in the app before they apply to you. Questions:{" "}
        {CONTACT}. These terms are governed by the law of South Africa.
      </p>
    </LegalDoc>
  );
}
