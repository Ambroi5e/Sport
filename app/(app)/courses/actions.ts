"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, requireUserId } from "@/lib/auth";
import { addDays, localDate } from "@/lib/dates";
import { AISLES, guessAisle, stockByFood } from "@/lib/engine";
import { formatQuantity, MAX_LIST_ITEMS, MAX_STOCK_ITEMS } from "@/lib/groceries";
import { isDay } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";
import { getEaten, getPrices, getShoppingList, getStock, mealNeeds } from "./data";

/** `values` renvoie la saisie quand elle est refusée ; `saved` confirme un enregistrement sans changement de page. */
export type GroceryState = { error?: string; saved?: string; values?: Record<string, string> };

const SAVE_ERROR = "L'enregistrement n'a pas abouti. Vérifie ta connexion et réessaie.";
const FULL_LIST = `La liste est pleine (${MAX_LIST_ITEMS} articles) : retire les articles cochés.`;
const id = z.uuid();
const itemName = z.string().trim().min(1, "Écris le nom de l'article.").max(60, "60 caractères au maximum.");

/** Nombre saisi au clavier français (« 12,5 », « 2 600 ») ; vide devient null. */
function decimal(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number(value.replace(/\s/g, "").replace(",", ".").replace("€", ""));
}

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

async function today(): Promise<string> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  return localDate(profile.timezone);
}

function refresh() {
  revalidatePath("/courses", "layout");
}

// Liste ---------------------------------------------------------------------------

/** Ajout rapide : un nom, le rayon est deviné. */
export async function addItem(_prev: GroceryState, formData: FormData): Promise<GroceryState> {
  const userId = await requireUserId();
  const parsed = itemName.safeParse(text(formData.get("name")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { count } = await supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_LIST_ITEMS) return { error: FULL_LIST, values: { name: parsed.data } };
  const { error } = await supabase.from("shopping_items").insert({ name: parsed.data, aisle: guessAisle(parsed.data) });
  if (error) return { error: SAVE_ERROR, values: { name: parsed.data } };
  refresh();
  return { saved: parsed.data };
}

/** Coche ou décoche un article. */
export async function toggleItem(itemId: string, checked: boolean) {
  const userId = await requireUserId();
  if (!id.safeParse(itemId).success) throw new Error("invalid_item");
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_items")
    .update({ checked_at: checked ? new Date().toISOString() : null })
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) throw new Error("item_not_saved");
  refresh();
}

export async function updateItem(itemId: string, _prev: GroceryState, formData: FormData): Promise<GroceryState> {
  const userId = await requireUserId();
  const values = { name: text(formData.get("name")), quantity: text(formData.get("quantity")), aisle: text(formData.get("aisle")) };
  const parsed = z
    .object({
      id,
      name: itemName,
      quantity: z.string().trim().max(30, "Quantité : 30 caractères au maximum."),
      aisle: z.enum(AISLES, { error: "Choisis un rayon." }),
    })
    .safeParse({ id: itemId, ...values });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const supabase = await createClient();
  const { data: current } = await supabase.from("shopping_items").select("quantity").eq("id", parsed.data.id).eq("user_id", userId).maybeSingle();
  if (!current) return { error: SAVE_ERROR, values };
  const quantity = parsed.data.quantity || null;
  const { error } = await supabase
    .from("shopping_items")
    // Une quantité réécrite à la main ne correspond plus au poids calculé : le coût estimé disparaît avec lui.
    .update({ name: parsed.data.name, quantity, aisle: parsed.data.aisle, ...(quantity === current.quantity ? {} : { grams: null }) })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { error: SAVE_ERROR, values };
  refresh();
  redirect("/courses");
}

export async function deleteItem(itemId: string) {
  const userId = await requireUserId();
  if (!id.safeParse(itemId).success) throw new Error("invalid_item");
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_items").delete().eq("id", itemId).eq("user_id", userId);
  if (error) throw new Error("item_not_deleted");
  refresh();
  redirect("/courses");
}

/** Vide le panier : retire tous les articles cochés. */
export async function clearChecked() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_items").delete().eq("user_id", userId).not("checked_at", "is", null);
  if (error) throw new Error("items_not_deleted");
  refresh();
}

