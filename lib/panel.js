// ============================================================================
// Painel de Produção OléVM — lógica de domínio (porte fiel do app original).
// Diferenças vs. versão HTML: o estado vive em memória do módulo (não localStorage)
// e é persistido via callback (API Postgres). As funções de render retornam
// strings de HTML em vez de manipular o DOM diretamente.
// ============================================================================

// ----------------------------- DADOS -----------------------------
export function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
function rangeDesc(a, b) { const r = []; for (let i = b; i >= a; i--) r.push(i); return r; }

export const QUADRAS = [
  { id: 'Q01', nome: 'Quadra 01', linhas: [range(44, 48)] },
  { id: 'Q02', nome: 'Quadra 02', linhas: [range(26, 50)] },
  { id: 'Q03', nome: 'Quadra 03', linhas: [range(1, 20), range(21, 38)] },
  { id: 'Q04', nome: 'Quadra 04', linhas: [range(1, 25), range(26, 50)] },
  { id: 'Q05', nome: 'Quadra 05', linhas: [range(3, 16), range(19, 30)] },
  { id: 'Q06', nome: 'Quadra 06', linhas: [range(1, 25), range(26, 50)] },
  { id: 'Q07', nome: 'Quadra 07', linhas: [range(28, 47)] },
];
QUADRAS.forEach((q) => { q.lotes = q.linhas.flat(); });

export function casaId(q, l) { return q + '-' + String(l).padStart(2, '0'); }

const SEQUENCIA_PRODUCAO = [
  { ordem: 1, bloco: 'Q06 inf', quadra: 'Q06', lotes: rangeDesc(26, 50) },
  { ordem: 2, bloco: 'Q05 inf', quadra: 'Q05', lotes: rangeDesc(19, 30) },
  { ordem: 3, bloco: 'Q04 inf', quadra: 'Q04', lotes: rangeDesc(26, 50) },
  { ordem: 4, bloco: 'Q05 sup', quadra: 'Q05', lotes: rangeDesc(3, 16) },
  { ordem: 5, bloco: 'Q03 inf', quadra: 'Q03', lotes: rangeDesc(21, 38) },
  { ordem: 6, bloco: 'Q04 sup', quadra: 'Q04', lotes: rangeDesc(1, 25) },
  { ordem: 7, bloco: 'Q02', quadra: 'Q02', lotes: rangeDesc(26, 50) },
  { ordem: 8, bloco: 'Q03 sup', quadra: 'Q03', lotes: rangeDesc(1, 20) },
  { ordem: 9, bloco: 'Q01', quadra: 'Q01', lotes: rangeDesc(44, 48) },
  { ordem: 10, bloco: 'Q07', quadra: 'Q07', lotes: rangeDesc(28, 47) },
  { ordem: 11, bloco: 'Q06 sup', quadra: 'Q06', lotes: rangeDesc(1, 25) },
];
const FILA_SEQUENCIA = SEQUENCIA_PRODUCAO.flatMap((b) => b.lotes.map((l) => casaId(b.quadra, l)));
function filaEtapaPendente(srvId) {
  return FILA_SEQUENCIA.filter((cid) => !(estado.casas[cid] && estado.casas[cid][srvId]));
}

export const SERVICOS = [
  { id: 'R', nome: 'Radier', resp: 'Danilo', teto: 3.0, pctAtencao: 10, dataMeta: '2026-05-29' },
  { id: 'F', nome: 'Fabricação', resp: 'José Felipe', teto: 2.5, pctAtencao: 10, dataMeta: '2026-06-16' },
  { id: 'M', nome: 'Montagem', resp: 'José Felipe', teto: 2.5, pctAtencao: 10, dataMeta: '2026-06-18' },
  { id: 'A1', nome: 'Acabamento 1', resp: 'Danilo', teto: 2.5, pctAtencao: 10, dataMeta: '2026-06-30' },
  { id: 'A2', nome: 'Acabamento 2', resp: 'Danilo', teto: 2.5, pctAtencao: 10, dataMeta: '2026-07-06' },
  { id: 'I1', nome: 'Infra-Pós 1', resp: 'Eduardo', teto: 3.0, pctAtencao: 10, dataMeta: '2026-07-06' },
  { id: 'I2', nome: 'Infra-Pós 2', resp: 'Eduardo', teto: 3.0, pctAtencao: 10, dataMeta: '2026-07-06' },
  { id: 'LF', nome: 'Limpeza Final', resp: '', teto: null, pctAtencao: null, dataMeta: '2026-07-06', marcador: true },
];

const ACOES_SEED = [
  { id: 'a1', resp: 'Danilo', desc: 'Receber 1ª empresa terceirizada ACAB1', due: '12/05', dueDt: '2026-05-12' },
  { id: 'a2', resp: 'Synara+Danilo', desc: 'Aplicativo dos supervisores em uso', due: '12/05', dueDt: '2026-05-12' },
  { id: 'a3', resp: 'Danilo', desc: 'Plano de corte de despesas mai+jun (alvo R$ 350k/mês)', due: '11/05', dueDt: '2026-05-11' },
  { id: 'a4', resp: 'José Felipe', desc: 'Lançar NC do estouro de % Rendimento da Fábrica abril', due: '15/05', dueDt: '2026-05-15' },
  { id: 'a5', resp: 'José Felipe', desc: 'Acelerar contratações para fechar quadro (35% incompleto)', due: '30/05', dueDt: '2026-05-30' },
  { id: 'a6', resp: 'Eduardo', desc: 'Sustentar acesso do Monteiro pronto antes das 7h', due: 'diário', dueDt: null },
  { id: 'a7', resp: 'José Felipe', desc: 'Validar queda de retrabalho na 1ª quadra com régua corrigida', due: '30/05', dueDt: '2026-05-30' },
  { id: 'a8', resp: 'Synara+Eduardo', desc: 'Falta Entrar Infra revisado + aditivos lançados', due: '22/05', dueDt: '2026-05-22' },
  { id: 'a9', resp: 'Synara+Sena', desc: 'Olé Vision: 1ª saída concreta da IA', due: '30/05', dueDt: '2026-05-30' },
  { id: 'a10', resp: 'Léo+Anna K.', desc: 'Pré-AR Suprimentos Produção EC', due: '12-16/05', dueDt: '2026-05-16' },
  { id: 'a11', resp: 'Danilo+RH', desc: 'G9 ativado (grupo próprio)', due: '02/06', dueDt: '2026-06-02' },
  { id: 'a12', resp: 'Eduardo+Controladoria', desc: 'Abertura de "material aplicado" por subconta', due: '30/05', dueDt: '2026-05-30' },
  { id: 'a13', resp: 'Danilo+RH', desc: 'G10 mapeado e prospecção concluída', due: '30/06', dueDt: '2026-06-30' },
  { id: 'a14', resp: 'Felipe Holanda', desc: 'Definir SPE do Riemburgo', due: '31/05', dueDt: '2026-05-31' },
];

