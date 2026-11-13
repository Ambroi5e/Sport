import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, asUserCommit, createTestDatabase, seedInvitation, signUp } from "./db";

const adminUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!adminUrl)("RLS séances communes", () => {
  let db: Awaited<ReturnType<typeof createTestDatabase>>;
  let client: Client;
  let alice: string;
  let bruno: string;
  let chloe: string;
  let dana: string;
  let session: string;
  let exercise: string;

  const rows = async (sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows;
  const as = (user: string) => client.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);

  /** Une séance de musculation avec une série, faite ou non. */
  async function logSet(options: { done?: boolean; warmup?: boolean } = {}) {
    const workout = (await rows("insert into public.workouts (name, performed_on) values ('Haut A', current_date) returning id"))[0].id;
    return (
      await rows(
        "insert into public.workout_sets (workout_id, exercise_id, set_number, weight_kg, reps, is_warmup, completed_at) values ($1, $2, 1, 80, 6, $3, $4) returning id",
        [workout, exercise, options.warmup ?? false, options.done === false ? null : new Date()],
      )
    )[0].id as string;
  }

  beforeAll(async () => {
    db = await createTestDatabase(adminUrl!);
    client = db.client;
    const users: string[] = [];
    for (const [i, name] of ["alice", "bruno", "chloe", "dana"].entries()) {
      await seedInvitation(client, `FONTE-AAAA-111${i}`);
      users.push(await signUp(client, `${name}@example.test`, `FONTE-AAAA-111${i}`));
    }
    [alice, bruno, chloe, dana] = users;
    exercise = (await rows("insert into public.exercises (user_id, slug, name, primary_muscles) values (null, 'developpe-couche', 'Développé couché', '{pectoraux}') returning id"))[0].id;
    await client.query("update public.profiles set display_name = 'Alice' where user_id = $1", [alice]);

    // Alice est amie avec Bruno et Chloé, pas avec Dana.
    for (const friend of [bruno, chloe]) {
      await client.query("insert into public.friendships (user_a, user_b) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))", [alice, friend]);
    }
    // Alice lance une séance commune, invite Bruno et Chloé ; seul Bruno rejoint.
    await asUserCommit(client, alice, async () => {
      session = (await rows("insert into public.group_sessions (name) values ('Samedi matin') returning id"))[0].id;
      await client.query("insert into public.group_participants (session_id, joined_at) values ($1, now())", [session]);
      await client.query("insert into public.group_participants (session_id, user_id) values ($1, $2), ($1, $3)", [session, bruno, chloe]);
    });
    await asUserCommit(client, bruno, async () => {
      await client.query("update public.group_participants set joined_at = now() where session_id = $1 and user_id = $2", [session, bruno]);
    });
    // Alice fait une série : elle part dans le fil.
    await asUserCommit(client, alice, async () => {
      await logSet();
    });
  });

  afterAll(async () => {
    await db?.drop();
  });

  it("la séance et ses participants sont visibles des invités, pas des autres", async () => {
    const seen = (user: string | null) =>
      asUser(client, user, async () => ({
        sessions: (await rows("select 1 from public.group_sessions")).length,
        people: (await rows("select 1 from public.group_participants")).length,
      }));
    expect(await seen(alice)).toEqual({ sessions: 1, people: 3 });
    expect(await seen(bruno)).toEqual({ sessions: 1, people: 3 });
    expect(await seen(chloe)).toEqual({ sessions: 1, people: 3 });
    expect(await seen(dana)).toEqual({ sessions: 0, people: 0 });
    expect(await seen(null)).toEqual({ sessions: 0, people: 0 });
  });

  it("le fil n'est lisible qu'après avoir rejoint", async () => {
    const feed = (user: string | null) => asUser(client, user, () => rows("select exercise_name, weight_kg, reps from public.group_events"));
    expect(await feed(bruno)).toEqual([{ exercise_name: "Développé couché", weight_kg: "80.00", reps: 6 }]);
    expect(await feed(alice)).toHaveLength(1);
    expect(await feed(chloe)).toHaveLength(0);
    expect(await feed(dana)).toHaveLength(0);
    expect(await feed(null)).toHaveLength(0);
  });

  it("les séances de musculation restent fermées aux autres participants", async () => {
    const n = await asUser(client, bruno, async () => (await rows("select count(*)::int as n from public.workout_sets"))[0].n);
    expect(n).toBe(0);
  });

  it("les prénoms ne sont donnés qu'aux participants", async () => {
    const people = await asUser(client, chloe, () => rows("select * from public.group_people($1)", [session]));
    expect(people).toHaveLength(3);
    expect(people[0]).toMatchObject({ user_id: alice, display_name: "Alice", is_owner: true });
    expect(people.find((p) => p.user_id === chloe)).toMatchObject({ joined_at: null, is_owner: false });
    await expect(asUser(client, dana, () => client.query("select * from public.group_people($1)", [session]))).rejects.toThrow(/not_participant/);
    await expect(asUser(client, null, () => client.query("select * from public.group_people($1)", [session]))).rejects.toThrow(/not_participant|permission denied/);
  });

  it("on n'invite que ses amis, et seulement dans sa propre séance", async () => {
    await expect(asUser(client, alice, () => client.query("insert into public.group_participants (session_id, user_id) values ($1, $2)", [session, dana]))).rejects.toThrow(
      /row-level security/,
    );
    await expect(asUser(client, bruno, () => client.query("insert into public.group_participants (session_id, user_id) values ($1, $2)", [session, dana]))).rejects.toThrow(
      /row-level security/,
    );
    await expect(
      asUser(client, dana, () => client.query("insert into public.group_participants (session_id, user_id, joined_at) values ($1, $2, now())", [session, dana])),
    ).rejects.toThrow(/row-level security/);
  });

  it("personne ne rejoint à la place d'un autre ni ne termine la séance d'un autre", async () => {
    await asUser(client, bruno, async () => {
      expect((await client.query("update public.group_participants set joined_at = now() where user_id = $1", [chloe])).rowCount).toBe(0);
      expect((await client.query("update public.group_sessions set ended_at = now()")).rowCount).toBe(0);
      expect((await client.query("delete from public.group_sessions")).rowCount).toBe(0);
      expect((await client.query("delete from public.group_participants where user_id = $1", [alice])).rowCount).toBe(0);
    });
  });

  it("le fil ne s'écrit ni ne se modifie depuis l'app", async () => {
    await expect(
      asUser(client, bruno, async () => {
        const set = await logSet({ done: false });
        await client.query("insert into public.group_events (session_id, user_id, set_id, exercise_name) values ($1, $2, $3, 'Faux')", [session, bruno, set]);
      }),
    ).rejects.toThrow(/row-level security/);
    await asUser(client, bruno, async () => {
      expect((await client.query("update public.group_events set exercise_name = 'Faux'")).rowCount).toBe(0);
      expect((await client.query("delete from public.group_events")).rowCount).toBe(0);
    });
  });

  describe("ce qui part dans le fil", () => {
    const count = async () => (await rows("select count(*)::int as n from public.group_events"))[0].n as number;

    it("une série faite par un participant présent, une seule fois", async () => {
      await asUser(client, bruno, async () => {
        const set = await logSet({ done: false });
        await client.query("reset role");
        const before = await count();
        await client.query("set local role authenticated");
        await client.query("update public.workout_sets set completed_at = now() where id = $1", [set]);
        await client.query("update public.workout_sets set reps = 7 where id = $1", [set]);
        await client.query("update public.workout_sets set completed_at = now() + interval '1 second' where id = $1", [set]);
        await client.query("reset role");
        expect(await count()).toBe(before + 1);
      });
    });

    it("rien pour un échauffement, un invité qui n'a pas rejoint ou quelqu'un hors de la séance", async () => {
      const before = await count();
      await asUser(client, alice, async () => {
        await logSet({ warmup: true });
        await as(chloe);
        await logSet();
        await as(dana);
        await logSet();
        await client.query("reset role");
        expect(await count()).toBe(before);
      });
    });

    it("rien après la fin, ni six heures après le lancement", async () => {
      const before = await count();
      await asUser(client, alice, async () => {
        await client.query("update public.group_sessions set ended_at = now()");
        await logSet();
        await client.query("update public.group_sessions set ended_at = null, created_at = now() - interval '7 hours'");
        await logSet();
        await client.query("reset role");
        expect(await count()).toBe(before);
      });
    });

    it("supprimer la série retire son événement ; quitter garde le fil déjà écrit", async () => {
      await asUser(client, alice, async () => {
        const set = await logSet();
        await client.query("reset role");
        const before = await count();
        await client.query("set local role authenticated");
        await client.query("delete from public.workout_sets where id = $1", [set]);
        await client.query("reset role");
        expect(await count()).toBe(before - 1);
      });
      await asUser(client, bruno, async () => {
        expect((await client.query("delete from public.group_participants where user_id = $1", [bruno])).rowCount).toBe(1);
        expect(await rows("select 1 from public.group_events")).toHaveLength(0);
      });
    });
  });

  it("supprimer la séance commune retire participants et fil", async () => {
    await asUser(client, alice, async () => {
      await client.query("delete from public.group_sessions where id = $1", [session]);
      await client.query("reset role");
      expect((await rows("select count(*)::int as n from public.group_participants"))[0].n).toBe(0);
      expect((await rows("select count(*)::int as n from public.group_events"))[0].n).toBe(0);
    });
  });
});
