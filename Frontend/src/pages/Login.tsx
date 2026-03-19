import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatWhatsAppBR } from '../utils/phoneMask';

interface LoginProps {
  onBack: () => void;
  onRegisterClick: () => void;
  onLoginSuccess: () => void;
  onStartOnboarding: () => void;
}

type UsuarioBackend = {
  ID_USUARIO: number;
  NR_TELEFONE: string;
  NM_USUARIO: string | null;
};

export default function Login({
  onBack,
  onRegisterClick,
  onLoginSuccess,
  onStartOnboarding,
}: LoginProps) {
  // MVP: login sem email/senha. Só pelo número do WhatsApp.
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logarPorTelefone = async () => {
    setError(null);
    setLoading(true);
    try {
      const nrTelefone = telefone.replace(/\D/g, '');
      if (!nrTelefone) throw new Error('Informe seu número de WhatsApp.');

      const res = await fetch('/usuarios');
      if (!res.ok) throw new Error('Falha ao consultar usuários no backend.');

      const data = await res.json();
      const usuariosRaw = Array.isArray(data) ? data : Array.isArray(data?.value) ? data.value : [];
      const usuarios: UsuarioBackend[] = usuariosRaw as UsuarioBackend[];

      const candidatos = new Set<string>([
        nrTelefone,
        // WhatsApp normalmente usa DDI (ex: 55+DDD). Se o usuário digitar sem, tentamos também.
        nrTelefone.startsWith('55') ? nrTelefone.slice(2) : `55${nrTelefone}`,
      ]);

      const found = usuarios.find((u) => candidatos.has(u.NR_TELEFONE));
      if (!found) {
        // Não existe: vai pro onboarding pra criar no backend
        setError('Número não encontrado. Vamos criar sua conta no onboarding.');
        onStartOnboarding();
        return;
      }

      localStorage.setItem(
        'cfo_user',
        JSON.stringify({
          id_usuario: found.ID_USUARIO,
          nr_telefone: found.NR_TELEFONE,
          nm_usuario: found.NM_USUARIO || '',
        })
      );

      onLoginSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao fazer login.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-header text-center">
        <div className="login-logo" onClick={onBack}>
          <div className="login-logo-icon">
            <TrendingUp size={24} />
          </div>
          <h1>Meu CFO</h1>
        </div>
        <h2>Entrar na sua conta</h2>
        <p>Continue controlando suas finanças</p>
      </div>

      <div className="login-card">
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            logarPorTelefone();
          }}
        >
          <div className="form-group">
            <label>WhatsApp</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(formatWhatsAppBR(e.target.value))}
              placeholder="(11) 99999-9999"
            />
          </div>

          {error && <p style={{ color: 'crimson', marginTop: 10 }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ marginTop: '16px' }}
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          Não tem conta? <a href="#" onClick={(e) => { e.preventDefault(); onRegisterClick(); }} className="text-primary">Criar conta grátis</a>
        </div>
      </div>
    </div>
  );
}