const SEMANA_RANGES = [
  { id: 's1', label: 'S1 — 11-15/05', ini: '2026-05-09', fim: '2026-05-15' },
  { id: 's2', label: 'S2 — 18-22/05', ini: '2026-05-16', fim: '2026-05-22' },
  { id: 's3', label: 'S3 — 25-29/05', ini: '2026-05-23', fim: '2026-05-29' },
  { id: 's4', label: 'S4 — 01-05/06', ini: '2026-05-30', fim: '2026-06-05' },
  { id: 's5', label: 'S5 — 08-12/06', ini: '2026-06-06', fim: '2026-06-12' },
  { id: 's6', label: 'S6 — 15-19/06', ini: '2026-06-13', fim: '2026-06-19' },
  { id: 's7', label: 'S7 — 22-26/06', ini: '2026-06-20', fim: '2026-06-26' },
  { id: 's8', label: 'S8 — 29/06-03/07', ini: '2026-06-27', fim: '2026-07-03' },
  { id: 's9', label: 'S9 — 06-10/07', ini: '2026-07-04', fim: '2026-07-10' },
];

export const TOTAL_CASAS = QUADRAS.reduce((a, q) => a + q.lotes.length, 0); // 214

// ----------------------------- ESTADO -----------------------------
let estado = emptyState();
let _onSave = null; // callback registrado pelo componente (persiste no Postgres)

function emptyState() {
  return { casas: {}, acoes: {}, lista: null, srvCfg: {}, snapshots: {}, ppc: {}, activeTab: 'visao' };
}

export function getEstado() { return estado; }

export function setEstado(novo) {
  estado = Object.assign(emptyState(), novo || {});
  aplicarBaseInicial();
}

export function registerSave(cb) { _onSave = cb; }

export function salvar() {
  estado.lastSaved = new Date().toISOString();
  if (_onSave) _onSave(estado);
}

// Estado base inicial — aplica UMA VEZ por versão (Q07/Q06/Q05/Q04-inf já concluídas).
function aplicarBaseInicial() {
  if (estado.baseInicialV4) return;
  estado.baseInicialV4 = true;
  if (!estado.casas) estado.casas = {};
  const blocos = [
    { quadra: 'Q07', lotes: range(28, 47) },
    { quadra: 'Q06', lotes: range(1, 50) },
    { quadra: 'Q05', lotes: [...range(3, 16), ...range(19, 30)] },
    { quadra: 'Q04', lotes: range(26, 50) },
  ];
  blocos.forEach((b) => b.lotes.forEach((l) => {
    const cid = casaId(b.quadra, l);
    estado.casas[cid] = estado.casas[cid] || {};
    SERVICOS.forEach((s) => { estado.casas[cid][s.id] = true; });
  }));
}

// ----------------------------- HELPERS -----------------------------
function diasUteisAte(data) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const fim = new Date(data); fim.setHours(0, 0, 0, 0);
  let count = 0; const cur = new Date(hoje);
  while (cur <= fim) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count - 1);
}
function diasUteisEntre(d1, d2) {
  const a = new Date(d1); a.setHours(0, 0, 0, 0);
  const b = new Date(d2); b.setHours(0, 0, 0, 0);
  if (b < a) return 0;
  let count = 0; const cur = new Date(a);
  while (cur <= b) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
function getSrvMeta(srvId) {
  if (estado.srvCfg && estado.srvCfg[srvId] && estado.srvCfg[srvId].meta != null) return parseInt(estado.srvCfg[srvId].meta);
  return TOTAL_CASAS;
}
function getSrvTeto(srvId) {
  if (estado.srvCfg && estado.srvCfg[srvId] && estado.srvCfg[srvId].teto !== undefined) {
    const v = estado.srvCfg[srvId].teto;
    if (v === '' || v === null) return null;
    return parseFloat(v);
  }
  const s = SERVICOS.find((x) => x.id === srvId);
  return s ? s.teto : null;
}
function ehMarcador(srvId) {
  const s = SERVICOS.find((x) => x.id === srvId);
  return s && s.marcador === true;
}
function getSrvPctAtencao(srvId) {
  if (estado.srvCfg && estado.srvCfg[srvId] && estado.srvCfg[srvId].pctAtencao !== undefined) {
    const v = estado.srvCfg[srvId].pctAtencao;
    if (v === '' || v === null) return 10;
    return parseFloat(v);
  }
  const s = SERVICOS.find((x) => x.id === srvId);
  return (s && s.pctAtencao != null) ? s.pctAtencao : 10;
}
function getSrvDataMeta(srvId) {
  if (estado.srvCfg && estado.srvCfg[srvId] && estado.srvCfg[srvId].dataMeta) return estado.srvCfg[srvId].dataMeta;
  const s = SERVICOS.find((x) => x.id === srvId);
  return s ? s.dataMeta : '2026-07-06';
}
function contarSrv(srvId) {
  let count = 0;
  QUADRAS.forEach((q) => q.lotes.forEach((l) => {
    const cid = casaId(q.id, l);
    if (estado.casas[cid]?.[srvId]) count++;
  }));
  return count;
}
function casaCompleta(cid) {
  const c = estado.casas[cid];
  if (!c) return false;
  return SERVICOS.every((s) => c[s.id]);
}
function casasFaturadas() {
  let count = 0;
  QUADRAS.forEach((q) => q.lotes.forEach((l) => { if (casaCompleta(casaId(q.id, l))) count++; }));
  return count;
}
function etapaAtual(cid) {
  const c = estado.casas[cid];
  if (!c) return '';
  let ultima = '';
  for (const s of SERVICOS) { if (c[s.id]) ultima = s.id; else break; }
  return ultima;
}

// ----------------------------- UI STATE -----------------------------
let modoAtual = 'ALL';
let curvaFiltro = 'ALL';
export function getModo() { return modoAtual; }
export function setModo(m) { modoAtual = m; }
export function getCurvaFiltro() { return curvaFiltro; }
export function setCurvaFiltro(f) { curvaFiltro = f; }
export function setActiveTab(tab) { estado.activeTab = tab; salvar(); }

// ----------------------------- MUTAÇÕES -----------------------------
export function toggleEtapa(cid, srv) {
  if (!estado.casas[cid]) estado.casas[cid] = {};
  estado.casas[cid][srv] = !estado.casas[cid][srv];
  salvar();
}
export function salvarPopup(cid, tmp) {
  estado.casas[cid] = { ...tmp };
  salvar();
}
export function getCasa(cid) { return estado.casas[cid] || {}; }

export function getAcoes() {
  if (!estado.lista) return ACOES_SEED.slice();
  return estado.lista;
}
export function adicionarAcao({ resp, desc, dueDt }) {
  const due = dueDt ? new Date(dueDt + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
  const novo = { id: 'c-' + Date.now(), resp, desc, due, dueDt: dueDt || null };
  const lista = getAcoes(); lista.push(novo);
  estado.lista = lista;
  salvar();
}
export function excluirAcao(id) {
  const lista = getAcoes().filter((a) => a.id !== id);
  estado.lista = lista;
  if (estado.acoes && estado.acoes[id]) delete estado.acoes[id];
  salvar();
}
export function restaurarPadrao() {
  estado.lista = null;
  if (estado.acoes) { Object.keys(estado.acoes).forEach((k) => { if (k.startsWith('c-')) delete estado.acoes[k]; }); }
  salvar();
}
export function setActionStatus(id, status) {
  if (!estado.acoes[id]) estado.acoes[id] = {};
  estado.acoes[id].status = status;
  salvar();
}
export function setCfg(sId, field, value) {
  if (!estado.srvCfg) estado.srvCfg = {};
  if (!estado.srvCfg[sId]) estado.srvCfg[sId] = {};
  estado.srvCfg[sId][field] = value;
  salvar();
}

function semanaDaAcao(a) {
  if (!a.dueDt) return 'continuas';
  const d = new Date(a.dueDt + 'T00:00:00');
  for (const r of SEMANA_RANGES) {
    const di = new Date(r.ini + 'T00:00:00');
    const df = new Date(r.fim + 'T23:59:59');
    if (d >= di && d <= df) return r.id;
  }
  return 'outras';
}
function semanaAtualId() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  for (const r of SEMANA_RANGES) {
    const df = new Date(r.fim + 'T23:59:59');
    if (hoje <= df) return r.id;
  }
  return null;
}

// ----------------------------- CURVA S -----------------------------
const SEMESTRE_INI = '2026-01-01';
const SEMESTRE_FIM = '2026-07-06';
function totalMetaSelinhos() { let t = 0; SERVICOS.forEach((s) => t += getSrvMeta(s.id)); return t; }
function totalSelinhosMarcados() { let t = 0; SERVICOS.forEach((s) => t += contarSrv(s.id)); return t; }
function metaCurva(filtro) { return filtro === 'ALL' ? totalMetaSelinhos() : getSrvMeta(filtro); }
function realCurva(filtro) { return filtro === 'ALL' ? totalSelinhosMarcados() : contarSrv(filtro); }
function previstoEmDataEtapa(target, srvId) {
  const ini = new Date(SEMESTRE_INI + 'T00:00:00');
  const meta = getSrvMeta(srvId);
  const dataMeta = new Date(getSrvDataMeta(srvId) + 'T23:59:59');
  const totalDias = diasUteisEntre(ini, dataMeta);
  const ritmo = totalDias > 0 ? meta / totalDias : 0;
  const fimEf = target < dataMeta ? target : dataMeta;
  if (fimEf < ini) return 0;
  const diasAcum = diasUteisEntre(ini, fimEf);
  return Math.min(meta, ritmo * diasAcum);
}
function previstoEmData(target, filtro) {
  filtro = filtro || 'ALL';
  if (filtro === 'ALL') { let total = 0; SERVICOS.forEach((s) => total += previstoEmDataEtapa(target, s.id)); return total; }
  return previstoEmDataEtapa(target, filtro);
}
function snapValor(snap, filtro) {
  if (filtro === 'ALL') return snap.total;
  return snap.porEtapa?.[filtro] ?? null;
}
function gerarPontosEixoX() {
  const ini = new Date(SEMESTRE_INI + 'T00:00:00');
  const fim = new Date(SEMESTRE_FIM + 'T23:59:59');
  const pontos = []; const cur = new Date(ini);
  while (cur <= fim) { pontos.push(new Date(cur)); cur.setDate(cur.getDate() + 14); }
  if (pontos[pontos.length - 1].getTime() < fim.getTime()) pontos.push(fim);
  return pontos;
}
function semanaAtualIdx() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < SEMANA_RANGES.length; i++) {
    const ini = new Date(SEMANA_RANGES[i].ini + 'T00:00:00');
    const fim = new Date(SEMANA_RANGES[i].fim + 'T23:59:59');
    if (ini <= hoje && hoje <= fim) return i;
  }
  const ultFim = new Date(SEMANA_RANGES[SEMANA_RANGES.length - 1].fim + 'T23:59:59');
  if (hoje > ultFim) return SEMANA_RANGES.length - 1;
  return -1;
}
export function capturarSnapshot() {
  const idx = semanaAtualIdx();
  if (idx < 0) return { ok: false, msg: 'Estamos fora do período do plano (S1-S9).' };
  const w = SEMANA_RANGES[idx];
  const total = totalSelinhosMarcados();
  const meta = totalMetaSelinhos();
  const pct = meta > 0 ? (total / meta) * 100 : 0;
  const porEtapa = {};
  SERVICOS.forEach((s) => porEtapa[s.id] = contarSrv(s.id));
  if (!estado.snapshots) estado.snapshots = {};
  estado.snapshots[w.id] = { total, porEtapa, pct, data: new Date().toISOString() };
  salvar();
  return { ok: true, msg: `Snapshot de ${w.label} salvo: ${pct.toFixed(1)}% (${total} selinhos no consolidado).` };
}
export function apagarSnapshot(semId) {
  if (estado.snapshots && estado.snapshots[semId]) { delete estado.snapshots[semId]; salvar(); }
}

