import postgres from 'postgres';

// Aceita várias variáveis de ambiente comuns entre provedores (Neon, Vercel, Supabase).
const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  '';

// Reaproveita o cliente entre invocações de função serverless (evita esgotar conexões).
let _sql = globalThis.__olevm_sql;

export function getSql() {
  if (!CONNECTION_STRING) {
    throw new Error(
      'Defina DATABASE_URL (ou POSTGRES_URL) com a connection string do Postgres.'
    );
  }
  if (!_sql) {
    _sql = postgres(CONNECTION_STRING, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
    });
    globalThis.__olevm_sql = _sql;
  }
  return _sql;
}

let _ready = false;
export async function ensureTable() {
  if (_ready) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS panel_state (
      id          TEXT PRIMARY KEY,
      data        JSONB NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  _ready = true;
}

export const PANEL_ID = process.env.PANEL_ID || 'painel-producao-2026-1';
