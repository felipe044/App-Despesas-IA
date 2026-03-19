import { TrendingUp, Eye, Check } from 'lucide-react';

interface RegisterProps {
  onBack: () => void;
  onLoginClick: () => void;
  onRegisterSuccess: () => void;
}

export default function Register({ onBack, onLoginClick, onRegisterSuccess }: RegisterProps) {
  return (
    <div className="login-page">
      <div className="login-header text-center">
        <div className="login-logo" onClick={onBack}>
          <div className="login-logo-icon">
            <TrendingUp size={24} />
          </div>
          <h1>Meu CFO</h1>
        </div>
        <h2>Criar sua conta</h2>
        <p>Comece a controlar suas finanças agora</p>
      </div>

      <div className="login-card">
        <form className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="seu@email.com" />
          </div>
          
          <div className="form-group">
            <label>Senha</label>
            <div className="password-input">
              <input type="password" placeholder="........" />
              <button type="button" className="icon-btn">
                <Eye size={20} />
              </button>
            </div>
            <div className="password-requirements">
              <div className="requirement req-met"><Check size={14} /> Mínimo 8 caracteres</div>
              <div className="requirement req-met"><Check size={14} /> Uma letra maiúscula</div>
              <div className="requirement req-met"><Check size={14} /> Um número</div>
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar senha</label>
            <input type="password" placeholder="........" />
          </div>

          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: '16px' }} onClick={onRegisterSuccess}>
            Criar conta grátis
          </button>
        </form>

        <div className="login-footer">
          Já tem conta? <a href="#" onClick={(e) => { e.preventDefault(); onLoginClick(); }} className="text-primary">Entrar</a>
        </div>
      </div>
      
      <div className="terms-text">
        Ao criar sua conta, você concorda com nossos <a href="#" className="text-primary">Termos de Uso</a> e <a href="#" className="text-primary">Política de Privacidade</a>.
      </div>
    </div>
  );
}
