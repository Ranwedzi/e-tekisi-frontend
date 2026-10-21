"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch, errorMessage } from "../lib/api";
import { useLegal } from "../lib/legal";
import type { Role } from "../lib/types";
import { ChevronIcon, TaxiIcon } from "../components/Icons";
import { LanguagePicker, useT } from "../lib/i18n";

type Field = "fullName" | "email" | "phoneNumber" | "taxiPlate" | "licenseNumber" | "password" | "confirmPassword";

const inputClass = "w-full p-4 bg-[#1A1A1A] text-white rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400";

export default function Register() {
  const router = useRouter();
  const [role, setRole] = useState<Exclude<Role, "OPERATOR" | "ADMIN">>("COMMUTER");
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<Record<Field, string>>({
    fullName: "", phoneNumber: "", email: "", password: "", confirmPassword: "", taxiPlate: "", licenseNumber: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);
  const legal = useLegal();
  const t = useT();

  // A driver must also accept the driver agreement, so re-confirm after switching.
  useEffect(() => setAccepted(false), [role]);

  const set = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const validate = (): Partial<Record<Field, string>> => {
    const e: Partial<Record<Field, string>> = {};
    if (form.fullName.trim().length < 2) e.fullName = t("register.fullNameError");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = t("register.emailError");
    if (!/^[+]?[0-9 ()-]{8,20}$/.test(form.phoneNumber.trim())) e.phoneNumber = t("register.phoneError");
    if (form.password.length < 10) e.password = t("register.passwordError");
    if (form.password !== form.confirmPassword) e.confirmPassword = t("register.mismatch");
    if (role === "DRIVER") {
      const plate = normalisePlate(form.taxiPlate);
      if (!/^[A-Z0-9]{4,10}$/.test(plate)) e.taxiPlate = t("register.plateError");
      if (!form.licenseNumber.trim()) e.licenseNumber = t("register.licenceError");
    }
    return e;
  };

  const handleRegister = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const localErrors = validate();
    setErrors(localErrors);
    setTermsError(accepted ? null : t("register.acceptRequired"));
    if (Object.keys(localErrors).length > 0 || !accepted) return;
    if (!legal) {
      setFormError(t("common.offline"));
      return;
    }

    const base = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
      password: form.password,
      acceptTerms: true,
      termsVersion: legal.version,
    };
    const body =
      role === "DRIVER"
        ? { ...base, taxiPlate: normalisePlate(form.taxiPlate), licenseNumber: form.licenseNumber.trim() }
        : base;

    setSubmitting(true);
    try {
      await apiFetch(role === "COMMUTER" ? "/api/auth/register/commuter" : "/api/auth/register/driver", {
        method: "POST",
        auth: false,
        body,
      });
      router.push(role === "DRIVER" ? "/login?registered=driver" : "/login?registered=1");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors as Partial<Record<Field, string>>);
      } else if (err instanceof ApiError && err.code === "EMAIL_TAKEN") {
        setErrors({ email: t("register.emailTaken") });
      } else if (err instanceof ApiError && err.code === "WEAK_PASSWORD") {
        setErrors({ password: err.message });
      } else if (err instanceof ApiError && err.code === "TERMS_OUTDATED") {
        setAccepted(false);
        setTermsError(t("register.termsOutdated"));
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (f: Field) =>
    errors[f] ? (
      <p id={`${f}-error`} className="text-xs font-bold text-red-600 mt-1 ml-2">
        {errors[f]}
      </p>
    ) : null;

  const input = (f: Field, placeholder: string, type = "text", autoComplete?: string) => (
    <div>
      <input
        type={type}
        autoComplete={autoComplete}
        aria-label={placeholder}
        aria-invalid={!!errors[f]}
        aria-describedby={errors[f] ? `${f}-error` : undefined}
        className={inputClass}
        placeholder={placeholder}
        value={form[f]}
        onChange={set(f)}
      />
      {fieldError(f)}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFD217] flex flex-col items-center justify-center p-4 font-sans">
      <LanguagePicker className="mb-4" />
      <form onSubmit={handleRegister} noValidate className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl flex flex-col items-center">
        <div className="w-20 h-20 bg-[#FFD217] rounded-full flex items-center justify-center mb-4 shadow-inner text-black">
          <TaxiIcon className="w-10 h-10" strokeWidth={2.5} />
        </div>

        <h1 className="text-4xl font-black text-[#1A1A1A] mb-1">e-Tekisi</h1>
        <p className="text-gray-400 text-[13px] font-bold mb-8 tracking-tight text-center">{t("register.tagline")}</p>

        <div className="w-full bg-gray-100 p-1.5 rounded-2xl flex mb-8" role="radiogroup" aria-label={t("register.accountType")}>
          {(["COMMUTER", "DRIVER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${role === r ? "bg-white shadow-sm text-black" : "text-gray-400"}`}
            >
              {r === "COMMUTER" ? t("register.commuter") : t("register.driver")}
            </button>
          ))}
        </div>

        <div className="w-full space-y-4">
          {input("fullName", t("register.fullName"), "text", "name")}
          {input("email", t("register.email"), "email", "email")}
          {input("phoneNumber", t("register.phone"), "tel", "tel")}

          {role === "DRIVER" && (
            <>
              {input("taxiPlate", t("register.plate"))}
              {input("licenseNumber", t("register.licence"))}
            </>
          )}

          <div>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="new-password"
                aria-label={t("form.password")}
                aria-invalid={!!errors.password}
                className={inputClass}
                placeholder={t("register.passwordPlaceholder")}
                value={form.password}
                onChange={set("password")}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-5 text-[10px] font-black text-gray-500 uppercase">
                {showPass ? t("form.hide") : t("form.show")}
              </button>
            </div>
            {fieldError("password")}
          </div>

          {input("confirmPassword", t("register.confirm"), showPass ? "text" : "password", "new-password")}

          <div>
            <label className="flex items-start gap-3 text-xs font-bold text-gray-600 leading-relaxed px-1">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                aria-invalid={!!termsError}
                className="mt-0.5 w-5 h-5 accent-black shrink-0"
              />
              <span>
                {t("register.acceptAll")}{" "}
                <Link href="/terms" target="_blank" className="underline text-black">
                  {t("legal.terms")}
                </Link>
                {role === "DRIVER" && (
                  <>
                    {" · "}
                    <Link href="/driver-agreement" target="_blank" className="underline text-black">
                      {t("legal.driverAgreement")}
                    </Link>
                  </>
                )}
                {" · "}
                <Link href="/privacy" target="_blank" className="underline text-black">
                  {t("legal.privacy")}
                </Link>
              </span>
            </label>
            {termsError && <p className="text-xs font-bold text-red-600 mt-1 ml-2">{termsError}</p>}
          </div>
        </div>

        {formError && (
          <p role="alert" className="w-full text-sm font-bold text-red-600 mt-4 px-2">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#1A1A1A] text-white font-black py-5 rounded-2xl mt-8 shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting ? t("register.creating") : t("register.submit")}
          {!submitting && <ChevronIcon className="w-5 h-5" />}
        </button>
        <p className="text-center mt-6 text-sm font-bold text-gray-400">
          {t("register.haveAccount")}{" "}
          <Link href="/login" className="text-black underline">
            {t("register.login")}
          </Link>
        </p>
      </form>
    </div>
  );
}

/** Same rule as the backend: uppercase, no spaces or dashes. */
function normalisePlate(plate: string): string {
  return plate.replace(/[\s-]/g, "").toUpperCase();
}
