import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY, CONTACT, LegalDoc } from "../components/LegalDoc";

export const metadata: Metadata = { title: "Privacy policy · e-Tekisi" };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy policy" updated="20 October 2026">
      <p>
        This policy explains what personal information e-Tekisi collects, why, who sees it, how long we keep it and
        your rights under the Protection of Personal Information Act, 2013 (POPIA). The responsible party is {COMPANY}.
      </p>

      <h2>What we collect and why</h2>
      <table>
        <thead>
          <tr>
            <th>Information</th>
            <th>Why we need it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Name, email address, phone number, password (stored only as a one-way hash)</td>
            <td>To create and secure your account, verify it is yours, and contact you about your trips.</td>
          </tr>
          <tr>
            <td>Drivers: taxi plate, driver&apos;s licence number and the documents you upload</td>
            <td>To check you may legally operate before you can take trips.</td>
          </tr>
          <tr>
            <td>Trips: pick-up, destination, times, fare, tip, offers and ratings</td>
            <td>To arrange and complete the trip and keep a record of it.</td>
          </tr>
          <tr>
            <td>Location: drivers&apos; position while online; GPS during a trip</td>
            <td>
              To show nearby taxis (as approximate positions, without identifying drivers), match trips, estimate
              arrival times and for safety alerts.
            </td>
          </tr>
          <tr>
            <td>Wallet top-ups, fares, payouts, and drivers&apos; bank or eWallet details (encrypted)</td>
            <td>To move money correctly and keep financial records we are required to keep.</td>
          </tr>
          <tr>
            <td>Chat messages between you and your driver or commuter</td>
            <td>So you can coordinate the trip, and to investigate complaints or safety incidents.</td>
          </tr>
          <tr>
            <td>Safety alerts (for example when the panic button is pressed)</td>
            <td>So our operators can respond, and as evidence if something goes wrong.</td>
          </tr>
          <tr>
            <td>Technical logs (IP address, device and error information)</td>
            <td>To keep the service secure, stop abuse such as password guessing, and fix problems.</td>
          </tr>
        </tbody>
      </table>
      <p>
        We process this information because it is needed to provide the service you asked for, to meet our legal
        obligations, and for our legitimate interest in keeping the service safe. We do not sell personal information
        and do not use it for advertising.
      </p>

      <h2>Who can see it</h2>
      <ul>
        <li>Your commuter or driver for a trip sees your name and the trip details, and the chat for that trip.</li>
        <li>Our operators see what they need to vet drivers, handle payouts and respond to safety alerts.</li>
        <li>
          Service providers who process information for us under contract: hosting [provider, country], email
          delivery [provider], SMS delivery [provider], and map services (OpenStreetMap-based). [List each, and say
          where any of them store data outside South Africa and on what basis.]
        </li>
        <li>
          People you share a trip with: if you use &quot;Share my trip&quot;, anyone with the link sees your first name,
          your pick-up and destination, the taxi&apos;s plate and live position and the driver&apos;s first name, until the
          trip ends, the link expires (12 hours) or you stop sharing.
        </li>
        <li>Authorities, when the law requires it or to protect someone&apos;s safety.</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>Trip GPS history: 90 days, except for trips with a safety alert, which we keep as evidence.</li>
        <li>Drivers&apos; last known position: 7 days after they were last online.</li>
        <li>Chat messages: 180 days.</li>
        <li>Notifications: 90 days.</li>
        <li>
          Trip and payment records: [5] years, as required for financial records. When you delete your account they
          are kept without your name and contact details.
        </li>
        <li>Backups: up to [14] days on our servers and [90] days off-site, encrypted.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Connections are encrypted (HTTPS). Passwords are stored as one-way hashes, bank details are encrypted, and
        backups are encrypted. Staff access is limited to what their job needs. If a breach puts your information at
        risk we will tell you and the Information Regulator as POPIA requires.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <b>Access:</b> download everything we hold about you from your profile (&quot;Download my data&quot;).
        </li>
        <li>
          <b>Correction:</b> contact us to correct information that is wrong.
        </li>
        <li>
          <b>Deletion:</b> delete your account from your profile (&quot;Delete my account&quot;). Your name, contact
          details, chat messages and saved places are removed; financial records are kept without them.
        </li>
        <li>
          <b>Objection and complaints:</b> contact our Information Officer: {CONTACT}. You may also complain to the
          Information Regulator (South Africa): https://inforegulator.org.za, complaints.IR@inforegulator.org.za.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>
        If we change this policy we will ask you to read and accept the new version when you next open the app. See
        also the <Link href="/terms" className="underline">terms of use</Link>.
      </p>
    </LegalDoc>
  );
}
