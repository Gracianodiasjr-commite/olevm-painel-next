'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as P from '@/lib/panel';

// Pequeno helper: HTML injetado (mantém fidelidade ao app original).
function Html({ html, as: Tag = 'div', ...rest }) {
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Panel() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [, setTick] = useState(0);
  const [activeTab, setActiveTabState] = useState('visao');
  const [popup, setPopup] = useState(null); // {cid, tmp}
  const [saveStatus, setSaveStatus] = useState('');
  const [form, setForm] = useState({ resp: '', desc: '', due: '' });

  const saveTimer = useRef(null);
  const importRef = useRef(null);

  const rerender = useCallback(() => setTick((t) => t + 1), []);

  // POST do estado para o Postgres (com debounce).
  const doSave = useCallback(async (immediate = false) => {
    const flush = async () => {
      try {
        const res = await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: P.getEstado() }),
        });
        const data = await res.json();
        if (data.ok) {
          const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          setSaveStatus('✓ Salvo às ' + t);
          setTimeout(() => setSaveStatus(''), 2500);
        } else {
          setSaveStatus('⚠️ Erro ao salvar: ' + (data.error || 'desconhecido'));
        }
      } catch (e) {
        setSaveStatus('⚠️ Sem conexão ao salvar');
      }
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (immediate) { await flush(); return; }
    saveTimer.current = setTimeout(flush, 500);
  }, []);

  // Carrega o estado na montagem.
  useEffect(() => {
    let active = true;
    P.registerSave(() => doSave(false));
    (async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        const data = await res.json();
        if (!active) return;
        if (!data.ok) { setLoadError(data.error || 'Erro ao carregar'); return; }
        P.setEstado(data.state);
        setActiveTabState(P.getEstado().activeTab || 'visao');
        // Primeira carga: persiste o estado base (Q07/Q06/Q05/Q04-inf concluídas).
        P.salvar();
        setLoaded(true);
      } catch (e) {
        if (active) setLoadError(String(e?.message || e));
      }
    })();
    return () => { active = false; };
  }, [doSave]);

  // ---------------------------- HANDLERS ----------------------------
  const switchTab = (tab) => {
    setActiveTabState(tab);
    P.setActiveTab(tab);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onMapaClick = (e) => {
    const el = e.target.closest('.casa[data-cid]');
    if (!el) return;
    const cid = el.dataset.cid;
    if (P.casaClickAbrePopup()) {
      setPopup({ cid, tmp: { ...P.getCasa(cid) } });
    } else {
      P.toggleEtapa(cid, P.getModo());
      rerender();
    }
  };

  const onModoClick = (e) => {
    const btn = e.target.closest('.modo-btn[data-modo]');
    if (!btn) return;
    P.setModo(btn.dataset.modo);
    rerender();
  };

  const onCurvaClick = (e) => {
    const btn = e.target.closest('.modo-btn[data-curva]');
    if (!btn) return;
    P.setCurvaFiltro(btn.dataset.curva);
    rerender();
  };

  const onPopupSrvClick = (e) => {
    const el = e.target.closest('.popup-srv');
    if (!el || !popup) return;
    const sid = el.dataset.s;
    setPopup((prev) => ({ ...prev, tmp: { ...prev.tmp, [sid]: !prev.tmp[sid] } }));
  };

  const salvarPopup = () => {
    if (!popup) return;
    P.salvarPopup(popup.cid, popup.tmp);
    setPopup(null);
    rerender();
  };

  const onAcoesClick = (e) => {
    const del = e.target.closest('.del[data-del]');
    if (del) {
      const id = del.dataset.del;
      const a = P.getAcoes().find((x) => x.id === id);
      if (a && confirm(`Excluir: ${a.resp} — ${a.desc.slice(0, 80)}?`)) {
        P.excluirAcao(id);
        rerender();
      }
    }
  };
  const onAcoesChange = (e) => {
    const sel = e.target.closest('select[data-id]');
    if (!sel) return;
    P.setActionStatus(sel.dataset.id, sel.value);
    rerender();
  };

  const adicionarAcao = () => {
    if (!form.resp.trim() || !form.desc.trim()) { alert('Preencha Responsável e Descrição.'); return; }
    P.adicionarAcao({ resp: form.resp.trim(), desc: form.desc.trim(), dueDt: form.due || null });
    setForm({ resp: '', desc: '', due: '' });
    rerender();
  };
  const restaurarPadrao = () => {
    if (!confirm('Restaurar lista padrão? Remove ações personalizadas mas mantém status das originais.')) return;
    P.restaurarPadrao();
    rerender();
  };

  const onCurvaContainerClick = (e) => {
    const btn = e.target.closest('[data-snap]');
    if (!btn) return;
    if (confirm('Apagar este snapshot?')) {
      P.apagarSnapshot(btn.dataset.snap);
      rerender();
    }
  };
  const capturarSnapshot = () => {
    const r = P.capturarSnapshot();
    alert(r.msg);
    if (r.ok) rerender();
  };

  // Toggle dos mini-mapas (manipula o DOM diretamente, como no original).
  const onCronoClick = (e) => {
    const t = e.target.closest('.mini-mapa-title');
    if (!t) return;
    t.classList.toggle('collapsed');
    const section = t.parentElement;
    const wrap = section.querySelector('.mini-mapa-wrap');
    const body = section.querySelector('.mini-mapa-body');
    if (wrap) wrap.classList.toggle('collapsed');
    if (body) body.classList.toggle('collapsed');
  };

  const onCfgChange = (e) => {
    const inp = e.target.closest('[data-cfg]');
    if (!inp) return;
    P.setCfg(inp.dataset.cfg, inp.dataset.field, inp.value);
    rerender();
  };

  // Export / Import / Reset.
  const exportar = () => {
    const blob = new Blob([JSON.stringify(P.getEstado(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 16).replace(':', '-');
    a.download = 'painel_olevm_' + stamp + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const importar = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dados = JSON.parse(e.target.result);
        if (!dados || typeof dados !== 'object') { alert('Arquivo não é JSON válido.'); return; }
        if (!confirm('Importar e SUBSTITUIR os dados atuais por este arquivo?')) return;
        P.setEstado(dados);
        await doSave(true);
        rerender();
        alert('✓ Importado com sucesso.');
      } catch (err) {
        alert('Erro ao ler arquivo: ' + err.message);
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  };
  const resetar = async () => {
    if (!confirm('Apagar todos os dados preenchidos? (volta ao estado base)')) return;
    P.setEstado({});
    await doSave(true);
    rerender();
  };
  const recarregar = async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) { P.setEstado(data.state); rerender(); }
    } catch (e) { /* ignore */ }
  };

  if (loadError) {
    return (
      <div className="wrap">
        <div className="alert-item" style={{ borderLeft: '4px solid var(--red)' }}>
          ⚠️ Não foi possível carregar o painel: {loadError}
          <br />Verifique se a variável <code>DATABASE_URL</code> está configurada.
        </div>
      </div>
    );
  }
  if (!loaded) {
    return <div className="wrap"><div className="alert-item">Carregando painel…</div></div>;
  }

  const kpis = P.buildKPIs();
  const acoes = P.buildActionList();
  const curva = P.buildCurvaS();
  const header = P.headerInfo();

  const TABS = [
    ['visao', '📊 Visão Geral'],
    ['mapa', '🗺️ Mapa'],
    ['crono', '📅 Cronograma'],
    ['acoes', '✅ Ações'],
    ['curvas', '📈 PPC - Curva S'],
    ['riscos', '⚠️ Riscos'],
    ['config', '⚙️ Config'],
  ];

  return (
    <div className="wrap">
      <div className="topbar">
        <div>
          <h1>Painel de Produção OléVM - Meta de Faturamento 2026.1</h1>
          <div className="sub">Mapa por casa · PAS-4 · 09/05 → 06/07</div>
        </div>
        <div className="right">
          <div>Hoje</div>
          <b>{header.today}</b>
          <div style={{ marginTop: 4 }}>Faltam <b>{header.diasRest}</b></div>
        </div>
      </div>

      <nav className="tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={'tab' + (activeTab === id ? ' active' : '')} onClick={() => switchTab(id)}>
            {label}
            {id === 'acoes' && <span className="badge">{acoes.badge}</span>}
          </button>
        ))}
      </nav>

      {/* ============ VISÃO GERAL ============ */}
      <div className={'pane' + (activeTab === 'visao' ? ' active' : '')}>
        <section>
          <h2>Resumo do Semestre</h2>
          <div className="kpi-row">
            <div className="kpi"><div className="l">Meta de Faturamento</div><div className="v">214 casas <span className="tag tag-meta">06/07</span></div></div>
            <div className="kpi"><div className="l">Data Meta (fixa)</div><div className="v s">06/07/2026</div></div>
            <div className="kpi"><div className="l">Data Projetada</div><div className="v s">{header.dataProj}</div></div>
            <div className="kpi"><div className="l">Casas Faturadas</div><div className="v">{kpis.faturadas}</div></div>
            <div className="kpi"><div className="l">Progresso Global</div><div className="v">{kpis.global}</div></div>
            <div className="kpi"><div className="l">Próxima AR</div><div className="v s">11/06 (qui) 08h</div></div>
          </div>
          <div className="totalbar"><div className="fill" style={{ width: kpis.globalWidth + '%' }}>{kpis.global}</div></div>
          <div className="note">Progresso global = média das 7 etapas. Casa faturada = todos os 7 selinhos marcados (R · F · M · A1 · A2 · I1 · I2).</div>
        </section>

        <section>
          <h2>Etapas — % Concluído</h2>
          <Html className="etapas-grid" html={kpis.etapasGrid} />
        </section>

        <section>
          <h2>Produtividade Necessária por Etapa</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="prod-table">
              <thead>
                <tr>
                  <th>Etapa</th><th>Resp.</th><th>Meta</th><th>Feito</th><th>Falta</th>
                  <th>Data-meta</th><th>Dias úteis</th><th>Prod. necessária/dia</th><th>Teto/dia</th><th>Status</th>
                </tr>
              </thead>
              <Html as="tbody" html={P.buildProdTbody()} />
            </table>
          </div>
          <div className="note">Status: 🟢 dentro do teto com folga · 🟡 apertado · 🔴 acima do teto · ⚪ etapa marcadora. Edite Meta / Teto / % Atenção na aba ⚙️ Config.</div>
        </section>

        <section>
          <h2>Alertas</h2>
          <Html className="alert-list" html={P.buildAlertList()} />
        </section>
      </div>

      {/* ============ MAPA ============ */}
      <div className={'pane' + (activeTab === 'mapa' ? ' active' : '')}>
        <section>
          <h2>Mapa Interativo — 214 casas (PAS-4)</h2>
          <div className="modos" onClick={onModoClick}>
            {[['ALL', '📊 Etapa Atual'], ['FAT', 'Faturadas'], ['R', 'R · Radier'], ['F', 'F · Fabricação'],
              ['M', 'M · Montagem'], ['A1', 'A1 · Acab 1'], ['A2', 'A2 · Acab 2'], ['I1', 'I1 · Infra-Pós 1'],
              ['I2', 'I2 · Infra-Pós 2'], ['LF', 'LF · Limpeza Final']].map(([m, lbl]) => (
              <button key={m} className={'modo-btn' + (P.getModo() === m ? ' active' : '')} data-modo={m}>
                {m !== 'ALL' && <span className="dot" />}{lbl}
              </button>
            ))}
          </div>
          <Html className="txt2" style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }} html={P.modoHintHtml()} />
          <div className="mapa-wrap">
            <Html className="mapa-grid" html={P.buildMapa()} onClick={onMapaClick} />
          </div>
        </section>

        <section>
          <h2>Diagnóstico BI — Distribuição por Estágio</h2>
          <div className="txt2" style={{ marginBottom: 10 }}>Quantas casas estão em cada etapa neste momento. O <strong>gargalo</strong> é a etapa com mais casas paradas.</div>
          <Html className="etapas-grid" html={kpis.distribuicaoGrid} />
        </section>
      </div>

      {/* ============ CRONOGRAMA ============ */}
      <div className={'pane' + (activeTab === 'crono' ? ' active' : '')}>
        <section>
          <h2>Cronograma de Metas Semanais — Calculado a partir do Mapa</h2>
          <div className="note" style={{ marginBottom: 14 }}>
            As metas de cada semana são <strong>recalculadas em tempo real</strong> a partir do que falta no Mapa.
            Status: 🟢 ritmo viável (≤ teto) · 🔴 acima do teto · ⚪ etapa concluída ou sem meta nesta semana.
          </div>
          <Html className="timeline" html={P.buildCronograma()} onClick={onCronoClick} />
        </section>
      </div>

      {/* ============ AÇÕES ============ */}
      <div className={'pane' + (activeTab === 'acoes' ? ' active' : '')}>
        <section>
          <h2>Ações Transversais</h2>
          <div className="add-form">
            <div className="add-form-row">
              <label>Responsável<input type="text" value={form.resp} onChange={(e) => setForm({ ...form, resp: e.target.value })} placeholder="Ex.: Danilo + RH" /></label>
              <label>Descrição<textarea value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="O que precisa ser feito?" /></label>
              <label>Prazo<input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></label>
              <button className="btn" onClick={adicionarAcao}>+ Adicionar</button>
            </div>
          </div>
          <div className="actions-bar-inline">
            <span className="txt2">{acoes.resumo}</span>
            <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 11, padding: '6px 10px' }} onClick={restaurarPadrao}>↺ Restaurar lista padrão</button>
          </div>
          <Html className="action-list" html={acoes.html} onClick={onAcoesClick} onChange={onAcoesChange} />
        </section>
      </div>

      {/* ============ PPC CURVA S ============ */}
      <div className={'pane' + (activeTab === 'curvas' ? ' active' : '')}>
        <section>
          <h2>PPC — Curva S · Previsto × Realizado</h2>
          <div className="note">Curva S do semestre 2026.1 (01/01 → 06/07). <strong>Linha cinza</strong> = previsto · <strong>Linha laranja</strong> = realizado · <strong>Linha azul tracejada</strong> = HOJE.</div>
          <div className="modos" style={{ marginBottom: 10 }} onClick={onCurvaClick}>
            {[['ALL', '📊 Consolidado'], ['R', 'R · Radier'], ['F', 'F · Fabricação'], ['M', 'M · Montagem'],
              ['A1', 'A1 · Acab 1'], ['A2', 'A2 · Acab 2'], ['I1', 'I1 · Infra-Pós 1'], ['I2', 'I2 · Infra-Pós 2'],
              ['LF', 'LF · Limpeza Final']].map(([m, lbl]) => (
              <button key={m} className={'modo-btn' + (P.getCurvaFiltro() === m ? ' active' : '')} data-curva={m}>
                {m !== 'ALL' && <span className="dot" />}{lbl}
              </button>
            ))}
          </div>
          <div className="curva-container" onClick={onCurvaContainerClick}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center', color: curva.titulo.color }} dangerouslySetInnerHTML={{ __html: curva.titulo.html }} />
            <Html html={curva.svg} />
            <div className="curva-legend">
              <div className="item"><span className="line-key" style={{ background: '#9aa7b6' }} />Previsto (Baseline)</div>
              <div className="item"><span className="line-key" style={{ background: '#f59e0b' }} />Realizado</div>
              <div className="item"><span className="dot-key" style={{ background: '#22c55e' }} />Acima do previsto</div>
              <div className="item"><span className="dot-key" style={{ background: '#f59e0b' }} />Abaixo do previsto</div>
            </div>
          </div>

          <h3 style={{ marginTop: 18 }}>Snapshots Semanais</h3>
          <div className="note" style={{ marginBottom: 8 }}>Toda sexta após o PPC, clique em <strong>Capturar foto da semana atual</strong> para salvar o realizado.</div>
          <div className="actions-bar-inline" style={{ marginBottom: 8 }}>
            <span className="txt2" dangerouslySetInnerHTML={{ __html: curva.infoAtual }} />
            <button className="btn" style={{ marginLeft: 'auto' }} onClick={capturarSnapshot}>📸 Capturar foto da semana atual</button>
          </div>
          <Html className="snapshots-grid" html={curva.snapshotsGrid} onClick={onCurvaContainerClick} />
        </section>

        <section>
          <h2>Leitura BI da Curva S</h2>
          <Html className="alert-list" html={curva.leitura} />
        </section>
      </div>

      {/* ============ RISCOS ============ */}
      <div className={'pane' + (activeTab === 'riscos' ? ' active' : '')}>
        <section>
          <h2>6 Riscos Prioritários</h2>
          <div className="risk-list">
            <div className="risk"><div className="num">1</div><div className="body"><strong>Chuva residual em maio</strong> — impacta RADIER e MONTAGEM diretamente. Mitigação: pulmão de produtividade + caixas sanitárias na frente (Eduardo).</div></div>
            <div className="risk"><div className="num">2</div><div className="body"><strong>Terceirização ACAB1</strong> — escopo controlado (cerâmica/porcelanato/metais). Primeiro lote 12/05 é o teste-piloto. Sem 3 casas/semana da terceirização, ACAB1 fura 30/06.</div></div>
            <div className="risk"><div className="num">3</div><div className="body"><strong>G9 não ativar em junho</strong> — sem ele, ACAB1 fura mesmo com terceirização. RH precisa de prazo claro até 02/06.</div></div>
            <div className="risk"><div className="num">4</div><div className="body"><strong>Despesa Habitação &gt; R$ 500k em maio</strong> — compromete PPR. Plano de Danilo para 11/05 é decisivo.</div></div>
            <div className="risk"><div className="num">5</div><div className="body"><strong>AT acumulando &gt; 100 chamados</strong> — desvia equipe de produção. Aplicativo dos supervisores (12/05).</div></div>
            <div className="risk"><div className="num">6</div><div className="body"><strong>Acesso do Monteiro travado na chuva</strong> — falha custa 1 dia inteiro de fábrica+montagem. Eduardo assumiu 7h.</div></div>
          </div>
        </section>
      </div>

      {/* ============ CONFIG ============ */}
      <div className={'pane' + (activeTab === 'config' ? ' active' : '')}>
        <section>
          <h2>Configuração de Metas e Tetos por Etapa</h2>
          <div className="note">Edite a meta de cada etapa, data-meta, teto realista e a <strong>% de atenção</strong>. Mudanças salvam automaticamente.</div>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table>
              <thead>
                <tr><th>Etapa</th><th>Responsável</th><th>Meta (casas)</th><th>Data-meta</th><th>Teto/dia</th><th>% Atenção (amarelo)</th></tr>
              </thead>
              <Html as="tbody" html={P.buildCfgTbody()} onChange={onCfgChange} />
            </table>
          </div>
        </section>
        <section>
          <h2>Estrutura do Empreendimento</h2>
          <div className="note">Quadras e lotes que compõem a meta 2026.1.</div>
          <Html style={{ marginTop: 10, fontSize: 12, lineHeight: 1.7 }} html={P.buildEstrutura()} />
        </section>
      </div>

      {/* ============ POPUP ============ */}
      {popup && (
        <div className="popup-overlay show" onClick={(e) => { if (e.target.classList.contains('popup-overlay')) setPopup(null); }}>
          <div className="popup">
            <div className="popup-title">Casa {popup.cid}</div>
            <div className="popup-sub">Marque os serviços já concluídos nesta casa. Os 7 estão em ordem de execução.</div>
            <Html className="popup-srv-list" html={P.buildPopupList(popup.tmp)} onClick={onPopupSrvClick} />
            <div className="popup-actions">
              <button className="btn btn-ghost" onClick={() => setPopup(null)}>Cancelar</button>
              <button className="btn" onClick={salvarPopup}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ BOTTOM BAR ============ */}
      <div className="bottombar">
        <div className="bottombar-inner">
          <button className="btn" onClick={() => doSave(true)}>💾 Salvar</button>
          <button className="btn btn-ghost" onClick={exportar}>⤓ Exportar JSON</button>
          <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>⤒ Importar JSON</button>
          <input ref={importRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={importar} />
          <button className="btn btn-ghost" onClick={recarregar}>↻ Recarregar do banco</button>
          <button className="btn btn-ghost" onClick={resetar}>↺ Resetar</button>
          <button className="btn btn-ghost" onClick={() => window.print()}>🖨️ Imprimir</button>
          <span className="txt2" style={{ marginLeft: 'auto', alignSelf: 'center' }}>{saveStatus}</span>
        </div>
      </div>
    </div>
  );
}
