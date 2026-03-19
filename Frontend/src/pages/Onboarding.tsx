import { useState } from 'react';
import { 
  TrendingUp, 
  User, 
  Smartphone, 
  Wallet, 
  Calendar, 
  Target, 
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react';
import { formatWhatsAppBR } from '../utils/phoneMask';

interface OnboardingProps {
  onFinish: () => void;
}

type UsuarioBackend = {
  ID_USUARIO: number;
  NR_TELEFONE: string;
  NM_USUARIO: string | null;
  VL_RENDA_MENSAL?: number | null;
  NR_DIA_RECEBIMENTO?: number | null;
  DS_OBJETIVO?: string | null;
};

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(1);

  // States
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [renda, setRenda] = useState('');
  const [dia, setDia] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const parseMoneyBR = (raw: string): number => {
    const cleaned = raw
      .trim()
      .replace(/\s/g, '')
      .replace(/[^\d,.-]/g, '');

    if (!cleaned) return 0;

    // Ex: "1.234,56" -> "1234.56"
    const hasComma = cleaned.includes(',');
    const normalized = hasComma
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const criarOuRecuperarUsuario = async () => {
    const nrTelefone = whatsapp.replace(/\D/g, '');
    const nmUsuario = nome.trim();
    const vlRendaMensal = renda.trim() ? parseMoneyBR(renda) : null;
    const nrDiaRecebimento = dia ? Number(dia.replace(/\D/g, '')) : null;
    const dsObjetivo = objetivo || null;

    if (!nrTelefone) {
      throw new Error('Informe um número de WhatsApp válido.');
    }
    if (!nmUsuario) {
      throw new Error('Informe seu nome.');
    }

    // Backend: POST /usuarios { nr_telefone, nm_usuario }
    const createRes = await fetch('/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nr_telefone: nrTelefone,
        nm_usuario: nmUsuario,
        vl_renda_mensal: vlRendaMensal,
        nr_dia_recebimento: nrDiaRecebimento,
        ds_objetivo: dsObjetivo,
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      localStorage.setItem(
        'cfo_user',
        JSON.stringify({
          id_usuario: created.id_usuario,
          nr_telefone: created.nr_telefone,
          nm_usuario: created.nm_usuario,
          vl_renda_mensal: created.vl_renda_mensal ?? null,
          nr_dia_recebimento: created.nr_dia_recebimento ?? null,
          ds_objetivo: created.ds_objetivo ?? null,
        })
      );
      return;
    }

    // Se já existir (409), recupera o usuário pela lista e pega o ID.
    if (createRes.status === 409) {
      const listRes = await fetch('/usuarios');
      const list = await listRes.json();
      const listUsuarios = list as UsuarioBackend[];
      const found = listUsuarios.find((u) => u.NR_TELEFONE === nrTelefone);
      if (!found) throw new Error('Usuário já existe, mas não foi possível recuperar o ID.');

      localStorage.setItem(
        'cfo_user',
        JSON.stringify({
          id_usuario: found.ID_USUARIO,
          nr_telefone: found.NR_TELEFONE,
          nm_usuario: found.NM_USUARIO,
          vl_renda_mensal: found.VL_RENDA_MENSAL ?? null,
          nr_dia_recebimento: found.NR_DIA_RECEBIMENTO ?? null,
          ds_objetivo: found.DS_OBJETIVO ?? null,
        })
      );
      return;
    }

    const errText = await createRes.text().catch(() => '');
    throw new Error(`Erro ao criar usuário (${createRes.status}). ${errText}`);
  };

  const handleNext = async () => {
    if (step < 5) {
      setStep(step + 1);
      return;
    }

    // passo 5: cria/recupera usuário no backend e então segue
    setSavingUser(true);
    try {
      await criarOuRecuperarUsuario();
      onFinish();
    } finally {
      setSavingUser(false);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="login-page">
      <div className="login-logo" style={{ marginBottom: '24px' }}>
        <div className="login-logo-icon">
          <TrendingUp size={24} />
        </div>
        <h1>Meu CFO</h1>
      </div>

      <div className="progress-container">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className={`progress-bar ${s <= step ? 'active' : ''}`} />
        ))}
      </div>

      <div className="login-card" style={{ padding: '40px 32px' }}>
        {step === 1 && (
          <div className="onboarding-step">
            <div className="onboarding-header">
              <div className="onboarding-icon">
                <User size={24} />
              </div>
              <div className="onboarding-title-group">
                <h2>Como podemos te chamar?</h2>
                <p>Seu nome aparecerá nas mensagens do WhatsApp</p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label>Seu nome</label>
              <input 
                type="text" 
                placeholder="Ex: João Silva" 
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>

            <button className="btn btn-onboarding btn-block" onClick={handleNext}>
              Continuar <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <div className="onboarding-header">
              <div className="onboarding-icon">
                <Smartphone size={24} />
              </div>
              <div className="onboarding-title-group">
                <h2>Qual seu WhatsApp?</h2>
                <p>É por lá que vamos te enviar alertas e resumos</p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label>Número do WhatsApp</label>
              <input 
                type="text" 
                placeholder="(11) 99999-9999" 
                value={whatsapp}
                onChange={e => setWhatsapp(formatWhatsAppBR(e.target.value))}
              />
            </div>
            
            <p className="onboarding-hint">Vamos usar esse número apenas para te enviar alertas importantes.</p>

            <div className="onboarding-actions">
              <button className="btn btn-onboarding-outline" onClick={handleBack}>
                <ArrowLeft size={18} /> Voltar
              </button>
              <button className="btn btn-onboarding" onClick={handleNext}>
                Continuar <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <div className="onboarding-header">
              <div className="onboarding-icon">
                <Wallet size={24} />
              </div>
              <div className="onboarding-title-group">
                <h2>Qual sua renda mensal?</h2>
                <p>Isso nos ajuda a calcular seu orçamento</p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label>Renda mensal</label>
              <input 
                type="text" 
                placeholder="R$ 0,00" 
                value={renda}
                onChange={e => setRenda(e.target.value)}
              />
            </div>
            
            <p className="onboarding-hint">Inclua salário, freelas e outras fontes de renda.</p>

            <div className="onboarding-actions">
              <button className="btn btn-onboarding-outline" onClick={handleBack}>
                <ArrowLeft size={18} /> Voltar
              </button>
              <button className="btn btn-onboarding" onClick={handleNext}>
                Continuar <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="onboarding-step">
            <div className="onboarding-header">
              <div className="onboarding-icon">
                <Calendar size={24} />
              </div>
              <div className="onboarding-title-group">
                <h2>Qual dia você recebe?</h2>
                <p>Vamos organizar seu mês baseado nessa data</p>
              </div>
            </div>

            <div className="days-grid">
              {['Dia 1', 'Dia 5', 'Dia 10', 'Dia 15', 'Dia 20', 'Dia 25', 'Dia 30'].map(d => (
                <button 
                  key={d} 
                  className={`day-btn ${dia === d ? 'selected' : ''}`}
                  onClick={() => setDia(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            
            <p className="onboarding-hint text-center">Selecione o dia que você recebe seu salário</p>

            <div className="onboarding-actions">
              <button className="btn btn-onboarding-outline" onClick={handleBack}>
                <ArrowLeft size={18} /> Voltar
              </button>
              <button className="btn btn-onboarding" onClick={handleNext}>
                Continuar <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="onboarding-step">
            <div className="onboarding-header">
              <div className="onboarding-icon">
                <Target size={24} />
              </div>
              <div className="onboarding-title-group">
                <h2>Qual seu objetivo principal?</h2>
                <p>Isso nos ajuda a personalizar suas dicas</p>
              </div>
            </div>

            <div className="goals-list">
              {[
                { id: 'dividas', icon: '💪', label: 'Sair das dívidas' },
                { id: 'economizar', icon: '💰', label: 'Economizar' },
                { id: 'organizar', icon: '📊', label: 'Organizar gastos' },
                { id: 'tudo', icon: '🎯', label: 'Tudo isso' }
              ].map(g => (
                <button 
                  key={g.id} 
                  className={`goal-item ${objetivo === g.id ? 'selected' : ''}`}
                  onClick={() => setObjetivo(g.id)}
                >
                  <span className="goal-emoji">{g.icon}</span> {g.label}
                </button>
              ))}
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-onboarding-outline" onClick={handleBack}>
                <ArrowLeft size={18} /> Voltar
              </button>
              <button className="btn btn-onboarding" onClick={handleNext} disabled={savingUser}>
                {savingUser ? 'Salvando...' : 'Concluir'} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