/**
 * « Depuis mes repas » : ajoute les aliments cochés. Les quantités sont
 * recalculées ici d'après le journal, jamais reprises du formulaire.
 */
export async function addFromMeals(_prev: GroceryState, formData: FormData): Promise<GroceryState> {
  await requireUserId();
  const chosen = new Set(formData.getAll("food").filter((v): v is string => typeof v === "string" && id.safeParse(v).success));
  if (!chosen.size) return { error: "Coche au moins un aliment." };
  const now = await today();
  const [eaten, prices, list, stock] = await Promise.all([getEaten(now), getPrices(), getShoppingList(), getStock()]);
  const rows = mealNeeds(eaten, prices, list, stockByFood(stock, now))
    .filter((n) => chosen.has(n.foodId) && n.buyGrams > 0)
    .map((n) => ({ name: n.name.slice(0, 60), quantity: formatQuantity(n.buyGrams), aisle: guessAisle(n.name), food_id: n.foodId, grams: n.buyGrams }));
  if (!rows.length) return { error: "Ces aliments ne sont plus dans tes repas récents." };
  if (list.length + rows.length > MAX_LIST_ITEMS) return { error: FULL_LIST };
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_items").insert(rows);
  if (error) return { error: SAVE_ERROR };
  refresh();
  redirect("/courses");
}

// Stock ----------------------------------------------------------------------------

const FULL_STOCK = `Le stock est plein (${MAX_STOCK_ITEMS} articles) : retire ce qui est fini.`;
const expiry = z
  .string()
  .refine((d) => d === "" || isDay(d), "Choisis une date de péremption valide.")
  .transform((d) => d || null);

/** Après les courses : les articles cochés quittent la liste et entrent dans le stock. */
export async function storeChecked() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: checked } = await supabase.from("shopping_items").select("id, name, quantity, aisle, food_id, grams").eq("user_id", userId).not("checked_at", "is", null);
  if (!checked?.length) return;
  const { count } = await supabase.from("stock_items").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) + checked.length > MAX_STOCK_ITEMS) throw new Error("stock_full");
  const { error } = await supabase.from("stock_items").insert(checked.map(({ id: _id, ...item }) => item));
  if (error) throw new Error("stock_not_saved");
  // Le stock est écrit : la liste ne perd que ce qui vient d'y entrer.
  const removed = await supabase
    .from("shopping_items")
    .delete()
    .eq("user_id", userId)
    .in("id", checked.map((c) => c.id));
  if (removed.error) throw new Error("items_not_deleted");
  refresh();
  redirect("/courses/stock");
}

export async function addStockItem(_prev: GroceryState, formData: FormData): Promise<GroceryState> {
  const userId = await requireUserId();
  const values = { name: text(formData.get("name")), expires: text(formData.get("expires")) };
  const parsed = z.object({ name: itemName, expires: expiry }).safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const supabase = await createClient();
  const { count } = await supabase.from("stock_items").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= MAX_STOCK_ITEMS) return { error: FULL_STOCK, values };
  const { error } = await supabase.from("stock_items").insert({ name: parsed.data.name, aisle: guessAisle(parsed.data.name), expires_on: parsed.data.expires });
  if (error) return { error: SAVE_ERROR, values };
  refresh();
  return { saved: parsed.data.name };
}

export async function updateStockItem(itemId: string, _prev: GroceryState, formData: FormData): Promise<GroceryState> {
  const userId = await requireUserId();
  const values = { name: text(formData.get("name")), quantity: text(formData.get("quantity")), expires: text(formData.get("expires")) };
  const parsed = z
    .object({ id, name: itemName, quantity: z.string().trim().max(30, "Quantité : 30 caractères au maximum."), expires: expiry })
    .safeParse({ id: itemId, ...values });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const supabase = await createClient();
  const { data: current } = await supabase.from("stock_items").select("quantity").eq("id", parsed.data.id).eq("user_id", userId).maybeSingle();
  if (!current) return { error: SAVE_ERROR, values };
  const quantity = parsed.data.quantity || null;
  const { error } = await supabase
    .from("stock_items")
    // Une quantité réécrite à la main ne correspond plus au poids connu : il n'est plus déduit des courses.
    .update({ name: parsed.data.name, quantity, expires_on: parsed.data.expires, ...(quantity === current.quantity ? {} : { grams: null }) })
    .eq("id", parsed.data.id)
    .eq("user_id", userId);
  if (error) return { error: SAVE_ERROR, values };
  refresh();
  redirect("/courses/stock");
}

