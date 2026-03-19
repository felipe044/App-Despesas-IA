import { 
  TrendingUp, 
  ArrowRight, 
  ShieldCheck, 
  MessageCircle, 
  PieChart, 
  Check,
  Users,
  Banknote,
  Star
} from 'lucide-react';

interface HomeProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export default function Home({ onLoginClick, onRegisterClick }: HomeProps) {
  return (
    <>
      <header className="header">
        <div className="container">
          <div className="logo">
            <TrendingUp size={28} />
            Meu CFO
          </div>
          <div className="header-actions">
            <button className="btn btn-outline-gray" onClick={onLoginClick}>Entrar</button>
            <button className="btn btn-primary" onClick={onRegisterClick}>Criar conta</button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-content">
              <h1>
                Tenha seu dinheiro sob controle sem <span className="text-primary">planilhas</span>.
              </h1>
              <p>
                Um CFO pessoal que cuida do seu dinheiro e te avisa pelo WhatsApp antes de você entrar no vermelho.
              </p>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={onRegisterClick}>
                  Começar agora <ArrowRight size={20} />
                </button>
                <button className="btn btn-secondary">
                  Ver demonstração
                </button>
              </div>
              
              <div className="social-proof">
                <div className="proof-item">
                  <div className="proof-number">
                    <Users size={20} className="text-primary" /> 50k+
                  </div>
                  <div className="proof-label">Usuários ativos</div>
                </div>
                <div className="proof-item">
                  <div className="proof-number">
                    <Banknote size={20} className="text-primary" /> R$2M+
                  </div>
                  <div className="proof-label">Economizados</div>
                </div>
                <div className="proof-item">
                  <div className="proof-number">
                    <Star size={20} className="text-primary" fill="currentColor" /> 4.9
                  </div>
                  <div className="proof-label">Avaliação</div>
                </div>
              </div>
            </div>
            
            <div className="hero-image-wrapper">
              <img 
                src="/mockup.png" 
                alt="App Interface Mockup" 
                className="hero-image"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features">
          <div className="container">
            <div className="features-header">
              <h2>Por que escolher o Meu CFO?</h2>
              <p>Abandonamos as planilhas complexas para trazer inteligência e simplicidade para sua vida financeira.</p>
            </div>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <ShieldCheck size={28} />
                </div>
                <h3>Open Finance Seguro</h3>
                <p>Conecte todas as suas contas bancárias de forma 100% segura. Nós não movimentamos seu dinheiro, apenas organizamos os dados.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <MessageCircle size={28} />
                </div>
                <h3>WhatsApp Inteligente</h3>
                <p>Receba alertas em tempo real sobre seu orçamento, faturas a vencer e quando você estiver prestes a entrar no vermelho.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <PieChart size={28} />
                </div>
                <h3>Categorização Automática</h3>
                <p>O Meu CFO entende seus hábitos e categoriza cada centavo gasto usando inteligência artificial de ponta, sem esforço manual.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="pricing">
          <div className="container">
            <div className="pricing-card">
              <div className="pricing-header">
                <h2>O melhor investimento</h2>
                <p>Transforme sua vida financeira por menos que um café gourmet.</p>
              </div>
              
              <div className="pricing-price">
                R$ 49<span>/mês</span>
              </div>
              
              <div className="pricing-features">
                <div className="pricing-feature">
                  <Check size={20} className="check-icon" />
                  Conexão ilimitada de contas
                </div>
                <div className="pricing-feature">
                  <Check size={20} className="check-icon" />
                  Alertas proativos via WhatsApp
                </div>
                <div className="pricing-feature">
                  <Check size={20} className="check-icon" />
                  Dashboard inteligente completo
                </div>
                <div className="pricing-feature">
                  <Check size={20} className="check-icon" />
                  Categorização automática com IA
                </div>
                <div className="pricing-feature">
                  <Check size={20} className="check-icon" />
                  Projeções financeiras mensais
                </div>
                <div className="pricing-feature">
                  <Check size={20} className="check-icon" />
                  Suporte VIP e prioritário
                </div>
              </div>
              
              <div className="pricing-footer">
                <button className="btn btn-primary" onClick={onRegisterClick}>
                  Começar agora
                </button>
                <p>7 dias grátis para testar. Cancele quando quiser.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="logo">
            <TrendingUp size={24} />
            Meu CFO
          </div>
          <div className="footer-copy">
            &copy; 2025 Meu CFO. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </>
  );
}
