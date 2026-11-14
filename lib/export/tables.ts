/**
 * Ce que contient l'export d'un compte : chaque table de la personne, son fichier
 * CSV et les noms qu'on ajoute à côté d'un identifiant pour qu'un tableur soit lisible.
 * Partagé entre le serveur (lecture) et le téléphone (CSV et archive).
 */
import type { Database } from "@/lib/supabase/database.types";

export type TableName = keyof Database["public"]["Tables"];
export type Row = Record<string, unknown>;

/** Un identifiant remplacé par un libellé lisible dans le CSV (la colonne d'origine reste). */
export type Ref = { column: string; from: "exercises" | "foods" | "workouts" | "workout_templates"; field: string; as: string };

export type ExportTable = {
  table: TableName;
  /** Nom du fichier CSV, sans extension. */
  file: string;
  /** Description pour le LISEZMOI. */
  label: string;
  /** Tri stable et unique pour lire page par page. */
  order: string[];
  refs?: Ref[];
  /** Colonnes qui désignent la personne ; `user_id` par défaut. Une amitié en a deux. */
  owner?: string[];
};

const exercise = (column = "exercise_id", as = "exercise_name"): Ref => ({ column, from: "exercises", field: "name", as });
const food = (column = "food_id", as = "food_name"): Ref => ({ column, from: "foods", field: "name", as });

/**
 * Toutes les tables d'un compte, sauf les invitations et les codes d'ami (codes
 * hachés et adresses d'autres personnes). Exercices et aliments : seulement ceux de la personne ;
 * ceux du catalogue qu'elle utilise sont nommés dans `catalog`.
 */