// ----------------------------- BUILDERS (HTML strings) -----------------------------
export function buildMapa() {
  let out = '';
  const renderCasa = (q, l) => {
    const cid = casaId(q.id, l);
    const c = estado.casas[cid] || {};
    const isFull = casaCompleta(cid);
    const stage = etapaAtual(cid);
    const stageLabel = isFull ? '✓ FAT' : (stage || '—');
    let classe = ''; let dataStage = stage || '0';
    if (modoAtual === 'ALL') { if (isFull) classe = 'full'; }
    else if (modoAtual === 'FAT') { classe = isFull ? 'focus-on' : 'focus-off'; dataStage = '0'; }
    else { classe = c[modoAtual] ? 'focus-on' : 'focus-off'; dataStage = '0'; }
    return `<div class="casa ${classe}" data-stage="${dataStage}" data-cid="${cid}" title="Casa ${cid} · ${stage ? 'etapa atual: ' + stage : 'nenhuma etapa'}">
      <div class="casa-num">${q.id}-${String(l).padStart(2, '0')}</div>
      <div class="casa-stage">${stageLabel}</div>
    </div>`;
  };
  QUADRAS.forEach((q, idx) => {
    const ga = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'][idx];
    const fat = q.lotes.filter((l) => casaCompleta(casaId(q.id, l))).length;
    let linhasHtml = '';
    q.linhas.forEach((linha) => { linhasHtml += `<div class="quadra-linha">${linha.map((l) => renderCasa(q, l)).join('')}</div>`; });
    out += `<div class="quadra" style="grid-area:${ga}">
      <div class="quadra-header">
        <span class="quadra-nome">${q.nome}</span>
        <span class="quadra-stat"><b>${fat}/${q.lotes.length}</b> faturadas</span>
      </div>
      <div class="quadra-lotes">${linhasHtml}</div>
    </div>`;
  });
  return out;
}

export function modoHintHtml() {
  if (modoAtual === 'ALL') return '<strong>Modo Etapa Atual:</strong> cada casa mostra a cor da última etapa concluída. Click numa casa abre as 7 etapas pra marcar/desmarcar.';
  if (modoAtual === 'FAT') return '<strong>Modo Faturadas:</strong> casas verdes = todas as 7 etapas concluídas (prontas para faturar). Click numa casa abre o detalhe.';
  const srv = SERVICOS.find((s) => s.id === modoAtual);
  return `<strong>Modo ${srv.nome}:</strong> casas verdes = ${srv.nome} concluído. Click numa casa <strong>alterna feito/não feito</strong> dessa etapa só (rápido para revisão em massa).`;
}

