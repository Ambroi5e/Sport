/**
 * Ce que contient l'export d'un compte : chaque table de la personne, son fichier
 * CSV et les noms qu'on ajoute à côté d'un identifiant pour qu'un tableur soit lisible.
 * Partagé entre le serveur (lecture) et le téléphone (CSV et archive).
 */
import type { Database } from "@/lib/supabase/database.types";

export type TableName = keyof Database["public"]["Tables"];
export type Row = Record<string, unknown>;

/** Un identifiant remplacé par un libellé lisible dans le CSV (la colonne d'origine reste). */
export type Ref = { column: string; from: "exercises" | "foods" | "workouts"; field: string; as: string };

export type ExportTable = {
  table: TableName;
  /** Nom du fichier CSV, sans extension. */
  file: string;
  /** Description pour le LISEZMOI. */
  label: string;
  /** Tri stable et unique pour lire page par page. */
  order: string[];
  refs?: Ref[];
};

const exercise = (column = "exercise_id", as = "exercise_name"): Ref => ({ column, from: "exercises", field: "name", as });
const food = (column = "food_id", as = "food_name"): Ref => ({ column, from: "foods", field: "name", as });

/**
 * Toutes les tables d'un compte, sauf les invitations (codes hachés et adresses
 * d'autres personnes). Exercices et aliments : seulement ceux de la personne ;
 * ceux du catalogue qu'elle utilise sont nommés dans `catalog`.
 */
export const EXPORT_TABLES: ExportTable[] = [
  { table: "profiles", file: "profil", label: "Profil", order: ["user_id"] },
  { table: "goals", file: "objectifs", label: "Objectifs", order: ["created_at", "id"] },
  { table: "user_modules", file: "modules", label: "Modules activés", order: ["module"] },
  { table: "user_roles", file: "roles", label: "Rôle dans l'app", order: ["role"] },
  { table: "exercises", file: "exercices-perso", label: "Exercices créés", order: ["created_at", "id"] },
  { table: "exercise_preferences", file: "preferences-exercices", label: "Exercices aimés ou évités", order: ["exercise_id"], refs: [exercise()] },
  { table: "programs", file: "programmes", label: "Programmes", order: ["created_at", "id"], refs: [exercise("goal_exercise_id", "goal_exercise_name")] },
  { table: "workout_templates", file: "modeles-seance", label: "Modèles de séance", order: ["position", "id"] },
  { table: "template_items", file: "modeles-exercices", label: "Exercices des modèles", order: ["template_id", "position", "id"], refs: [exercise()] },
  { table: "workouts", file: "seances", label: "Séances", order: ["performed_on", "id"] },
  {
    table: "workout_sets",
    file: "series",
    label: "Séries (une ligne par série)",
    order: ["workout_id", "exercise_order", "set_number", "id"],
    refs: [{ column: "workout_id", from: "workouts", field: "performed_on", as: "workout_date" }, exercise()],
  },
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
  { table: "body_weights", file: "pesees", label: "Pesées", order: ["measured_on", "id"] },
  { table: "body_measurements", file: "mensurations", label: "Mensurations", order: ["measured_on", "site", "id"] },
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
