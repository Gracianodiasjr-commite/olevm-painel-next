import { getSql, ensureTable, PANEL_ID } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMPTY_STATE = {
  casas: {},
  acoes: {},
  lista: null,
  srvCfg: {},
  snapshots: {},
  ppc: {},
  activeTab: 'visao',
};

// GET /api/state — retorna o estado do painel (cria vazio na primeira vez).
export async function GET() {
  try {
    await ensureTable();
    const sql = getSql();
    const rows = await sql`SELECT data FROM panel_state WHERE id = ${PANEL_ID} LIMIT 1`;
    if (rows.length === 0) {
      return Response.json({ ok: true, state: EMPTY_STATE, fresh: true });
    }
    return Response.json({ ok: true, state: rows[0].data, fresh: false });
  } catch (err) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

// POST /api/state — grava (upsert) o estado completo do painel.
export async function POST(request) {
  try {
    const body = await request.json();
    const state = body?.state;
    if (!state || typeof state !== 'object') {
      return Response.json({ ok: false, error: 'state ausente ou inválido' }, { status: 400 });
    }
    await ensureTable();
    const sql = getSql();
    await sql`
      INSERT INTO panel_state (id, data, updated_at)
      VALUES (${PANEL_ID}, ${sql.json(state)}, now())
      ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = now()
    `;
    return Response.json({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
