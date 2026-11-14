/** Rappels push : les quatre rappels, leurs réglages et le texte de leur notification. */

export const REMINDER_KINDS = ["seance", "forme", "complements", "bilan"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export function isReminderKind(value: unknown): value is ReminderKind {
  return typeof value === "string" && (REMINDER_KINDS as readonly string[]).includes(value);
}

type ReminderInfo = {
  label: string;
  /** Quand il part, et quand il se tait. */
  hint: string;
  /** Colonne de `reminder_settings` qui garde son heure. */
  column: "workout_at" | "checkin_at" | "supplements_at" | "review_at";
  /** Heure proposée quand on l'allume. */
  defaultTime: string;
  title: string;
  body: string;
  url: string;
};

export const REMINDERS: Record<ReminderKind, ReminderInfo> = {
  seance: {
    label: "Séance du jour",
    hint: "Les jours choisis, si tu n'as pas encore commencé de séance.",
    column: "workout_at",
    defaultTime: "18:00",
    title: "Séance du jour",
    body: "C'est un de tes jours d'entraînement. Ta semaine t'attend.",
    url: "/entrainement/semaine",
  },
  forme: {
    label: "Forme du jour",
    hint: "Chaque jour, tant que le check-in n'est pas fait.",
    column: "checkin_at",
    defaultTime: "07:30",
    title: "Forme du jour",
    body: "Trente secondes pour noter ton sommeil, ton énergie et tes courbatures.",
    url: "/",
  },
  complements: {
    label: "Compléments",
    hint: "Chaque jour, s'il reste une prise à cocher.",
    column: "supplements_at",
    defaultTime: "08:00",
    title: "Compléments",
    body: "Il te reste des prises à cocher aujourd'hui.",
    url: "/nutrition/complements",
  },
  bilan: {
    label: "Bilan du dimanche",
    hint: "Le dimanche, tant que le bilan de la semaine n'est pas enregistré.",
    column: "review_at",
    defaultTime: "18:00",
    title: "Bilan de la semaine",
    body: "Ta semaine est prête à être relue.",
    url: "/progres/bilan",
  },
};

/** Jours de la semaine, 1 = lundi … 7 = dimanche. */
export const WEEKDAYS = [
  { value: 1, short: "Lun" },
  { value: 2, short: "Mar" },
  { value: 3, short: "Mer" },
  { value: 4, short: "Jeu" },
  { value: 5, short: "Ven" },
  { value: 6, short: "Sam" },
  { value: 7, short: "Dim" },
] as const;

/** Heure de chaque rappel (« 18:00 »), `null` quand il est éteint. */
export type ReminderSettings = { times: Record<ReminderKind, string | null>; workoutDays: number[] };

export const NO_REMINDERS: ReminderSettings = { times: { seance: null, forme: null, complements: null, bilan: null }, workoutDays: [1, 2, 3, 4, 5, 6, 7] };

/** « 07:30 » ; Postgres rend « 07:30:00 », le champ d'heure du navigateur « 07:30 ». */
export function toTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value);
  return match ? `${match[1]}:${match[2]}` : null;
}

export type ReminderNotification = { tag: string; title: string; body: string; url: string };

/** Ce que le téléphone affiche pour les rappels qui viennent de partir. */
export function reminderNotifications(kinds: readonly string[]): ReminderNotification[] {
  return REMINDER_KINDS.filter((k) => kinds.includes(k)).map((k) => ({ tag: `rappel-${k}`, title: REMINDERS[k].title, body: REMINDERS[k].body, url: REMINDERS[k].url }));
}

/** Un signal reste « à afficher » ce temps-là : le téléphone peut le recevoir en retard. */
export const NOTIFICATION_WINDOW_MIN = 30;

/** Appareils abonnés par personne, au plus. */
export const MAX_PUSH_DEVICES = 10;