export function buildKPIs() {
  const faturadas = casasFaturadas();
  let totFeito = 0, totMeta = 0;
  SERVICOS.forEach((s) => { totFeito += contarSrv(s.id); totMeta += getSrvMeta(s.id); });
  const pctG = totMeta > 0 ? (totFeito / totMeta) * 100 : 0;

  let etapasGrid = '';
  SERVICOS.forEach((s) => {
    const feito = contarSrv(s.id); const meta = getSrvMeta(s.id);
    const pct = meta > 0 ? (feito / meta) * 100 : 0;
    etapasGrid += `<div class="etapa-card" data-srv="${s.id}">
      <div class="nome">${s.id} · ${s.nome}</div>
      <div class="pct">${pct.toFixed(1)}%</div>
      <div class="det">${feito}/${meta} · falta ${Math.max(0, meta - feito)}</div>
      <div class="bar"><div style="width:${Math.min(100, pct)}%"></div></div>
    </div>`;
  });

  const dist = { '0': 0 };
  SERVICOS.forEach((s) => dist[s.id] = 0);
  const ultimaEtapaId = SERVICOS[SERVICOS.length - 1].id;
  QUADRAS.forEach((q) => q.lotes.forEach((l) => {
    const cid = casaId(q.id, l);
    if (casaCompleta(cid)) { dist[ultimaEtapaId]++; return; }
    const st = etapaAtual(cid) || '0';
    dist[st] = (dist[st] || 0) + 1;
  }));
  let maxStage = null, maxCount = 0;
  SERVICOS.slice(0, -1).forEach((s) => { if (dist[s.id] > maxCount) { maxCount = dist[s.id]; maxStage = s.id; } });
  let distribuicaoGrid = '';
  const cards = [{ id: '0', nome: 'Não iniciada', count: dist['0'] }, ...SERVICOS.map((s) => ({ id: s.id, nome: s.nome, count: dist[s.id] || 0 }))];
  cards.forEach((card) => {
    const isGargalo = card.id === maxStage && card.count > 0;
    const isFat = card.id === ultimaEtapaId;
    const lblExtra = isGargalo ? ' <span class="tag tag-red" style="font-size:9px;padding:1px 5px">GARGALO</span>' : isFat ? ' <span class="tag tag-green" style="font-size:9px;padding:1px 5px">FATURADAS</span>' : '';
    distribuicaoGrid += `<div class="etapa-card" data-srv="${card.id !== '0' ? card.id : ''}">
      <div class="nome">${card.id === '0' ? '—' : card.id} · ${card.nome}${lblExtra}</div>
      <div class="pct">${card.count}</div>
      <div class="det">${card.count === 1 ? 'casa nesta etapa' : 'casas nesta etapa'}</div>
    </div>`;
  });

  return {
    faturadas: faturadas + '/' + TOTAL_CASAS,
    global: pctG.toFixed(1) + '%',
    globalWidth: Math.min(100, pctG),
    etapasGrid, distribuicaoGrid,
  };
}

export function buildProdTbody() {
  let html = '';
  SERVICOS.forEach((s) => {
    const feito = contarSrv(s.id); const meta = getSrvMeta(s.id);
    const falta = Math.max(0, meta - feito);
    const dataMeta = getSrvDataMeta(s.id);
    const dias = diasUteisAte(dataMeta);
    const teto = getSrvTeto(s.id);
    const isMarcador = ehMarcador(s.id);
    const necessaria = dias > 0 ? falta / dias : 0;
    let statusCls = 'alert-green', statusTxt = '🟢 OK';
    const pctAt = getSrvPctAtencao(s.id);
    const limAmarelo = teto !== null ? teto * (1 - pctAt / 100) : null;
    if (isMarcador) { statusCls = 'txt2'; statusTxt = '⚪ Marcador'; }
    else if (falta === 0) { statusCls = 'alert-green'; statusTxt = '✅ Concluído'; }
    else if (teto !== null && necessaria > teto) { statusCls = 'alert-red'; statusTxt = '🔴 Acima do teto'; }
    else if (limAmarelo !== null && necessaria > limAmarelo) { statusCls = 'alert-yellow'; statusTxt = `🟡 Apertado (>${(100 - pctAt).toFixed(0)}% do teto)`; }
    const dataFmt = new Date(dataMeta + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const necTxt = isMarcador ? '—' : `${necessaria.toFixed(2)}/dia`;
    const tetoTxt = (teto === null) ? '—' : teto.toFixed(2);
    html += `<tr>
      <td><strong>${s.id} · ${s.nome}</strong>${isMarcador ? ' <span class="tag tag-blue" style="font-size:9px;padding:1px 5px;margin-left:4px">MARCADOR</span>' : ''}</td>
      <td class="txt2">${s.resp}</td>
      <td class="num">${meta}</td>
      <td class="num">${feito}</td>
      <td class="num">${falta}</td>
      <td class="txt2">${dataFmt}</td>
      <td class="num">${dias}</td>
      <td class="num">${necTxt}</td>
      <td class="txt2">${tetoTxt}</td>
      <td class="${statusCls}">${statusTxt}</td>
    </tr>`;
  });
  return html;
}

export function buildAlertList() {
  const alerts = [];
  SERVICOS.forEach((s) => {
    if (ehMarcador(s.id)) return;
    const feito = contarSrv(s.id); const meta = getSrvMeta(s.id);
    const falta = Math.max(0, meta - feito);
    if (falta === 0) return;
    const dias = diasUteisAte(getSrvDataMeta(s.id));
    const teto = getSrvTeto(s.id);
    if (teto === null) return;
    const necessaria = dias > 0 ? falta / dias : 9999;
    const pctAt = getSrvPctAtencao(s.id);
    const limAmarelo = teto * (1 - pctAt / 100);
    if (necessaria > teto) alerts.push(`🔴 <strong>${s.nome}</strong> precisa de ${necessaria.toFixed(2)}/dia mas o teto é ${teto.toFixed(2)}/dia (resp. ${s.resp})`);
    else if (necessaria > limAmarelo) alerts.push(`🟡 <strong>${s.nome}</strong> apertado: ${necessaria.toFixed(2)}/dia (limite ${limAmarelo.toFixed(2)} = ${100 - pctAt}% do teto ${teto.toFixed(2)})`);
  });
  if (alerts.length === 0) return '<div class="alert-item">✅ Todas as etapas estão dentro do teto realista.</div>';
  return alerts.map((a) => `<div class="alert-item">${a}</div>`).join('');
}

export function dataProjetada() {
  const srvComTeto = SERVICOS.filter((s) => getSrvTeto(s.id) !== null && !ehMarcador(s.id));
  const ultimaSrv = srvComTeto[srvComTeto.length - 1] || SERVICOS[SERVICOS.length - 1];
  const feitoI2 = contarSrv(ultimaSrv.id);
  const metaI2 = getSrvMeta(ultimaSrv.id);
  const tetoI2 = getSrvTeto(ultimaSrv.id) || 3;
  const falta = metaI2 - feitoI2;
  if (falta <= 0) return 'Concluído ✓';
  const diasNec = Math.ceil(falta / tetoI2);
  const proj = new Date(); proj.setHours(0, 0, 0, 0);
  let added = 0;
  while (added < diasNec) {
    proj.setDate(proj.getDate() + 1);
    const d = proj.getDay();
    if (d !== 0 && d !== 6) added++;
  }
  return proj.toLocaleDateString('pt-BR');
}

export function headerInfo() {
  return {
    today: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }),
    diasRest: diasUteisAte('2026-07-06') + ' dias úteis',
    dataProj: dataProjetada(),
  };
}

