import { useEffect, useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Bell, 
  LogOut, 
  Calendar, 
  LayoutGrid, 
  List, 
  Tags, 
  Target,
  Wallet,
  Receipt,
  ArrowUpRight,
  MessageCircle,
  Edit2,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Send,
  Lightbulb,
  Search,
  Plus,
  Clock,
  ArrowDownLeft
} from 'lucide-react';
import Modal from '../components/Modal';

interface DashboardProps {
  onLogout: () => void;
}

type UserProfile = { id_usuario: number; nr_telefone: string; nm_usuario: string | null };
type Despesa = {
  ID_DESPESA: number;
  ID_USUARIO: number;
  TP_DESPESA: string;
  DS_DESPESA: string | null;
  VL_DESPESA: number | string;
  DT_DESPESA: string;
  DT_INCLUSAO?: string;
};

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'transacoes' | 'categorias' | 'metas'>('geral');
  const [transTab, setTransTab] = useState<'todas' | 'pagas' | 'apagar' | 'areceber'>('todas');
  const [periodFilter, setPeriodFilter] = useState<'hoje' | 'semana' | 'mes' | 'trimestre' | 'semestre' | 'ano'>('mes');

  const [user, setUser] = useState<null | UserProfile>(null);
  const [perfil, setPerfil] = useState<null | { vl_renda_mensal: number | null; nr_dia_recebimento: number | null }>(null);
  const [periodo, setPeriodo] = useState<null | { inicio: string; fim: string }>(null);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [totalGastos, setTotalGastos] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [aiInput, setAiInput] = useState<string>('');
  const [aiBusy, setAiBusy] = useState<boolean>(false);
  const [aiButtonAceso, setAiButtonAceso] = useState<boolean>(false);

  const [rendaModalOpen, setRendaModalOpen] = useState(false);
  const [rendaDraft, setRendaDraft] = useState('');
  const [rendaSaving, setRendaSaving] = useState(false);

  const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const toISODateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const toISODateTimeLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
  };

  const clampDayForMonth = (year: number, monthIndex: number, desiredDay: number) => {
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const d = Math.floor(desiredDay);
    return Math.min(Math.max(1, d), lastDay);
  };

  const parseMoneyBR = (raw: string): number => {
    const cleaned = raw
      .trim()
      .replace(/\s/g, '')
      .replace(/[^\d,.-]/g, '');
    if (!cleaned) return 0;
    const hasComma = cleaned.includes(',');
    const normalized = hasComma
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const formatMoneyBR = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    // Máscara por centavos: "1" => R$ 0,01; "10000" => R$ 100,00
    // Limite para evitar números absurdos ao colar/segurar tecla.
    const limited = digits.slice(0, 12); // até 999.999.999,99
    const n = Number(limited) / 100;
    if (!Number.isFinite(n)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  };

  const rendaMensal = Number(perfil?.vl_renda_mensal ?? 0);
  const saldoAtual = rendaMensal - totalGastos;
  const usoPercent = rendaMensal > 0 ? (totalGastos / rendaMensal) * 100 : 0;
  const usoPercentClamped = Math.max(0, Math.min(100, usoPercent));

  const categoriasResumo = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of despesas) {
      const categoria = d.TP_DESPESA || d.DS_DESPESA || 'Outros';
      const valor = Number(d.VL_DESPESA) || 0;
      map.set(categoria, (map.get(categoria) || 0) + valor);
    }
    return [...map.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  }, [despesas]);

  const chartCategories = useMemo(() => {
    const base = categoriasResumo;
    if (!base || base.length === 0) return [];

    const top = base.slice(0, 6);
    const rest = base.slice(6);
    const restTotal = rest.reduce((s, c) => s + (c.total || 0), 0);
    return restTotal > 0 ? [...top, { categoria: 'Outros', total: restTotal }] : top;
  }, [categoriasResumo]);

  const maxPercent = useMemo(() => {
    if (!rendaMensal || rendaMensal <= 0) return 0;
    return Math.max(5, ...chartCategories.map((c) => (c.total / rendaMensal) * 100));
  }, [chartCategories, rendaMensal]);

  const categoriasCount = categoriasResumo.length;
  const transacoesVisiveis = transTab === 'areceber' ? [] : despesas;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cfo_user');
      if (!raw) {
        setError('Faça o onboarding para conectar seu WhatsApp.');
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(raw);
      setUser(parsed);
    } catch {
      setError('Erro ao carregar seus dados. Faça o onboarding novamente.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const carregarPerfil = async () => {
      try {
        setError(null);
        const res = await fetch(`/usuarios/${user.id_usuario}`);
        if (!res.ok) throw new Error('Falha ao carregar seu perfil.');
        const row = await res.json();

        setPerfil({
          vl_renda_mensal: row.VL_RENDA_MENSAL ?? null,
          nr_dia_recebimento: row.NR_DIA_RECEBIMENTO ?? null,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Falha ao carregar seu perfil.';
        setError(msg);
        setPerfil({ vl_renda_mensal: 0, nr_dia_recebimento: 1 });
      }
    };

    carregarPerfil();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    let start = new Date(now);

    if (periodFilter === 'hoje') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (periodFilter === 'semana') {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (periodFilter === 'mes') {
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
    } else if (periodFilter === 'trimestre') {
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
    } else if (periodFilter === 'semestre') {
      start = new Date(now);
      start.setMonth(now.getMonth() - 6);
    } else if (periodFilter === 'ano') {
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
    }

    setPeriodo({
      inicio: toISODateTimeLocal(start),
      fim: new Date().toISOString(),
    });
  }, [user, periodFilter]);

  const carregarDespesas = async () => {
    if (!user || !periodo) return;

    try {
      setLoading(true);
      setError(null);

      const url = `/despesas/periodo?id_usuario=${user.id_usuario}&inicio=${encodeURIComponent(periodo.inicio)}&fim=${encodeURIComponent(periodo.fim)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao carregar despesas.');

      const data = await res.json();
      const listRaw = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
      const list = listRaw as Despesa[];

      setDespesas(list);
      const total = list.reduce((s, d) => s + (Number(d.VL_DESPESA) || 0), 0);
      setTotalGastos(total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar dados.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !periodo) return;
    carregarDespesas();
  }, [user, periodo]);

  const abrirModalRenda = () => {
    const atual = perfil?.vl_renda_mensal ?? 0;
    setRendaDraft(atual ? fmtBRL(atual) : '');
    setRendaModalOpen(true);
  };

  const confirmarRendaMensal = async () => {
    if (!user) return;
    if (rendaSaving) return;

    const valor = parseMoneyBR(rendaDraft);
    if (!valor || valor <= 0) {
      setError('Informe um valor de renda mensal válido.');
      return;
    }

    setRendaSaving(true);
    try {
      setError(null);
      const res = await fetch('/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nr_telefone: user.nr_telefone,
          nm_usuario: user.nm_usuario,
          vl_renda_mensal: valor,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar renda mensal.');

      setPerfil((p) => ({ vl_renda_mensal: valor, nr_dia_recebimento: p?.nr_dia_recebimento ?? null }));
      setRendaModalOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar renda mensal.';
      setError(msg);
    } finally {
      setRendaSaving(false);
    }
  };

  const handleAiSend = async () => {
    if (!user) return;

    const mensagem = aiInput.trim();
    if (!mensagem) return;
    if (aiBusy) return;

    setAiBusy(true);
    setError(null);

    try {
      const res = await fetch('/processar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensagem,
          nr_telefone: user.nr_telefone,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || 'Erro ao registrar no sistema.';
        throw new Error(msg);
      }

      // Quando o usuário registra algo (ex: "gastei 50 mercado"),
      // deixamos o botão verde mais "aceso" por um instante.
      if (data?.acao === 'CRIAR_DESPESA') {
        setAiButtonAceso(true);
        window.setTimeout(() => setAiButtonAceso(false), 1200);
      }

      setAiInput('');
      await carregarDespesas();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao registrar.';
      setError(msg);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-container">
          <div className="dash-logo">
            <div className="dash-logo-icon">
              <TrendingUp size={20} />
            </div>
            <span>Meu CFO</span>
          </div>
          <div className="dash-header-actions">
            <button className="icon-btn-ghost"><Bell size={20} /></button>
            <button className="icon-btn-ghost" onClick={onLogout}><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-container">
          <Modal
            open={rendaModalOpen}
            title="Atualizar renda mensal"
            description="Isso ajusta seu saldo e o uso do orçamento no painel."
            onClose={() => {
              if (!rendaSaving) setRendaModalOpen(false);
            }}
            footer={
              <div className="modal-actions">
                <button className="btn btn-muted" onClick={() => setRendaModalOpen(false)} disabled={rendaSaving}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={confirmarRendaMensal} disabled={rendaSaving || !rendaDraft.trim()}>
                  {rendaSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            }
          >
            <div className="form-group">
              <label>Renda mensal</label>
              <input
                value={rendaDraft}
                onChange={(e) => setRendaDraft(formatMoneyBR(e.target.value))}
                placeholder="Ex: 2000 ou 2.000,00"
                inputMode="numeric"
                autoFocus
                disabled={rendaSaving}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmarRendaMensal();
                }}
              />
              <div className="form-help">Você pode digitar com ou sem R$.</div>
            </div>
          </Modal>
          
          {/* Welcome Area */}
            <div className="welcome-section">
            <h1>
              Olá, {user?.nm_usuario || '...' }! <span className="wave">👋</span>
            </h1>
              <p>{error || 'Aqui está o resumo das suas finanças.'}</p>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <div className="period-filters">
              <div className="filter-icon"><Calendar size={16} /></div>
              <button className={`filter-btn ${periodFilter === 'hoje' ? 'active' : ''}`} onClick={() => setPeriodFilter('hoje')}>Hoje</button>
              <button className={`filter-btn ${periodFilter === 'semana' ? 'active' : ''}`} onClick={() => setPeriodFilter('semana')}>Semana</button>
              <button className={`filter-btn ${periodFilter === 'mes' ? 'active' : ''}`} onClick={() => setPeriodFilter('mes')}>Mês</button>
              <button className={`filter-btn ${periodFilter === 'trimestre' ? 'active' : ''}`} onClick={() => setPeriodFilter('trimestre')}>Trimestre</button>
              <button className={`filter-btn ${periodFilter === 'semestre' ? 'active' : ''}`} onClick={() => setPeriodFilter('semestre')}>Semestre</button>
              <button className={`filter-btn ${periodFilter === 'ano' ? 'active' : ''}`} onClick={() => setPeriodFilter('ano')}>Ano</button>
            </div>

            <div className="view-tabs">
              <button 
                className={`view-tab ${activeTab === 'geral' ? 'active' : ''}`}
                onClick={() => setActiveTab('geral')}
              ><LayoutGrid size={16} /> Visão Geral</button>
              <button 
                className={`view-tab ${activeTab === 'transacoes' ? 'active' : ''}`}
                onClick={() => setActiveTab('transacoes')}
              ><List size={16} /> Transações</button>
              <button 
                className={`view-tab ${activeTab === 'categorias' ? 'active' : ''}`}
                onClick={() => setActiveTab('categorias')}
              ><Tags size={16} /> Categorias</button>
              <button 
                className={`view-tab ${activeTab === 'metas' ? 'active' : ''}`}
                onClick={() => setActiveTab('metas')}
              ><Target size={16} /> Metas</button>
            </div>
          </div>

          {activeTab === 'geral' && (
            <>

          {/* Metric Cards */}
          <div className="metrics-grid">
            <div className={`metric-card ${saldoAtual < 0 ? 'bg-danger text-white' : 'bg-primary text-white'}`}>
              <div className="metric-header">
                <Wallet size={20} />
                <span>Saldo atual</span>
              </div>
              <div className="metric-value">{fmtBRL(saldoAtual)}</div>
              <div className="metric-footer">
                <TrendingUp size={14} /> Baseado na sua renda
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header text-danger">
                <Receipt size={20} />
                <span className="text-muted">Gastos do período</span>
              </div>
              <div className="metric-value text-main">
                {loading ? '...' : fmtBRL(totalGastos)}
              </div>
              <div className="metric-footer text-danger">
                <TrendingDown size={14} /> {loading ? '...' : `${categoriasCount} categorias`}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header text-success">
                <ArrowUpRight size={20} />
                <span className="text-muted">Entradas</span>
              </div>
              <div className="metric-value text-main">R$ 0,00</div>
              <div className="metric-footer text-muted">
                No período selecionado
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-header text-primary">
                <MessageCircle size={20} />
                <span className="text-muted">WhatsApp</span>
              </div>
              <div className="metric-value text-main" style={{ fontSize: '1.25rem' }}>CFO Ativo</div>
              <div className="metric-footer text-muted">
                Envie "saldo" para consultar
              </div>
            </div>
          </div>

          {/* Two Column Section */}
          <div className="dashboard-grid-2">
            
            {/* Orçamento Mensal */}
            <div className="dash-panel">
              <div className="panel-header">
                <h3>Orçamento Mensal</h3>
                <button className="icon-btn-ghost" onClick={abrirModalRenda}><Edit2 size={16} /></button>
              </div>

              <div className="budget-items">
                <div className="budget-item bg-success-light">
                  <div className="budget-icon text-success"><TrendingUp size={16} /></div>
                  <div className="budget-info">
                    <span className="budget-label">Renda mensal</span>
                    <span className="budget-val text-success">{fmtBRL(rendaMensal)}</span>
                  </div>
                </div>

                <div className="budget-item bg-danger-light">
                  <div className="budget-icon text-danger"><TrendingDown size={16} /></div>
                  <div className="budget-info">
                    <span className="budget-label">Gastos do período</span>
                    <span className="budget-val text-danger">{loading ? '...' : fmtBRL(totalGastos)}</span>
                  </div>
                </div>

                <div className="budget-item bg-success-light">
                  <div className="budget-icon text-success"><Wallet size={16} /></div>
                  <div className="budget-info">
                    <span className="budget-label">Disponível para gastar</span>
                    <span className="budget-val text-success">{fmtBRL(saldoAtual)}</span>
                  </div>
                </div>
              </div>

              <div className="budget-progress-section">
                <div className="progress-labels">
                  <span>Uso do orçamento</span>
                  <span>{Math.round(usoPercentClamped)}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${Math.round(usoPercentClamped)}%` }}></div>
                </div>
              </div>
            </div>

            {/* Gastos por categoria */}
            <div className="dash-panel">
              <div className="panel-header">
                <h3>Gastos por categoria</h3>
              </div>
              {loading ? (
                <div className="empty-state">
                  <p>Carregando...</p>
                </div>
              ) : categoriasResumo.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhum gasto no período</p>
                </div>
              ) : (
                <div className="categorias-resumo">
                  {categoriasResumo.slice(0, 6).map((c) => (
                    <div key={c.categoria} className="categoria-resumo-row">
                      <span>{c.categoria}</span>
                      <span>{fmtBRL(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Evolução Mensal */}
          <div className="dash-panel mt-6">
            <div className="panel-header">
              <div className="panel-title-group">
                <div className="title-icon"><TrendingUp size={16} /></div>
                <div>
                  <h3>Evolução Mensal</h3>
                  <p>% do salário gasto por categoria (período selecionado)</p>
                </div>
              </div>
            </div>
            {!rendaMensal || rendaMensal <= 0 ? (
              <div className="empty-state" style={{ height: '200px' }}>
                <p>Defina sua renda mensal para exibir o gráfico.</p>
              </div>
            ) : loading ? (
              <div className="empty-state" style={{ height: '200px' }}>
                <p>Carregando...</p>
              </div>
            ) : chartCategories.length === 0 ? (
              <div className="empty-state" style={{ height: '200px' }}>
                <p>Nenhum gasto no período</p>
              </div>
            ) : (
              <div className="tower-chart">
                {chartCategories.map((c, idx) => {
                  const pct = (c.total / rendaMensal) * 100;
                  const height = maxPercent > 0 ? Math.max(2, Math.min(100, (pct / maxPercent) * 100)) : 0;
                  const label = c.categoria;
                  return (
                    <div key={`${label}-${idx}`} className="tower-item">
                      <div className="tower-bar-wrap" title={`${label}: ${pct.toFixed(1)}% (${fmtBRL(c.total)})`}>
                        <div className={`tower-bar tower-color-${idx % 7}`} style={{ height: `${height}%` }} />
                      </div>
                      <div className="tower-meta">
                        <div className="tower-pct">{pct.toFixed(1)}%</div>
                        <div className="tower-label">{label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dicas da IA */}
          <div className="dash-panel ai-panel mt-6">
            <div className="panel-header">
              <div className="panel-title-group">
                <Sparkles size={20} className="text-primary" />
                <h3>Dicas da IA</h3>
              </div>
              <button className="btn-outline-small">
                <RefreshCw size={14} /> Nova dica
              </button>
            </div>

            <div className="ai-input-wrapper">
              <input
                type="text"
                placeholder="Informe um comando (ex: gastei 50 mercado)"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                disabled={aiBusy}
              />
              <button
                className={`ai-send-btn ${aiButtonAceso ? 'active' : ''}`}
                onClick={handleAiSend}
                disabled={aiBusy || !aiInput.trim()}
              >
                <Send size={16} />
              </button>
            </div>
            <p className="ai-hint">Ex: "gastei 50 mercado" ou "quanto gastei este periodo".</p>

            <div className="ai-empty-state">
              <div className="ai-empty-icon"><Lightbulb size={32} /></div>
              <p>Clique para gerar dicas personalizadas baseadas nos seus gastos</p>
              <button className="btn btn-primary btn-sm">Gerar primeira dica</button>
            </div>
          </div>

          {/* WhatsApp Banner */}
          <div className="whatsapp-banner mt-6">
            <div className="wa-banner-content">
              <div className="wa-icon-large">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3>Seu CFO já está ativo no WhatsApp!</h3>
                <p>Envie comandos para consultar suas finanças a qualquer momento.</p>
              </div>
            </div>
            <div className="wa-commands">
              <span className="wa-cmd">"saldo"</span>
              <span className="wa-cmd">"posso gastar"</span>
              <span className="wa-cmd">"resumo"</span>
            </div>
          </div>
            </>
          )}

          {activeTab === 'transacoes' && (
            <div className="transactions-view">
              <div className="metrics-grid">
                <div className="metric-card bg-success-light border-success">
                  <div className="metric-header text-success">
                    <ArrowUpRight size={20} />
                    <span>Recebidos</span>
                  </div>
                  <div className="metric-value text-success">R$ 0,00</div>
                </div>

                <div className="metric-card bg-danger-light border-danger">
                  <div className="metric-header text-danger">
                    <TrendingDown size={20} />
                    <span>Pagos</span>
                  </div>
                  <div className="metric-value text-danger">
                    {loading ? '...' : fmtBRL(totalGastos)}
                  </div>
                </div>

                <div className="metric-card bg-warning-light border-warning">
                  <div className="metric-header text-warning">
                    <Clock size={20} />
                    <span>A Pagar</span>
                  </div>
                  <div className="metric-value text-warning">
                    {loading ? '...' : fmtBRL(totalGastos)}
                  </div>
                  <div className="metric-footer text-muted">
                    0 pendências
                  </div>
                </div>

                <div className="metric-card bg-info-light border-info">
                  <div className="metric-header text-info">
                    <ArrowDownLeft size={20} />
                    <span>A Receber</span>
                  </div>
                  <div className="metric-value text-info">R$ 0,00</div>
                  <div className="metric-footer text-muted">
                    0 pendências
                  </div>
                </div>
              </div>

              <div className="tab-filters">
                <button className={`tab-filter-btn ${transTab === 'todas' ? 'active' : ''}`} onClick={() => setTransTab('todas')}>Todas</button>
                <button className={`tab-filter-btn ${transTab === 'pagas' ? 'active' : ''}`} onClick={() => setTransTab('pagas')}>Pagas/Recebidas</button>
                <button className={`tab-filter-btn ${transTab === 'apagar' ? 'active' : ''}`} onClick={() => setTransTab('apagar')}>A Pagar</button>
                <button className={`tab-filter-btn ${transTab === 'areceber' ? 'active' : ''}`} onClick={() => setTransTab('areceber')}>A Receber</button>
              </div>

              <div className="transactions-toolbar">
                <div className="search-wrapper">
                  <Search size={18} />
                  <input type="text" placeholder="Buscar transações..." />
                </div>
                <button className="btn btn-success">
                  <Plus size={18} /> Nova Transação
                </button>
              </div>

              <div className="transactions-table-card">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Status</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-state" style={{ minHeight: '200px' }}>
                            <p>Carregando...</p>
                          </div>
                        </td>
                      </tr>
                    ) : transacoesVisiveis.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-state" style={{ minHeight: '200px' }}>
                            <p>Nenhuma transação encontrada</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transacoesVisiveis.map((d) => (
                        <tr key={d.ID_DESPESA}>
                          <td>{d.DT_DESPESA}</td>
                          <td>{d.DS_DESPESA || d.TP_DESPESA}</td>
                          <td>{d.TP_DESPESA}</td>
                          <td>Pago</td>
                          <td>{fmtBRL(Number(d.VL_DESPESA) || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'categorias' && (
            <div className="tab-content-view">
              <div className="view-header">
                <div>
                  <h2>Categorias</h2>
                  <p>Personalize as categorias de gastos e receitas</p>
                </div>
                <button className="btn btn-success">
                  <Plus size={18} /> Nova Categoria
                </button>
              </div>
              {loading ? (
                <div className="empty-state-large">
                  <p>Carregando...</p>
                </div>
              ) : categoriasResumo.length === 0 ? (
                <div className="empty-state-large">
                  <Tags size={48} className="empty-icon" />
                  <h3>Nenhuma categoria criada</h3>
                  <p>Crie categorias para organizar suas transações</p>
                </div>
              ) : (
                <div className="categorias-resumo-list">
                  {categoriasResumo.slice(0, 20).map((c) => (
                    <div key={c.categoria} className="categoria-resumo-row">
                      <span>{c.categoria}</span>
                      <span>{fmtBRL(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'metas' && (
            <div className="tab-content-view">
              <div className="view-header">
                <div>
                  <h2>Metas Financeiras</h2>
                  <p>Defina objetivos e acompanhe seu progresso</p>
                </div>
                <button className="btn btn-success">
                  <Plus size={18} /> Nova Meta
                </button>
              </div>
              <div className="empty-state-large">
                <Target size={48} className="empty-icon" />
                <h3>Nenhuma meta criada</h3>
                <p>Crie metas para acompanhar seus objetivos financeiros</p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
