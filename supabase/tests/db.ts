import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const root = join(__dirname, "..");

/** Base jetable : shim Supabase + toutes les migrations, dans l'ordre. */
export async function createTestDatabase(adminUrl: string) {
  const name = `fonte_rls_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  await admin.query(`create database ${name}`);
  await admin.end();

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();

  await client.query(readFileSync(join(root, "tests", "shim.sql"), "utf8"));
  const migrations = readdirSync(join(root, "migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    await client.query(readFileSync(join(root, "migrations", file), "utf8"));
  }

  async function drop() {
    await client.end();
    const cleanup = new Client({ connectionString: adminUrl });
    await cleanup.connect();
    await cleanup.query(`drop database if exists ${name} with (force)`);
    await cleanup.end();
  }

  return { client, drop };
}

/**
 * Exécute `fn` comme le ferait PostgREST pour un utilisateur connecté :
 * rôle `authenticated` et claims du JWT. Tout est annulé à la fin.
 */
export async function asUser<T>(
  client: Client,
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query("begin");
  try {
    await client.query(`set local role ${userId ? "authenticated" : "anon"}`);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    return await fn();
  } finally {
    await client.query("rollback");
  }
}

/** Crée un utilisateur comme le ferait Supabase Auth (en superutilisateur). */
export async function signUp(client: Client, email: string, inviteCode?: string) {
  const { rows } = await client.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, inviteCode ? { invite_code: inviteCode } : {}],
  );
  return rows[0].id;
}

/** Crée un code d'invitation directement (amorçage des tests). */
export async function seedInvitation(client: Client, code: string, validDays = 30) {
  await client.query(
    "insert into public.invitations (code_hash, expires_at) values (public.invitation_hash($1), now() + make_interval(days => $2))",
    [code, validDays],
  );
}