export function buildActionList() {
  const acoesAll = getAcoes();
  const grupos = {}; SEMANA_RANGES.forEach((r) => grupos[r.id] = []);
  grupos.continuas = []; grupos.outras = [];
  acoesAll.forEach((a) => { const g = semanaDaAcao(a); grupos[g].push(a); });
  const semAtId = semanaAtualId();
  const renderAcao = (a) => {
    const st = estado.acoes[a.id]?.status || 'pendente';
    const cls = st === 'concluido' ? 'done' : '';
    return `<div class="action ${cls}">
      <select data-id="${a.id}">
        <option value="pendente" ${st === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
        <option value="emcurso" ${st === 'emcurso' ? 'selected' : ''}>🔵 Em curso</option>
        <option value="risco" ${st === 'risco' ? 'selected' : ''}>⚠️ Em risco</option>
        <option value="concluido" ${st === 'concluido' ? 'selected' : ''}>✅ Concluído</option>
      </select>
      <div class="desc"><span class="resp">${a.resp}</span> — ${a.desc}</div>
      <div class="due">${a.due}</div>
      <button class="del" data-del="${a.id}">×</button>
    </div>`;
  };
  let html = '';
  SEMANA_RANGES.forEach((r) => {
    if (grupos[r.id].length === 0) return;
    const curCls = r.id === semAtId ? ' current' : '';
    const tag = r.id === semAtId ? ' <span class="tag tag-blue" style="font-size:9px;padding:1px 6px">ATUAL</span>' : '';
    html += `<div class="week-group">
      <div class="week-header${curCls}">📅 ${r.label}${tag}<span class="count">${grupos[r.id].length}</span></div>
      ${grupos[r.id].map(renderAcao).join('')}
    </div>`;
  });
  if (grupos.continuas.length) html += `<div class="week-group"><div class="week-header continuas">🔁 Contínuas<span class="count">${grupos.continuas.length}</span></div>${grupos.continuas.map(renderAcao).join('')}</div>`;
  if (grupos.outras.length) html += `<div class="week-group"><div class="week-header outras">📌 Outras datas<span class="count">${grupos.outras.length}</span></div>${grupos.outras.map(renderAcao).join('')}</div>`;
  if (!html) html = '<div class="alert-item">📝 Nenhuma ação cadastrada.</div>';

  const pend = acoesAll.filter((a) => estado.acoes[a.id]?.status !== 'concluido').length;
  const cust = acoesAll.filter((a) => a.id.startsWith('c-')).length;
  return {
    html,
    resumo: `${acoesAll.length} ações · ${pend} pendentes${cust > 0 ? ` · ${cust} suas` : ''}`,
    badge: pend,
  };
}

export function buildCfgTbody() {
  let html = '';
  SERVICOS.forEach((s) => {
    const meta = getSrvMeta(s.id);
    const teto = getSrvTeto(s.id);
    const dataMeta = getSrvDataMeta(s.id);
    const isMarcador = ehMarcador(s.id);
    const tetoVal = teto === null ? '' : teto;
    const pctAt = getSrvPctAtencao(s.id);
    const pctVal = isMarcador ? '' : pctAt;
    html += `<tr>
      <td><strong>${s.id} · ${s.nome}</strong>${isMarcador ? ' <span class="tag tag-blue" style="font-size:9px;padding:1px 5px;margin-left:4px">MARCADOR</span>' : ''}</td>
      <td class="txt2">${s.resp}</td>
      <td><input type="number" min="0" max="${TOTAL_CASAS}" value="${meta}" data-cfg="${s.id}" data-field="meta" style="width:70px"></td>
      <td><input type="date" value="${dataMeta}" data-cfg="${s.id}" data-field="dataMeta"></td>
      <td><input type="number" step="0.01" min="0" value="${tetoVal}" data-cfg="${s.id}" data-field="teto" style="width:70px" placeholder="${isMarcador ? 'sem teto' : ''}"></td>
      <td><input type="number" step="1" min="0" max="100" value="${pctVal}" data-cfg="${s.id}" data-field="pctAtencao" style="width:70px" placeholder="${isMarcador ? '—' : '10'}" ${isMarcador ? 'disabled' : ''}> %</td>
    </tr>`;
  });
  return html;
}

// Dados de configuração por etapa (para inputs React de verdade, sem innerHTML)
export function cfgRows() {
  return SERVICOS.map((s) => {
    const teto = getSrvTeto(s.id);
    const marcador = ehMarcador(s.id);
    return {
      id: s.id,
      nome: s.nome,
      resp: s.resp,
      meta: getSrvMeta(s.id),
      dataMeta: getSrvDataMeta(s.id),
      teto: teto === null ? '' : teto,
      pctAtencao: marcador ? '' : getSrvPctAtencao(s.id),
      marcador,
    };
  });
}

export function buildEstrutura() {
  let estHtml = '<table><thead><tr><th>Quadra</th><th>Lotes amarelos</th><th>Total</th></tr></thead><tbody>';
  QUADRAS.forEach((q) => {
    const min = Math.min(...q.lotes), max = Math.max(...q.lotes);
    const rng = q.lotes.length === (max - min + 1) ? `${min}-${max}` : q.lotes.join(', ');
    estHtml += `<tr><td><strong>${q.nome}</strong></td><td class="txt2">${rng}</td><td class="num">${q.lotes.length}</td></tr>`;
  });
  estHtml += `<tr style="border-top:2px solid var(--accent)"><td><strong>TOTAL</strong></td><td></td><td class="num"><strong>${TOTAL_CASAS}</strong></td></tr>`;
  estHtml += '</tbody></table>';
  return estHtml;
}

// Popup (lista de serviços com base no estado temporário)
export function buildPopupList(tmp) {
  return SERVICOS.map((s, i) => {
    const on = tmp[s.id] ? ' on' : '';
    return `<div class="popup-srv${on}" data-s="${s.id}">
      <div class="check">${tmp[s.id] ? '✓' : ''}</div>
      <span class="color-tag"></span>
      <span class="nome">${i + 1}. ${s.id} · ${s.nome}</span>
    </div>`;
  }).join('');
}
export function casaClickAbrePopup() { return modoAtual === 'ALL' || modoAtual === 'FAT'; }

