"use client";

import { GoogleLogoIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { requestCode, startGoogle, verifyCode, type AuthState, type GoogleState } from "./actions";

export function AuthForm({ mode, googleEnabled = false }: { mode: "login" | "signup"; googleEnabled?: boolean }) {
  const t = useTranslations("auth");
  const [sendState, sendAction, sending] = useActionState(requestCode.bind(null, mode), { step: "email" } as AuthState);
  const [verifyState, verifyAction, verifying] = useActionState(verifyCode, { step: "code" } as AuthState);
  const [googleState, googleAction, googlePending] = useActionState(startGoogle.bind(null, mode), {} as GoogleState);
  const [editingEmail, setEditingEmail] = useState(false);
  const [via, setVia] = useState<"email" | "google">("email");

  // L'action prépare le départ vers Google ; la navigation se fait ici.
  useEffect(() => {
    if (googleState.url) window.location.assign(googleState.url);
  }, [googleState.url]);

  const leavingForGoogle = googlePending || Boolean(googleState.url);
  const googleButton = (
    <Button
      type="submit"
      variant="secondary"
      size="lg"
      disabled={leavingForGoogle}
      formAction={(formData) => {
        setVia("google");
        return googleAction(formData);
      }}
    >
      <GoogleLogoIcon size={20} weight="bold" aria-hidden="true" />
      {t("google")}
    </Button>
  );

  const onCodeStep = sendState.step === "code" && !editingEmail;
  const email = sendState.email ?? "";

  if (onCodeStep) {
    const error = verifyState.error;
    return (
      <form action={verifyAction} className="grid gap-5" noValidate>
        <p className="text-[15px] text-muted" aria-live="polite">
          {t("codeSentTo", { email })}
        </p>
        <input type="hidden" name="email" value={email} />
        <Field
          id="code"
          name="code"
          label={t("code")}
          hint={t("codeHint")}
          error={error ? t(`errors.${error}`) : null}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={10}
          required
          // Le clavier numérique s'ouvre tout de suite : on vient de demander le code.
          // oxlint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className="[&_input]:font-numeric [&_input]:text-[28px] [&_input]:tracking-[0.3em]"
        />
        <Button type="submit" size="lg" disabled={verifying}>
          {t("verify")}
        </Button>
        <button
          type="button"
          onClick={() => setEditingEmail(true)}
          className="justify-self-start text-[15px] font-medium text-accent-text underline-offset-4 hover:underline"
        >
          {t("changeEmail")}
        </button>
      </form>
    );
  }

  const error = via === "google" ? googleState.error : sendState.error;
  return (
    <div className="grid gap-5">
      {googleEnabled && mode === "login" ? (
        <>
          {/* Formulaire à part : la touche Entrée du champ e-mail ne doit pas partir vers Google. */}
          <form className="grid" noValidate>
            {googleButton}
          </form>
          <p className="flex items-center gap-3 text-[13px] text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
            {t("orEmail")}
          </p>
        </>
      ) : null}
      <form
        action={(formData) => {
          setVia("email");
          setEditingEmail(false);
          return sendAction(formData);
        }}
        className="grid gap-5"
        noValidate
      >
        {mode === "signup" ? (
          <Field
            id="invite"
            name="invite"
            label={t("inviteCode")}
            hint={t("inviteHint")}
            error={error === "invalidInvite" ? t("errors.invalidInvite") : null}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            required
          />
        ) : null}
        <Field
          id="email"
          name="email"
          type="email"
          label={t("email")}
          defaultValue={email}
          error={error === "invalidEmail" || error === "unknownAccount" ? t(`errors.${error}`) : null}
          autoComplete="email"
          inputMode="email"
          required
        />
        {error === "tooMany" || error === "generic" ? (
          <p role="alert" className="text-[14px] text-danger">
            {t(`errors.${error}`)}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={sending || leavingForGoogle}>
          {t("sendCode")}
        </Button>
        {googleEnabled && mode === "signup" ? (
          <div className="grid gap-2">
            {googleButton}
            <p className="text-[13px] text-muted">{t("googleSignupHint")}</p>
          </div>
        ) : null}
        <Link
          href={mode === "login" ? "/inscription" : "/connexion"}
          className="justify-self-start text-[15px] font-medium text-accent-text underline-offset-4 hover:underline"
        >
          {mode === "login" ? t("toSignup") : t("toLogin")}
        </Link>
      </form>
    </div>
  );
}