export const EXPORT_TABLES: ExportTable[] = [
  { table: "profiles", file: "profil", label: "Profil (weekly_food_budget : budget courses de la semaine, en euros)", order: ["user_id"] },
  { table: "goals", file: "objectifs", label: "Objectifs", order: ["created_at", "id"] },
  { table: "user_modules", file: "modules", label: "Modules activés", order: ["module"] },
  { table: "user_roles", file: "roles", label: "Rôle dans l'app", order: ["role"] },
  { table: "exercises", file: "exercices-perso", label: "Exercices créés", order: ["created_at", "id"] },
  { table: "exercise_preferences", file: "preferences-exercices", label: "Exercices aimés ou évités", order: ["exercise_id"], refs: [exercise()] },
  { table: "programs", file: "programmes", label: "Programmes", order: ["created_at", "id"], refs: [exercise("goal_exercise_id", "goal_exercise_name")] },
  { table: "workout_templates", file: "modeles-seance", label: "Modèles de séance", order: ["position", "id"] },
  { table: "template_items", file: "modeles-exercices", label: "Exercices des modèles", order: ["template_id", "position", "id"], refs: [exercise()] },
  { table: "workouts", file: "seances", label: "Séances (is_light : séance allégée selon la forme du jour)", order: ["performed_on", "id"] },
  {
    table: "workout_sets",
    file: "series",
    label: "Séries (une ligne par série)",
    order: ["workout_id", "exercise_order", "set_number", "id"],
    refs: [{ column: "workout_id", from: "workouts", field: "performed_on", as: "workout_date" }, exercise()],
  },
  { table: "activities", file: "activites", label: "Sports notés (durée en minutes)", order: ["performed_on", "id"] },
  { table: "weekly_sports", file: "sports-fixes", label: "Sports fixes de la semaine type (jour : 1 = lundi … 7 = dimanche)", order: ["weekday", "created_at", "id"] },
  {
    table: "session_pins",
    file: "seances-deplacees",
    label: "Séances du programme déplacées à la main (semaine du lundi indiqué)",
    order: ["week_start", "template_id"],
    refs: [{ column: "template_id", from: "workout_templates", field: "name", as: "template_name" }],
  },
  { table: "blocked_days", file: "jours-sans-seance", label: "Jours libérés à la main, sans séance", order: ["blocked_on"] },
  { table: "friendships", file: "amis", label: "Amitiés (identifiants des deux comptes, date)", order: ["user_a", "user_b"], owner: ["user_a", "user_b"] },
  { table: "share_grants", file: "partages", label: "Ce que tu montres à chaque ami, par catégorie", order: ["friend_id", "category"] },
  { table: "group_sessions", file: "seances-communes", label: "Séances communes que tu as lancées", order: ["created_at", "id"] },
  { table: "group_participants", file: "seances-communes-participations", label: "Séances communes où tu as été invité ou présent", order: ["created_at", "session_id"] },
  { table: "group_events", file: "seances-communes-series", label: "Tes séries parties dans le fil d'une séance commune", order: ["created_at", "id"] },
  { table: "foods", file: "aliments-perso", label: "Aliments et recettes créés (valeurs pour 100 g)", order: ["created_at", "id"] },
  {
    table: "recipe_items",
    file: "recettes-ingredients",
    label: "Ingrédients des recettes",
    order: ["recipe_id", "position", "id"],
    refs: [food("recipe_id", "recipe_name"), food()],
  },
  { table: "saved_meals", file: "repas-enregistres", label: "Repas enregistrés", order: ["position", "id"] },
  { table: "saved_meal_items", file: "repas-enregistres-aliments", label: "Aliments des repas enregistrés", order: ["saved_meal_id", "position", "id"], refs: [food()] },
  { table: "food_logs", file: "journal-alimentaire", label: "Journal alimentaire (grammes mangés)", order: ["eaten_on", "created_at", "id"], refs: [food()] },
  { table: "nutrition_targets", file: "cibles", label: "Cibles par type de jour", order: ["day_type"] },
  { table: "shopping_items", file: "courses", label: "Liste de courses (checked_at : dans le panier)", order: ["created_at", "id"], refs: [food()] },
  { table: "food_prices", file: "prix", label: "Prix au kilo saisis, en euros", order: ["food_id"], refs: [food()] },
  { table: "purchases", file: "achats", label: "Achats notés (montant du ticket, en euros)", order: ["purchased_on", "id"] },
  { table: "stock_items", file: "stock", label: "Stock de la maison (expires_on : date de péremption)", order: ["created_at", "id"], refs: [food()] },
  { table: "supplements", file: "complements", label: "Compléments (paused_at : en pause)", order: ["created_at", "id"] },
  { table: "supplement_logs", file: "complements-prises", label: "Prises de compléments (une ligne par jour coché)", order: ["taken_on", "supplement_id"] },
  { table: "body_weights", file: "pesees", label: "Pesées", order: ["measured_on", "id"] },
  { table: "body_measurements", file: "mensurations", label: "Mensurations", order: ["measured_on", "site", "id"] },
  {
    table: "daily_checkins",
    file: "forme",
    label: "Forme du jour (1 à 5 : sommeil et énergie, 5 = très bien ; courbatures et stress, 5 = forts)",
    order: ["checkin_on"],
  },
  { table: "progress_photos", file: "photos", label: "Photos de progression (fichiers dans photos/)", order: ["taken_on", "id"] },
];

export type FonteExport = {
  format: "fonte-export";
  version: 1;
  exported_at: string;
  account: { id: string; email: string | null; created_at: string | null; providers: string[] };
  tables: Partial<Record<TableName, Row[]>>;
  /** Exercices et aliments du catalogue commun utilisés par la personne. */
  catalog: { exercises: Row[]; foods: Row[] };
};

/** Identifiants du catalogue à nommer : référencés par les lignes, absents des tables de la personne. */
export function catalogIds(tables: FonteExport["tables"], from: "exercises" | "foods"): string[] {
  const own = new Set((tables[from] ?? []).map((r) => r.id));
  const ids = new Set<string>();
  for (const { table, refs } of EXPORT_TABLES) {
    for (const ref of refs ?? []) {
      if (ref.from !== from) continue;
      for (const row of tables[table] ?? []) {
        const id = row[ref.column];
        if (typeof id === "string" && !own.has(id)) ids.add(id);
      }
    }
  }
  return [...ids].sort();
}
