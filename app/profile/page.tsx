"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequireAuth, useAuthedSession } from "../components/RequireAuth";
import { BackIcon, ChevronIcon, ClockIcon, MoneyIcon, PinIcon, QueueIcon, WalletIcon } from "../components/Icons";
import { Spinner } from "../components/Spinner";
import { apiFetch, errorMessage } from "../lib/api";
import { disablePush, enablePush, forgetPushOnSignOut, pushState, type PushState } from "../lib/push";
import { clearSession, homeFor, signOutTo } from "../lib/session";
import { usePolling } from "../lib/usePolling";
import type { Commuter, Driver, Wallet } from "../lib/types";
import { LanguagePicker, useLocale, useT } from "../lib/i18n";

export default function ProfilePage() {
  return (
    <RequireAuth roles={["COMMUTER", "DRIVER"]}>
      <Profile />
    </RequireAuth>
  );
}

type ProfileData =
  | { kind: "commuter"; user: Commuter; wallet: Wallet }
  | { kind: "driver"; user: Driver };

function Profile() {
  const session = useAuthedSession();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const t = useT();

  usePolling(async () => {
    if (session.role === "DRIVER") {
      setData({ kind: "driver", user: await apiFetch<Driver>(`/api/auth/driver/${session.userId}`) });
    } else {
      const [user, wallet] = await Promise.all([
        apiFetch<Commuter>(`/api/auth/commuter/${session.userId}`),
        apiFetch<Wallet>(`/api/wallet/${session.userId}`),
      ]);
      setData({ kind: "commuter", user, wallet });
    }
  }, 15_000);

  const logout = async () => {
    await forgetPushOnSignOut();
    clearSession();
    router.replace("/login");
  };

  if (!data) return <Spinner label={t("profile.loading")} />;

  const stats =
    data.kind === "driver"
      ? [
          { label: t("profile.trips"), value: String(data.user.tripsCompleted) },
          { label: t("profile.balance"), value: `R${data.user.balance.toFixed(2)}` },
          { label: t("profile.plate"), value: data.user.taxiPlate },
        ]
      : [
          { label: t("profile.trips"), value: String(data.wallet.totalTrips) },
          { label: t("profile.wallet"), value: `R${data.wallet.balance.toFixed(2)}` },
        ];

  return (
    <div className="min-h-screen bg-white p-6 pb-24 font-sans">
      <div className="flex justify-between items-center w-full mb-8">
        <Link href={homeFor(session.role)} className="p-2 bg-gray-50 rounded-xl" aria-label={t("common.backLabel")}>
          <BackIcon />
        </Link>
        <h2 className="font-black text-lg uppercase tracking-tighter">{t("profile.title")}</h2>
        <button onClick={logout} className="text-red-500 font-bold text-xs uppercase">
          {t("nav.logout")}
        </button>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-32 h-32 bg-[#FFD217] rounded-full flex items-center justify-center text-5xl font-black shadow-xl border-4 border-white uppercase">
          {data.user.fullName.charAt(0)}
        </div>
        <h1 className="text-3xl font-black mt-6 text-[#1A1A1A]">{data.user.fullName}</h1>
        <p className="text-gray-400 font-bold">{data.user.email}</p>
        <span className="mt-4 bg-black text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.2em]">
          {data.kind === "driver" ? t("register.driver") : t("register.commuter")}
        </span>
      </div>

      <div className="flex justify-around w-full mt-10 px-4 bg-gray-50 p-7 rounded-[40px] border border-gray-100 shadow-inner">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-[9px] font-black text-gray-400 tracking-[0.2em] mb-1">{s.label}</p>
            <p className="text-xl font-black text-[#1A1A1A]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-3">
        {data.kind === "commuter" ? (
          <>
            <MenuItem href="/wallet" label={t("profile.walletMenu")} icon={<WalletIcon />} />
            <MenuItem href="/history" label={t("history.title")} icon={<ClockIcon />} />
            <MenuItem href="/saved-ranks" label={t("ranks.title")} icon={<PinIcon />} />
          </>
        ) : (
          <>
            <MenuItem href="/driver/earnings" label={t("profile.earningsMenu")} icon={<MoneyIcon />} />
            <MenuItem href="/driver/queue" label={t("nav.queue")} icon={<QueueIcon strokeWidth={2} />} />
          </>
        )}
      </div>

      <Notifications />
      <section className="mt-10" aria-labelledby="language-heading">
        <h3 id="language-heading" className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-3 px-1">
          {t("language.label")}
        </h3>
        <div className="p-5 bg-white border border-gray-100 rounded-[28px] shadow-sm">
          <LanguagePicker />
        </div>
      </section>
      <ChangePassword />
      <SignedInDevices />
      <YourData />
    </div>
  );
}

/** Push notifications on this phone or computer (each device is turned on separately). */
function Notifications() {
  const [state, setState] = useState<PushState | null>(null);
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    pushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      setState(state === "on" ? await disablePush() : await enablePush());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const note: Record<PushState, string> = {
    on: t("push.on"),
    off: t("push.off"),
    blocked: t("push.blocked"),
    unsupported: t("push.unsupported"),
    "disabled-on-server": t("push.disabled"),
  };

  return (
    <section className="mt-10" aria-labelledby="notifications-heading">
      <h3 id="notifications-heading" className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-3 px-1">
        {t("nav.notifications")}
      </h3>
      <div className="p-5 bg-white border border-gray-100 rounded-[28px] shadow-sm flex items-center gap-4">
        <p className="flex-1 text-sm font-bold text-gray-600" role="status">
          {state ? note[state] : t("push.checking")}
        </p>
        {(state === "on" || state === "off") && (
          <button
            role="switch"
            aria-checked={state === "on"}
            aria-label={t("push.switch")}
            disabled={busy}
            onClick={() => void toggle()}
            className={`w-14 h-8 rounded-full p-1 transition shrink-0 disabled:opacity-50 ${state === "on" ? "bg-[#FFD217]" : "bg-gray-200"}`}
          >
            <span className={`block w-6 h-6 rounded-full bg-white shadow transition ${state === "on" ? "translate-x-6" : ""}`} />
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm font-bold text-red-600 mt-2 px-1" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/** Changing the password signs out every session, this one included. */
function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 10) return setError(t("forgot.tooShort"));
    setBusy(true);
    try {
      await apiFetch("/api/me/password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      signOutTo("/login?reason=reset");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <section className="mt-10" aria-labelledby="security">
      <h3 id="security" className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-3 px-1">
        {t("profile.security")}
      </h3>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left p-5 bg-white border border-gray-100 rounded-[28px] shadow-sm active:bg-gray-50 transition font-black text-sm text-gray-800"
        >
          {t("profile.changePassword")}
        </button>
      ) : (
        <form onSubmit={submit} className="p-5 border border-gray-100 rounded-[28px] space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            aria-label={t("profile.currentPassword")}
            placeholder={t("profile.currentPassword")}
            className="w-full p-3 rounded-2xl border border-gray-200"
          />
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            aria-label={t("form.newPassword")}
            placeholder={t("form.newPasswordPlaceholder")}
            className="w-full p-3 rounded-2xl border border-gray-200"
          />
          <p className="text-xs font-bold text-gray-400">{t("profile.signedOutEverywhere")}</p>
          {error && (
            <p className="text-sm font-bold text-red-600" role="status">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className="flex-1 bg-black text-white font-black text-sm py-3 rounded-2xl disabled:opacity-50">
              {busy ? t("common.saving") : t("profile.changePassword")}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-white border border-gray-200 font-black text-sm py-3 rounded-2xl">
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

interface Device {
  device: string;
  signedInAt: string;
  lastActiveAt: string;
}

/** Where this account is signed in, and a way to sign out of all of them (e.g. a lost phone). */
function SignedInDevices() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const { t, tag } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<Device[]>("/api/me/sessions")
      .then((d) => alive && setDevices(d))
      .catch(() => alive && setDevices([]));
    return () => {
      alive = false;
    };
  }, []);

  const signOutEverywhere = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/me/sessions/revoke-all", { method: "POST" });
      signOutTo("/login?reason=everywhere");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const when = (iso: string) =>
    new Date(iso).toLocaleString(tag, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <section className="mt-10" aria-labelledby="devices-heading">
      <h3 id="devices-heading" className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-3 px-1">
        {t("devices.title")}
      </h3>
      <div className="p-5 bg-white border border-gray-100 rounded-[28px] shadow-sm space-y-3">
        {devices === null ? (
          <p className="text-sm font-bold text-gray-400">{t("common.loadingDots")}</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d, i) => (
              <li key={i} className="flex justify-between gap-3 text-sm">
                <span className="font-black text-gray-800">{d.device}</span>
                <span className="font-bold text-gray-400 text-right">{t("devices.active", { when: when(d.lastActiveAt) })}</span>
              </li>
            ))}
          </ul>
        )}
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="text-red-500 font-black text-xs uppercase">
            {t("devices.signOutAll")}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500">{t("devices.warning")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => void signOutEverywhere()}
                disabled={busy}
                className="flex-1 bg-red-500 text-white font-black text-sm py-3 rounded-2xl disabled:opacity-50"
              >
                {busy ? t("devices.signingOut") : t("devices.signOutAll")}
              </button>
              <button onClick={() => setConfirming(false)} className="flex-1 bg-white border border-gray-200 font-black text-sm py-3 rounded-2xl">
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm font-bold text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

/** POPIA: download everything we hold, or delete the account. */
function YourData() {
  const [downloading, setDownloading] = useState(false);
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setError(null);
    setDownloading(true);
    try {
      const data = await apiFetch<unknown>("/api/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `e-tekisi-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  const deleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError(t("data.passwordNeeded"));
      return;
    }
    setDeleting(true);
    try {
      await apiFetch("/api/me/delete", { method: "POST", body: { password } });
      signOutTo("/login?reason=deleted");
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <section className="mt-10" aria-labelledby="your-data">
      <h3 id="your-data" className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-3 px-1">
        {t("data.title")}
      </h3>
      <div className="space-y-3">
        <button
          onClick={download}
          disabled={downloading}
          className="w-full text-left p-5 bg-white border border-gray-100 rounded-[28px] shadow-sm active:bg-gray-50 transition font-black text-sm text-gray-800 disabled:opacity-50"
        >
          {downloading ? t("data.preparing") : t("data.download")}
        </button>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="w-full text-left p-5 bg-white border border-red-100 rounded-[28px] shadow-sm active:bg-red-50 transition font-black text-sm text-red-600"
          >
            {t("data.delete")}
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="p-5 border border-red-200 bg-red-50 rounded-[28px] space-y-3">
            <p className="text-sm text-red-800 font-bold">
              {t("data.deleteWarning")}
            </p>
            <label className="block">
              <span className="text-xs font-black text-red-800 uppercase tracking-wide">{t("form.password")}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full p-3 rounded-2xl border border-red-200 bg-white"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={deleting}
                className="flex-1 bg-red-600 text-white font-black text-sm py-3 rounded-2xl disabled:opacity-50"
              >
                {deleting ? t("data.deleting") : t("data.deleteConfirm")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setPassword("");
                  setError(null);
                }}
                className="flex-1 bg-white border border-gray-200 font-black text-sm py-3 rounded-2xl"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}
        {error && (
          <p className="text-sm font-bold text-red-600 px-1" role="status">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function MenuItem({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[28px] shadow-sm active:bg-gray-50 transition">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-gray-50 rounded-2xl text-gray-600">{icon}</div>
        <span className="font-black text-sm text-gray-800 tracking-tight">{label}</span>
      </div>
      <ChevronIcon className="w-4 h-4 text-gray-300" />
    </Link>
  );
}
