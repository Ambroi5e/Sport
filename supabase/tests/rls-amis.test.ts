import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

const READS: [fn: string, category: string][] = [
  ["friend_workouts", "seances"],
  ["friend_activities", "seances"],
  ["friend_records", "records"],
  ["friend_weights", "poids"],
  ["friend_measurements", "mensurations"],
  ["friend_nutrition", "nutrition"],
  ["friend_checkins", "forme"],
];

describe.skipIf(!adminUrl)("RLS amis", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let chloe: string;

  const rows = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;
  const invite = (user: string) => asUserCommitValue(user, async () => (await rows("select code from public.create_friend_invite()"))[0].code as string);
  const share = (owner: string, friend: string, category: string) =>
    asUserCommit(client, owner, async () => {
      await client.query("insert into public.share_grants (friend_id, category) values ($1, $2)", [friend, category]);
    });

  async function asUserCommitValue<T>(user: string, fn: () => Promise<T>): Promise<T> {
    let value!: T;
    await asUserCommit(client, user, async () => {
      value = await fn();
    });
    return value;
  }

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    for (const code of ["FONTE-AAAA-1111", "FONTE-BBBB-2222", "FONTE-CCCC-3333"]) await seedInvitation(client, code);
    alice = await signUp(client, "alice@example.test", "FONTE-AAAA-1111");
    bruno = await signUp(client, "bruno@example.test", "FONTE-BBBB-2222");
    chloe = await signUp(client, "chloe@example.test", "FONTE-CCCC-3333");

    // Alice a des données dans chaque catégorie.
    await asUserCommit(client, alice, async () => {
      await client.query("update public.profiles set display_name = 'Alice'");
      const exercise = (await rows("insert into public.exercises (name, primary_muscles) values ('Squat maison', '{quadriceps}') returning id"))[0].id;
      const workout = (
        await rows(
          "insert into public.workouts (name, performed_on, started_at, ended_at, notes) values ('Bas A', current_date - 1, now() - interval '25 hours', now() - interval '24 hours', 'genou sensible') returning id",
        )
      )[0].id;
      await client.query(
        "insert into public.workout_sets (workout_id, exercise_id, set_number, weight_kg, reps, completed_at) values ($1, $2, 1, 100, 5, now()), ($1, $2, 2, 110, 3, now()), ($1, $2, 3, 60, 10, null)",
        [workout, exercise],
      );
      await client.query("insert into public.activities (performed_on, sport, duration_minutes, intensity) values (current_date - 2, 'padel', 90, 'intense')");
      await client.query("insert into public.body_weights (measured_on, weight_kg, note) values (current_date - 1, 72.4, 'après repas'), (current_date - 200, 70, null)");
      await client.query("insert into public.body_measurements (measured_on, site, value_cm) values (current_date - 30, 'taille', 80), (current_date - 1, 'taille', 79)");
      const food = (await rows("insert into public.foods (name, kcal, protein_g, carbs_g, fat_g) values ('Riz maison', 130, 3, 28, 0.5) returning id"))[0].id;
      await client.query("insert into public.food_logs (food_id, eaten_on, meal, grams) values ($1, current_date - 1, 'dejeuner', 200), ($1, current_date - 1, 'diner', 100)", [food]);
      await client.query("insert into public.daily_checkins (checkin_on, sleep, soreness, energy, stress) values (current_date - 1, 4, 2, 4, 2)");
    });

    // Alice et Bruno deviennent amis ; Chloé reste une inconnue.
    const code = await invite(alice);
    await asUserCommit(client, bruno, async () => {
      await client.query("select public.accept_friend_invite($1)", [code]);
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  describe("codes d'ami", () => {
    it("le code est haché et n'est lisible que par son auteur", async () => {
      const code = await invite(chloe);
      expect(code).toMatch(/^AMI-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      const stored = await asUser(client, chloe, () => rows("select code_hash from public.friend_invites"));
      expect(stored).toHaveLength(1);
      expect(stored[0].code_hash).not.toContain(code.replace(/-/g, ""));
      expect(await asUser(client, bruno, () => rows("select 1 from public.friend_invites where user_id = $1", [chloe]))).toHaveLength(0);
    });

    it("refuse son propre code, un code inconnu, expiré ou déjà utilisé", async () => {
      const code = await invite(bruno);
      await expect(asUser(client, bruno, () => client.query("select public.accept_friend_invite($1)", [code]))).rejects.toThrow(/own_code/);
      await expect(asUser(client, chloe, () => client.query("select public.accept_friend_invite('AMI-ZZZZ-9999')"))).rejects.toThrow(/invalid_code/);
      await client.query("update public.friend_invites set expires_at = now() - interval '1 minute' where user_id = $1 and used_at is null", [bruno]);
      await expect(asUser(client, chloe, () => client.query("select public.accept_friend_invite($1)", [code]))).rejects.toThrow(/invalid_code/);
      const used = (await rows("select count(*)::int as n from public.friend_invites where user_id = $1 and used_by = $2", [alice, bruno]))[0].n;
      expect(used).toBe(1);
    });

    it("cinq codes en attente au plus, et rien sans session", async () => {
      await expect(
        asUser(client, alice, async () => {
          for (let i = 0; i < 6; i++) await client.query("select public.create_friend_invite()");
        }),
      ).rejects.toThrow(/too_many_invites/);
      await expect(asUser(client, null, () => client.query("select public.create_friend_invite()"))).rejects.toThrow(/not_authenticated|permission denied/);
    });

    it("personne ne crée une amitié ou un code à la main", async () => {
      await expect(
        asUser(client, chloe, () => client.query("insert into public.friendships (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [chloe, alice])),
      ).rejects.toThrow(/row-level security/);
      await expect(asUser(client, chloe, () => client.query("insert into public.friend_invites (code_hash) values ('abc')"))).rejects.toThrow(/row-level security/);
    });
  });

  describe("amitiés", () => {
    it("chacun voit ses amitiés, un tiers aucune", async () => {
      const count = (user: string | null) => asUser(client, user, async () => (await rows("select count(*)::int as n from public.friendships"))[0].n);
      expect(await count(alice)).toBe(1);
      expect(await count(bruno)).toBe(1);
      expect(await count(chloe)).toBe(0);
      expect(await count(null)).toBe(0);
    });

    it("la liste d'amis ne donne que le prénom", async () => {
      const list = await asUser(client, bruno, () => rows("select * from public.friends_overview()"));
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ friend_id: alice, display_name: "Alice", shown_to_me: "{}", shown_by_me: "{}" });
      expect(Object.keys(list[0]).sort()).toEqual(["display_name", "friend_id", "shown_by_me", "shown_to_me", "since"]);
      expect(await asUser(client, chloe, () => rows("select * from public.friends_overview()"))).toHaveLength(0);
      expect(await asUser(client, bruno, () => rows("select 1 from public.profiles where user_id = $1", [alice]))).toHaveLength(0);
    });
  });

  describe("partage", () => {
    it("sans permission, un ami ne lit rien ; un tiers et un visiteur non plus", async () => {
      for (const [fn] of READS) {
        for (const user of [bruno, chloe, null]) {
          await expect(asUser(client, user, () => client.query(`select * from public.${fn}($1)`, [alice]))).rejects.toThrow(/not_shared|permission denied/);
        }
      }
    });

    it("les tables d'Alice restent fermées à Bruno, même avec toutes les permissions", async () => {
      await asUser(client, alice, async () => {
        for (const category of new Set(READS.map(([, c]) => c))) await client.query("insert into public.share_grants (friend_id, category) values ($1, $2)", [bruno, category]);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [bruno]);
        for (const table of ["workouts", "workout_sets", "activities", "body_weights", "body_measurements", "food_logs", "daily_checkins", "progress_photos"]) {
          expect((await rows(`select count(*)::int as n from public.${table}`))[0].n, table).toBe(0);
        }
      });
    });

    it("on ne partage qu'avec un ami, et seulement en son propre nom", async () => {
      await expect(asUser(client, alice, () => client.query("insert into public.share_grants (friend_id, category) values ($1, 'poids')", [chloe]))).rejects.toThrow(/row-level security/);
      await expect(
        asUser(client, bruno, () => client.query("insert into public.share_grants (user_id, friend_id, category) values ($1, $2, 'poids')", [alice, bruno])),
      ).rejects.toThrow(/row-level security/);
    });

    it.each(READS)("%s ne répond qu'avec la permission « %s »", async (fn, category) => {
      await asUser(client, alice, async () => {
        for (const other of new Set(READS.map(([, c]) => c))) {
          if (other !== category) await client.query("insert into public.share_grants (friend_id, category) values ($1, $2)", [bruno, other]);
        }
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [bruno]);
        await expect(client.query(`select * from public.${fn}($1)`, [alice])).rejects.toThrow(/not_shared/);
      });
      await asUser(client, alice, async () => {
        await client.query("insert into public.share_grants (friend_id, category) values ($1, $2)", [bruno, category]);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [bruno]);
        expect((await rows(`select * from public.${fn}($1)`, [alice])).length).toBeGreaterThan(0);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [chloe]);
        await expect(client.query(`select * from public.${fn}($1)`, [alice])).rejects.toThrow(/not_shared/);
      });
    });

    it("ce qui est partagé reste un résumé : pas de notes, pas de détail des repas", async () => {
      await asUser(client, alice, async () => {
        for (const category of new Set(READS.map(([, c]) => c))) await client.query("insert into public.share_grants (friend_id, category) values ($1, $2)", [bruno, category]);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [bruno]);
        const [workout] = await rows("select * from public.friend_workouts($1)", [alice]);
        expect(workout).toMatchObject({ name: "Bas A", minutes: 60, sets: 2, volume_kg: "830.00", is_light: false });
        expect(workout).not.toHaveProperty("notes");
        expect(await rows("select * from public.friend_records($1)", [alice])).toMatchObject([{ exercise_name: "Squat maison", weight_kg: "110.00", reps: 3, e1rm_kg: "121.0" }]);
        const weights = await rows("select * from public.friend_weights($1)", [alice]);
        expect(weights).toHaveLength(1);
        expect(Object.keys(weights[0]).sort()).toEqual(["measured_on", "weight_kg"]);
        expect(await rows("select * from public.friend_measurements($1)", [alice])).toMatchObject([{ site: "taille", value_cm: "79.0" }]);
        expect(await rows("select * from public.friend_nutrition($1)", [alice])).toMatchObject([{ kcal: "390", protein_g: "9", carbs_g: "84", fat_g: "2" }]);
        expect(await rows("select * from public.friend_checkins($1)", [alice])).toMatchObject([{ sleep: 4, soreness: 2, energy: 4, stress: 2 }]);
      });
    });

    it("l'ami voit ce qu'on lui montre mais ne peut ni l'élargir ni le retirer", async () => {
      await asUser(client, alice, async () => {
        await client.query("insert into public.share_grants (friend_id, category) values ($1, 'poids')", [bruno]);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [bruno]);
        expect(await rows("select category from public.share_grants where user_id = $1", [alice])).toEqual([{ category: "poids" }]);
        expect((await client.query("update public.share_grants set category = 'forme' where user_id = $1", [alice])).rowCount).toBe(0);
        expect((await client.query("delete from public.share_grants where user_id = $1", [alice])).rowCount).toBe(0);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [chloe]);
        expect(await rows("select 1 from public.share_grants")).toHaveLength(0);
      });
    });

    it("révoquer coupe l'accès tout de suite", async () => {
      await asUser(client, alice, async () => {
        await client.query("insert into public.share_grants (friend_id, category) values ($1, 'poids')", [bruno]);
        await client.query("delete from public.share_grants where friend_id = $1 and category = 'poids'", [bruno]);
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [bruno]);
        await expect(client.query("select * from public.friend_weights($1)", [alice])).rejects.toThrow(/not_shared/);
      });
    });

    it("retirer un ami efface les permissions des deux côtés et coupe l'accès", async () => {
      await share(alice, bruno, "poids");
      await share(bruno, alice, "forme");
      await asUser(client, bruno, async () => {
        expect((await client.query("delete from public.friendships")).rowCount).toBe(1);
        await expect(client.query("select * from public.friend_weights($1)", [alice])).rejects.toThrow(/not_shared/);
      });
      await asUserCommit(client, bruno, async () => {
        await client.query("delete from public.friendships");
      });
      expect((await rows("select count(*)::int as n from public.share_grants"))[0].n).toBe(0);
      // Une permission restée par erreur ne suffirait pas : il faut aussi l'amitié.
      await client.query("insert into public.share_grants (user_id, friend_id, category) values ($1, $2, 'poids')", [alice, bruno]);
      await expect(asUser(client, bruno, () => client.query("select * from public.friend_weights($1)", [alice]))).rejects.toThrow(/not_shared/);
    });
  });
});