// ----------------------------- CRONOGRAMA -----------------------------
function renderMiniMapa(srvId, srvNome, casasIds) {
  const setCasas = new Set(casasIds);
  const ordemPorCid = {};
  casasIds.forEach((cid, i) => ordemPorCid[cid] = i + 1);
  let bodyHtml = '';
  QUADRAS.forEach((q, idx) => {
    const ga = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'][idx];
    const algumNaSemana = q.lotes.some((l) => setCasas.has(casaId(q.id, l)));
    let linhasHtml = '';
    q.linhas.forEach((linha) => {
      let linhaHtml = '';
      linha.forEach((l) => {
        const cid = casaId(q.id, l);
        const isTarget = setCasas.has(cid);
        if (isTarget) linhaHtml += `<span class="mini-casa target" data-srv="${srvId}" title="${cid} · ${srvNome} (ordem ${ordemPorCid[cid]})">${String(l).padStart(2, '0')}</span>`;
        else linhaHtml += `<span class="mini-casa" title="${cid}">${String(l).padStart(2, '0')}</span>`;
      });
      linhasHtml += `<div class="mini-linha">${linhaHtml}</div>`;
    });
    bodyHtml += `<div class="mini-quadra" style="grid-area:${ga};${algumNaSemana ? '' : 'opacity:.55'}">
      <div class="mini-quadra-nome">${q.nome}</div>
      <div class="mini-quadra-linhas">${linhasHtml}</div>
    </div>`;
  });
  return `<div class="mini-mapa-section">
    <div class="mini-mapa-title collapsed">
      <span class="srv-dot" style="background:var(--srv-${srvId})"></span>
      <span>${srvId} · ${srvNome}</span>
      <span class="chevron">▾</span>
      <span class="count">${casasIds.length} ${casasIds.length === 1 ? 'casa' : 'casas'}</span>
    </div>
    <div class="mini-mapa-wrap collapsed">
      <div class="mini-mapa-body collapsed">${bodyHtml}</div>
    </div>
  </div>`;
}

