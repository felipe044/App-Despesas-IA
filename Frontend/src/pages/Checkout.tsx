import { 
  TrendingUp, 
  Check, 
  ShieldCheck, 
  CreditCard,
  Lock,
  ChevronRight
} from 'lucide-react';

interface CheckoutProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function Checkout({ onBack, onSuccess }: CheckoutProps) {
  return (
    <div className="login-page">
      <div className="login-logo" style={{ marginBottom: '40px' }} onClick={onBack}>
        <div className="login-logo-icon">
          <TrendingUp size={24} />
        </div>
        <h1>Meu CFO</h1>
      </div>

      <div className="checkout-container">
        {/* Left Column: Plan Details */}
        <div className="checkout-card plan-details-card">
          <div className="plan-badge">
            <Check size={14} /> Plano completo
          </div>
          
          <div className="plan-price">
            R$ 49<span>/mês</span>
          </div>
          
          <p className="plan-description">
            Tudo que você precisa para controlar suas finanças.
          </p>
          
          <div className="plan-features">
            <div className="plan-feature">
              <div className="feature-check"><Check size={14} /></div>
              Conexão ilimitada de contas
            </div>
            <div className="plan-feature">
              <div className="feature-check"><Check size={14} /></div>
              Alertas por WhatsApp
            </div>
            <div className="plan-feature">
              <div className="feature-check"><Check size={14} /></div>
              Dashboard completo
            </div>
            <div className="plan-feature">
              <div className="feature-check"><Check size={14} /></div>
              Categorização automática
            </div>
            <div className="plan-feature">
              <div className="feature-check"><Check size={14} /></div>
              Projeções mensais
            </div>
            <div className="plan-feature">
              <div className="feature-check"><Check size={14} /></div>
              Suporte prioritário
            </div>
          </div>
          
          <div className="guarantee-box">
            <div className="guarantee-header">
              <ShieldCheck size={20} className="text-primary" />
              <h4>Garantia de 7 dias</h4>
            </div>
            <p>Se não gostar, devolvemos 100% do seu dinheiro.</p>
          </div>
        </div>

        {/* Right Column: Payment Form */}
        <div className="checkout-card payment-card">
          <div className="payment-header">
            <div className="payment-icon">
              <CreditCard size={24} />
            </div>
            <div>
              <h3>Dados do pagamento</h3>
              <p>Pagamento seguro e criptografado</p>
            </div>
          </div>

          <form className="login-form">
            <div className="form-group">
              <label>Nome no cartão</label>
              <input type="text" placeholder="JOÃO DA SILVA" />
            </div>
            
            <div className="form-group">
              <label>Número do cartão</label>
              <input type="text" placeholder="0000 0000 0000 0000" />
            </div>
            
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Validade</label>
                <input type="text" placeholder="MM/AA" />
              </div>
              <div className="form-group" style={{ width: '120px' }}>
                <label>CVV</label>
                <input type="text" placeholder="123" />
              </div>
            </div>

            <button 
              type="button" 
              className="btn btn-primary btn-block" 
              style={{ marginTop: '24px', padding: '16px', fontSize: '1.125rem' }}
              onClick={onSuccess}
            >
              Assinar por R$ 49/mês <ChevronRight size={20} />
            </button>
          </form>

          <div className="security-badges">
            <div className="badge-item">
              <Lock size={14} /> SSL
            </div>
            <div className="badge-item">
              <ShieldCheck size={14} /> PCI-DSS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