/** « Fini » : l'article quitte le stock. */
export async function finishStockItem(itemId: string) {
  const userId = await requireUserId();
  if (!id.safeParse(itemId).success) throw new Error("invalid_item");
  const supabase = await createClient();
  const { error } = await supabase.from("stock_items").delete().eq("id", itemId).eq("user_id", userId);
  if (error) throw new Error("item_not_deleted");
  refresh();
}

// Budget et achats ----------------------------------------------------------------

/** Budget de la semaine ; champ vide = pas de budget. */
export async function setBudget(_prev: GroceryState, formData: FormData): Promise<GroceryState> {
  const userId = await requireUserId();
  const values = { budget: text(formData.get("budget")) };
  const parsed = z
    .number({ error: "Indique un montant en euros." })
    .min(1, "1 € au minimum.")
    .max(2000, "2 000 € au maximum.")
    .nullable()
    .safeParse(decimal(formData.get("budget")));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const budget = parsed.data === null ? null : Math.round(parsed.data * 100) / 100;
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ weekly_food_budget: budget }).eq("user_id", userId);
  if (error) return { error: SAVE_ERROR, values };
  refresh();
  return { saved: budget === null ? "Budget retiré." : "Budget enregistré." };
}

export async function addPurchase(_prev: GroceryState, formData: FormData): Promise<GroceryState> {
  await requireUserId();
  const now = await today();
  const values = { amount: text(formData.get("amount")), store: text(formData.get("store")), day: text(formData.get("day")) };
  const parsed = z
    .object({
      amount: z.number({ error: "Indique le montant du ticket." }).gt(0, "Le montant doit être positif.").max(5000, "5 000 € au maximum."),
      store: z.string().trim().max(40, "Magasin : 40 caractères au maximum."),
      day: z.string().refine((d) => isDay(d) && d <= now && d >= addDays(now, -60), "Choisis un jour des deux derniers mois."),
    })
    .safeParse({ amount: decimal(formData.get("amount")), store: values.store, day: values.day || now });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const supabase = await createClient();
  const { error } = await supabase
    .from("purchases")
    .insert({ purchased_on: parsed.data.day, amount: Math.round(parsed.data.amount * 100) / 100, store: parsed.data.store || null });
  if (error) return { error: SAVE_ERROR, values };
  refresh();
  return { saved: "Achat noté." };
}

export async function deletePurchase(purchaseId: string) {
  const userId = await requireUserId();
  if (!id.safeParse(purchaseId).success) throw new Error("invalid_purchase");
  const supabase = await createClient();
  const { error } = await supabase.from("purchases").delete().eq("id", purchaseId).eq("user_id", userId);
  if (error) throw new Error("purchase_not_deleted");
  refresh();
}

// Prix ------------------------------------------------------------------------------

/** Prix au kilo : chaque champ `price.<aliment>` rempli est enregistré, chaque champ vidé est retiré. */
export async function savePrices(_prev: GroceryState, formData: FormData): Promise<GroceryState> {
  const userId = await requireUserId();
  const price = z.number().gt(0).max(1000);
  const upserts: { food_id: string; price_per_kg: number }[] = [];
  const removals: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("price.")) continue;
    const foodId = key.slice(6);
    if (!id.safeParse(foodId).success) continue;
    const amount = decimal(value);
    if (amount === null) removals.push(foodId);
    else if (!price.safeParse(amount).success) return { error: "Un prix au kilo va de 0,01 € à 1 000 €." };
    else upserts.push({ food_id: foodId, price_per_kg: Math.round(amount * 100) / 100 });
  }
  if (upserts.length + removals.length > 300) return { error: SAVE_ERROR };
  const supabase = await createClient();
  if (upserts.length) {
    const { error } = await supabase.from("food_prices").upsert(upserts, { onConflict: "user_id,food_id" });
    if (error) return { error: SAVE_ERROR };
  }
  if (removals.length) {
    const { error } = await supabase.from("food_prices").delete().eq("user_id", userId).in("food_id", removals);
    if (error) return { error: SAVE_ERROR };
  }
  refresh();
  return { saved: "Prix enregistrés." };
}