export function buildCronograma() {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const ritmos = {};
  SERVICOS.forEach((s) => {
    if (ehMarcador(s.id)) return;
    const teto = getSrvTeto(s.id);
    if (teto === null) return;
    const feito = contarSrv(s.id); const meta = getSrvMeta(s.id);
    const falta = Math.max(0, meta - feito);
    const dataMeta = new Date(getSrvDataMeta(s.id) + 'T23:59:59');
    const diasRest = diasUteisEntre(hoje, dataMeta);
    ritmos[s.id] = {
      srv: s, falta, teto, dataMeta,
      ritmoNec: diasRest > 0 ? falta / diasRest : (falta > 0 ? Infinity : 0),
      fila: filaEtapaPendente(s.id),
      posAcumulada: 0,
    };
  });

  let html = '';
  SEMANA_RANGES.forEach((w) => {
    const wIni = new Date(w.ini + 'T00:00:00');
    const wFim = new Date(w.fim + 'T23:59:59');
    const isPassada = wFim < hoje;
    const isAtual = wIni <= hoje && hoje <= wFim;
    let cls = '';
    if (isAtual) cls = 'atual'; else if (isPassada) cls = 'passada';

    const diasUteisSemana = diasUteisEntre(wIni, wFim);
    let rows = ''; let totalCasas = 0;
    const casasPorEtapa = {};
    SERVICOS.forEach((s) => {
      const r = ritmos[s.id];
      if (!r) return;
      if (r.falta === 0) return;
      let janIni = isAtual ? hoje : wIni;
      if (janIni > wFim) return;
      let janFim = (r.dataMeta < wFim) ? r.dataMeta : wFim;
      if (janIni > janFim) return;
      const diasJanela = diasUteisEntre(janIni, janFim);
      if (diasJanela === 0) return;
      if (isPassada) return;
      const metaSem = r.ritmoNec * diasJanela;
      if (metaSem <= 0) return;
      const ritmoDia = metaSem / diasJanela;
      const isAcima = ritmoDia > r.teto + 0.001;
      const statusCls = isAcima ? 'alert-red' : 'alert-green';
      const statusTxt = isAcima ? '🔴 acima do teto' : '🟢 viável';
      totalCasas += metaSem;
      const posIni = Math.floor(r.posAcumulada);
      const posFim = Math.min(r.fila.length, Math.ceil(r.posAcumulada + metaSem));
      const casasSemana = r.fila.slice(posIni, posFim);
      r.posAcumulada += metaSem;
      casasPorEtapa[s.id] = { casas: casasSemana, count: casasSemana.length };
      rows += `<tr>
        <td><strong>${s.id}</strong> · ${s.nome} <span class="txt2">· ${s.resp}</span></td>
        <td class="num">${metaSem.toFixed(1)}</td>
        <td class="num">${diasJanela}</td>
        <td class="num">${ritmoDia.toFixed(2)}/dia</td>
        <td class="txt2">${r.teto.toFixed(2)}/dia</td>
        <td class="${statusCls}">${statusTxt}</td>
      </tr>`;
    });

    let tagsHead = '';
    if (isAtual) tagsHead = '<span class="tag tag-blue">ATUAL</span>';
    else if (isPassada) tagsHead = '<span class="tag" style="background:#f1f5f9;color:#64748b;border:1px solid var(--border)">PASSADA</span>';

    let inner = '';
    if (isPassada) inner = '<div class="txt2" style="padding:10px;text-align:center">Semana já encerrada.</div>';
    else if (!rows) inner = '<div class="txt2" style="padding:10px;text-align:center">✅ Sem metas pendentes nesta semana.</div>';
    else {
      inner = `<table>
        <thead><tr><th>Etapa</th><th>Meta</th><th>Dias úteis</th><th>Ritmo/dia</th><th>Teto</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
      let mapasHtml = '';
      SERVICOS.forEach((s) => {
        const dados = casasPorEtapa[s.id];
        if (!dados || dados.count === 0) return;
        mapasHtml += renderMiniMapa(s.id, s.nome, dados.casas);
      });
      if (mapasHtml) inner += `<div style="margin-top:14px"><div style="font-size:11px;color:var(--txt2);text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:8px">Mapas-meta da semana (sequência da obra)</div>${mapasHtml}</div>`;
    }

    const totalTxt = totalCasas > 0 ? `<span style="margin-left:auto;font-size:11px;color:var(--txt2)">Total: <b style="color:var(--txt)">${totalCasas.toFixed(1)} casas</b> em ${diasUteisSemana} dias úteis</span>` : '';

    html += `<div class="cron-week ${cls}">
      <div class="cron-week-head">${w.label} ${tagsHead}${totalTxt}</div>
      ${inner}
    </div>`;
  });
  return html;
}

// ----------------------------- CURVA S (SVG + grids) -----------------------------
export function buildCurvaS() {
  const filtro = curvaFiltro;
  const totalMeta = metaCurva(filtro);

  let titulo;
  if (filtro === 'ALL') titulo = { html: '📊 Consolidado · todas as 8 etapas', color: 'var(--accent)' };
  else {
    const srv = SERVICOS.find((s) => s.id === filtro);
    titulo = {
      html: `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:var(--srv-${filtro});vertical-align:middle;margin-right:6px"></span>${srv.id} · ${srv.nome} <span class="txt2" style="font-weight:400">· ${srv.resp || '—'}</span>`,
      color: `var(--srv-${filtro})`,
    };
  }

  if (totalMeta === 0) {
    return { titulo, svg: '<div class="txt2" style="text-align:center;padding:20px">Sem metas definidas.</div>', snapshotsGrid: '', infoAtual: '', leitura: '' };
  }

  const semIni = new Date(SEMESTRE_INI + 'T00:00:00');
  const semFim = new Date(SEMESTRE_FIM + 'T23:59:59');
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const totalMs = semFim - semIni;

  const W = 880, H = 380, padL = 50, padR = 30, padT = 30, padB = 60;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const xData = (d) => padL + ((d - semIni) / totalMs) * innerW;
  const y = (pct) => padT + innerH - (Math.max(0, Math.min(100, pct)) / 100) * innerH;

  const pontosX = gerarPontosEixoX();
  const previstoVals = pontosX.map((d) => previstoEmData(d, filtro));
  const previstoPctVals = previstoVals.map((v) => Math.min(100, (v / totalMeta) * 100));
  let prevPath = `M ${xData(pontosX[0])} ${y(previstoPctVals[0])}`;
  for (let i = 1; i < pontosX.length; i++) prevPath += ` L ${xData(pontosX[i])} ${y(previstoPctVals[i])}`;

  const realPontos = [{ data: semIni, val: 0, tipo: 'inicio' }];
  if (estado.snapshots) {
    const snaps = Object.entries(estado.snapshots)
      .map(([id, s]) => ({ id, snap: s, data: new Date(s.data) }))
      .filter((s) => s.data >= semIni && s.data <= semFim)
      .sort((a, b) => a.data - b.data);
    snaps.forEach((s) => {
      const val = snapValor(s.snap, filtro);
      if (val !== null && val !== undefined) realPontos.push({ data: s.data, val, tipo: 'snap', id: s.id });
    });
  }
  if (hoje >= semIni && hoje <= semFim) {
    const atualVal = realCurva(filtro);
    const ult = realPontos[realPontos.length - 1];
    if (hoje > ult.data) realPontos.push({ data: hoje, val: atualVal, tipo: 'hoje' });
  }
  const realPctVals = realPontos.map((p) => Math.min(100, (p.val / totalMeta) * 100));
  let realPath = '';
  if (realPontos.length >= 2) {
    realPath = `M ${xData(realPontos[0].data)} ${y(realPctVals[0])}`;
    for (let i = 1; i < realPontos.length; i++) realPath += ` L ${xData(realPontos[i].data)} ${y(realPctVals[i])}`;
  }

  let grid = '';
  [0, 25, 50, 75, 100].forEach((p) => {
    grid += `<line x1="${padL}" y1="${y(p)}" x2="${padL + innerW}" y2="${y(p)}" stroke="#e2e8f0" stroke-width="1" ${p % 100 !== 0 ? 'stroke-dasharray="3,3"' : ''}/>`;
    grid += `<text x="${padL - 8}" y="${y(p) + 3}" font-size="10" fill="#64748b" text-anchor="end">${p}%</text>`;
  });

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'];
  let xLabels = '';
  for (let m = 0; m < 7; m++) {
    const dataMes = new Date(2026, m, 1);
    if (dataMes < semIni || dataMes > semFim) continue;
    const xMes = xData(dataMes);
    xLabels += `<line x1="${xMes}" y1="${padT + innerH}" x2="${xMes}" y2="${padT + innerH + 5}" stroke="#cbd5e1" stroke-width="1"/>`;
    xLabels += `<text x="${xMes}" y="${padT + innerH + 18}" font-size="10" fill="#0f172a" text-anchor="middle" font-weight="600">${meses[m]}</text>`;
  }
  xLabels += `<text x="${xData(semFim)}" y="${padT + innerH + 34}" font-size="9" fill="#dc2626" text-anchor="middle" font-weight="700">06/07</text>`;
  xLabels += `<line x1="${xData(semFim)}" y1="${padT}" x2="${xData(semFim)}" y2="${padT + innerH}" stroke="#dc2626" stroke-width="1" stroke-dasharray="2,3" opacity="0.5"/>`;

  let hojeMk = '';
  const realizadoAtualPct = (realCurva(filtro) / totalMeta) * 100;
  const previstoHojeAbs = previstoEmData(hoje, filtro);
  const previstoHojePct = Math.min(100, (previstoHojeAbs / totalMeta) * 100);
  if (hoje >= semIni && hoje <= semFim) {
    const xH = xData(hoje);
    hojeMk = `<line x1="${xH}" y1="${padT}" x2="${xH}" y2="${padT + innerH}" stroke="#2563eb" stroke-dasharray="4,4" stroke-width="1.5" opacity="0.7"/>
              <text x="${xH}" y="${padT - 12}" font-size="11" fill="#2563eb" text-anchor="middle" font-weight="700">HOJE</text>
              <text x="${xH}" y="${padT - 2}" font-size="9" fill="#2563eb" text-anchor="middle">${hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>`;
  }

  let realDots = '';
  realPontos.forEach((p, i) => {
    if (p.tipo === 'inicio') return;
    const pct = realPctVals[i];
    const xP = xData(p.data); const yP = y(pct);
    if (p.tipo === 'hoje') {
      const prevHoje = previstoHojePct;
      const cor = pct >= prevHoje ? '#22c55e' : '#f59e0b';
      realDots += `<circle cx="${xP}" cy="${yP}" r="7" fill="${cor}" stroke="#fff" stroke-width="2.5"/>`;
      realDots += `<text x="${xP}" y="${yP - 14}" font-size="11" fill="#0f172a" text-anchor="middle" font-weight="800">${pct.toFixed(1)}%</text>`;
    } else {
      const prevAqui = previstoEmData(p.data, filtro);
      const prevPct = (prevAqui / totalMeta) * 100;
      const cor = pct >= prevPct ? '#22c55e' : '#f59e0b';
      realDots += `<circle cx="${xP}" cy="${yP}" r="4.5" fill="${cor}" stroke="#fff" stroke-width="1.5"/>`;
    }
  });

  let prevHojeDot = '';
  if (hoje >= semIni && hoje <= semFim) {
    prevHojeDot = `<circle cx="${xData(hoje)}" cy="${y(previstoHojePct)}" r="5" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="2,2"/>
                   <text x="${xData(hoje) + 12}" y="${y(previstoHojePct) + 3}" font-size="10" fill="#64748b" font-weight="600">prev: ${previstoHojePct.toFixed(1)}%</text>`;
  }

  let gapHighlight = '';
  if (hoje >= semIni && hoje <= semFim) {
    const xH = xData(hoje);
    const yReal = y(realizadoAtualPct);
    const yPrev = y(previstoHojePct);
    const corGap = realizadoAtualPct < previstoHojePct ? '#dc2626' : '#16a34a';
    const yMin = Math.min(yReal, yPrev); const yMax = Math.max(yReal, yPrev);
    gapHighlight = `<line x1="${xH}" y1="${yMin}" x2="${xH}" y2="${yMax}" stroke="${corGap}" stroke-width="3" opacity="0.55"/>`;
  }

  const labelY = filtro === 'ALL' ? '% acumulado (consolidado)' : `% acumulado de ${filtro}`;
  const svg = `<svg class="curva-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <text x="${padL + innerW / 2}" y="${H - 8}" font-size="11" fill="#64748b" text-anchor="middle">Semestre 2026.1 — 01/01 a 06/07</text>
    <text x="14" y="${padT + innerH / 2}" font-size="11" fill="#64748b" text-anchor="middle" transform="rotate(-90 14 ${padT + innerH / 2})">${labelY}</text>
    ${grid}${xLabels}${hojeMk}
    <path d="${prevPath}" stroke="#9aa7b6" stroke-width="2.5" fill="none"/>
    ${realPath ? `<path d="${realPath}" stroke="#f59e0b" stroke-width="3" fill="none"/>` : ''}
    ${gapHighlight}${prevHojeDot}${realDots}
  </svg>`;

  // Snapshots grid
  const idxAtual = semanaAtualIdx();
  let snapshotsGrid = '';
  SEMANA_RANGES.forEach((w, i) => {
    const snap = estado.snapshots?.[w.id];
    const isAtual = i === idxAtual;
    const isPassada = i < idxAtual;
    let cls = '';
    if (isAtual) cls = 'atual'; else if (isPassada && !snap) cls = 'passada';
    let conteudo;
    if (snap) {
      const dataFmt = new Date(snap.data).toLocaleDateString('pt-BR');
      const valFiltro = snapValor(snap, filtro);
      if (valFiltro === null || valFiltro === undefined) {
        conteudo = `<div class="pct empty">—</div><div class="delta">snapshot sem detalhe por etapa</div><div class="delta">${dataFmt}</div>`;
      } else {
        const pctFiltro = totalMeta > 0 ? (valFiltro / totalMeta) * 100 : 0;
        const prevAqui = (previstoEmData(new Date(snap.data), filtro) / totalMeta) * 100;
        const delta = pctFiltro - prevAqui;
        const deltaCls = delta >= 0 ? 'up' : 'down';
        const deltaTxt = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} p.p. vs prev.`;
        conteudo = `<div class="pct">${pctFiltro.toFixed(1)}%</div>
          <div class="delta ${deltaCls}">${deltaTxt}</div>
          <div class="delta">${dataFmt}</div>
          <button class="del" data-snap="${w.id}" title="Apagar snapshot" style="background:transparent;border:none;color:var(--txt2);cursor:pointer;font-size:14px;margin-top:2px">×</button>`;
      }
    } else if (isAtual) {
      const atualPct = (realCurva(filtro) / totalMeta) * 100;
      conteudo = `<div class="pct" style="color:var(--accent)">${atualPct.toFixed(1)}%</div><div class="delta">atual (ainda não capturado)</div>`;
    } else {
      conteudo = `<div class="pct empty">—</div><div class="delta">sem snapshot</div>`;
    }
    snapshotsGrid += `<div class="snapshot-card ${cls}"><div class="label">${w.label.split(' — ')[0]} · ${w.label.split(' — ')[1]}</div>${conteudo}</div>`;
  });

  const atualPct = (realCurva(filtro) / totalMeta) * 100;
  const deltaInf = atualPct - previstoHojePct;
  const corDelta = deltaInf >= 0 ? 'var(--green)' : 'var(--red)';
  const escopoInf = filtro === 'ALL' ? 'Consolidado' : (SERVICOS.find((s) => s.id === filtro)?.nome || filtro);
  const infoAtual = `<strong>${escopoInf}</strong> · Hoje (${hoje.toLocaleDateString('pt-BR')}): Realizado <strong>${atualPct.toFixed(1)}%</strong> · Previsto <strong>${previstoHojePct.toFixed(1)}%</strong> · Gap: <strong style="color:${corDelta}">${deltaInf >= 0 ? '+' : ''}${deltaInf.toFixed(1)} p.p.</strong>`;

  // Leitura BI
  const itens = [];
  const escopo = filtro === 'ALL' ? 'No consolidado' : `Em <strong>${SERVICOS.find((s) => s.id === filtro)?.nome || filtro}</strong>`;
  itens.push(`<em>${escopo}:</em>`);
  if (deltaInf < -10) itens.push(`🔴 <strong>Atraso crítico:</strong> realizado está ${(-deltaInf).toFixed(1)} p.p. abaixo do previsto para hoje (${previstoHojePct.toFixed(1)}%). Precisa de plano de aceleração imediato.`);
  else if (deltaInf < -3) itens.push(`🟡 <strong>Abaixo do previsto:</strong> ${(-deltaInf).toFixed(1)} p.p. de gap. Se não recuperar nas próximas 2-3 semanas, vira atraso crítico.`);
  else if (Math.abs(deltaInf) < 3) itens.push(`🟢 <strong>No ritmo:</strong> variação de ${deltaInf >= 0 ? '+' : ''}${deltaInf.toFixed(1)} p.p. dentro da margem aceitável.`);
  else itens.push(`🚀 <strong>Adiantado:</strong> ${deltaInf.toFixed(1)} p.p. acima do previsto. Continua nesse ritmo.`);

  const snaps = (estado.snapshots ? Object.entries(estado.snapshots) : [])
    .map(([id, s]) => ({ id, snap: s, data: new Date(s.data) }))
    .map((s) => ({ ...s, val: snapValor(s.snap, filtro) }))
    .filter((s) => s.val !== null && s.val !== undefined)
    .sort((a, b) => a.data - b.data);
  if (snaps.length >= 2) {
    const ult = snaps[snaps.length - 1]; const ant = snaps[snaps.length - 2];
    const dPrev = (previstoEmData(ult.data, filtro) - previstoEmData(ant.data, filtro)) / totalMeta * 100;
    const dReal = ((ult.val - ant.val) / totalMeta) * 100;
    const ratio = dPrev > 0 ? dReal / dPrev : 0;
    if (ratio < 0.7) itens.push(`📉 <strong>Tendência de desaceleração:</strong> entre os últimos 2 snapshots, o realizado avançou apenas ${(ratio * 100).toFixed(0)}% do ritmo previsto. Risco de aprofundar o gap.`);
    else if (ratio > 1.3) itens.push(`📈 <strong>Tendência de aceleração:</strong> realizado avançou ${(ratio * 100).toFixed(0)}% do ritmo previsto entre os últimos snapshots. Boa cadência.`);
    else itens.push(`📊 <strong>Ritmo consistente:</strong> avanço entre snapshots em ${(ratio * 100).toFixed(0)}% do ritmo previsto.`);
  } else if (snaps.length === 0) {
    itens.push(`📸 <strong>Sem snapshots ainda</strong> (ou snapshots antigos sem detalhe por etapa): a curva laranja só está mostrando o ponto de HOJE.`);
  }
  if (atualPct > 0 && hoje > semIni) {
    const diasDesdeIni = Math.max(1, (hoje - semIni) / (24 * 3600 * 1000));
    const ritmoPctPorDia = atualPct / diasDesdeIni;
    const diasFalta = ritmoPctPorDia > 0 ? (100 - atualPct) / ritmoPctPorDia : 9999;
    const proj = new Date(hoje); proj.setDate(proj.getDate() + Math.ceil(diasFalta));
    const projFmt = proj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    if (proj > semFim) {
      const atraso = Math.ceil((proj - semFim) / (24 * 3600 * 1000));
      itens.push(`⏱️ <strong>Projeção:</strong> no ritmo atual, 100% só em <strong>${projFmt}</strong> — <strong style="color:var(--red)">${atraso} dias após 06/07</strong>. Sem aceleração, não bate o prazo.`);
    } else {
      itens.push(`⏱️ <strong>Projeção:</strong> no ritmo atual, 100% em <strong>${projFmt}</strong> (dentro do prazo).`);
    }
  }
  const leitura = itens.map((t) => `<div class="alert-item">${t}</div>`).join('');

  return { titulo, svg, snapshotsGrid, infoAtual, leitura };
}
