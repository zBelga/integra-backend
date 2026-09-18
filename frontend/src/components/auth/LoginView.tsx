import React, { useState, useEffect, useCallback, memo } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { loginUser } from '../../services/api';

interface LoginViewProps {
  onLogin: (credentials: { email: string; name: string; role: string }) => void;
}

const EMAIL_SALVO = 'saved_user_email';

/**
 * Marca do ÍNTEGRA em SVG inline — nítida em qualquer densidade de tela
 * e sem custar uma requisição de rede.
 */
const Marca = memo(({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none">
    <rect x="2" y="2" width="44" height="44" rx="13" stroke="currentColor" strokeWidth="2.5" />
    <rect x="14" y="26" width="5"  height="10" rx="1.2" fill="currentColor" />
    <rect x="21.5" y="19" width="5" height="17" rx="1.2" fill="currentColor" />
    <rect x="29" y="23" width="5"  height="13" rx="1.2" fill="currentColor" />
    <path d="M24 10.5l7 4.5H17l7-4.5z" fill="currentColor" />
  </svg>
));
Marca.displayName = 'Marca';

/**
 * Verdadeiro quando a tela comporta o painel de arte (>= 1024px).
 *
 * Isto existe por um motivo de performance: `display:none` NÃO impede o
 * navegador de baixar a imagem. Sem este controle, todo acesso pelo celular
 * baixaria ~31 KB de uma arte que nunca aparece. O valor inicial é lido de
 * forma síncrona, então não há piscada nem layout shift.
 */
function useTelaGrande(): boolean {
  const consultar = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const [grande, setGrande] = useState(consultar);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const aoMudar = (e: MediaQueryListEvent) => setGrande(e.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  return grande;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const telaGrande = useTelaGrande();

  // Único efeito da tela: recupera o e-mail lembrado. Sem rede.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(EMAIL_SALVO);
      if (salvo) {
        setEmail(salvo);
        setRememberMe(true);
      }
    } catch {
      /* localStorage bloqueado — segue sem preencher */
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage('');

      const emailNormalizado = email.trim().toLowerCase();

      if (!emailNormalizado) {
        setErrorMessage('Informe seu e-mail corporativo.');
        return;
      }
      if (!password) {
        setErrorMessage('Informe sua senha de acesso.');
        return;
      }

      setIsLoading(true);
      try {
        const result = await loginUser(emailNormalizado, password);

        if (!result.success || !result.token) {
          setErrorMessage(result.error || 'Credenciais inválidas.');
          return;
        }

        try {
          if (rememberMe) localStorage.setItem(EMAIL_SALVO, emailNormalizado);
          else localStorage.removeItem(EMAIL_SALVO);
        } catch {
          /* ignora */
        }

        onLogin({
          email: result.user?.email || emailNormalizado,
          name:  result.user?.nome  || 'Usuário',
          role:  result.user?.cargo || result.user?.perfil || 'Operacional',
        });
      } catch {
        setErrorMessage('Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, rememberMe, onLogin]
  );

  return (
    <div className="login-integra min-h-screen w-full flex bg-[#061421] text-white">
      {/* ──────────────── PAINEL ESQUERDO: arte ──────────────── */}
      {telaGrande && (
      <aside className="relative w-[54%] xl:w-[56%] shrink-0 overflow-hidden">
        <picture>
          <source
            type="image/avif"
            srcSet="/login/integra-640.avif 640w, /login/integra-960.avif 960w, /login/integra-1374.avif 1374w"
            sizes="56vw"
          />
          <source
            type="image/webp"
            srcSet="/login/integra-640.webp 640w, /login/integra-960.webp 960w, /login/integra-1374.webp 1374w"
            sizes="56vw"
          />
          <img
            src="/login/integra-1374.webp"
            alt="ÍNTEGRA — plataforma de gestão de obras, admissões e colaboradores"
            width={1374}
            height={1145}
            decoding="async"
            /* LCP da tela: carrega com prioridade, nunca lazy */
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-left"
          />
        </picture>

        {/* Emenda suave entre a arte e o formulário */}
        <div
          className="absolute inset-y-0 right-0 w-40 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(6,20,33,0), #061421)' }}
          aria-hidden="true"
        />
      </aside>
      )}

      {/* ──────────────── PAINEL DIREITO: formulário ──────────────── */}
      <main className="relative flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
        {/* Brilho ambiente — gradiente puro, sem filter:blur (barato de compor) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 50% at 70% 15%, rgba(34,164,214,0.16), transparent 70%),' +
              'radial-gradient(50% 40% at 20% 90%, rgba(23,107,135,0.14), transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="login-entrada relative w-full max-w-[400px]">
          {/* Marca */}
          <header className="mb-9">
            <div className="flex items-center gap-3">
              <Marca className="w-10 h-10 text-[#3BC6F0]" />
              <div className="leading-none">
                <h1 className="text-[26px] font-bold tracking-[0.14em] text-white">ÍNTEGRA</h1>
                <p className="mt-1.5 text-[10px] tracking-[0.22em] text-[#7FA8C0] uppercase">
                  Gestão Empresarial
                </p>
              </div>
            </div>

            <h2 className="mt-8 text-[22px] font-semibold text-white leading-snug">
              Acesse sua conta
            </h2>
            <p className="mt-1.5 text-sm text-[#8FB0C6]">
              Entre para gerenciar obras, admissões e documentos.
            </p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            {/* E-mail */}
            <label htmlFor="login-email" className="block text-xs font-medium text-[#A8C5D8] mb-2">
              E-mail corporativo
            </label>
            <div className="campo-integra mb-5">
              <Mail className="w-[18px] h-[18px] text-[#5E86A0]" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                disabled={isLoading}
                aria-invalid={!!errorMessage}
              />
            </div>

            {/* Senha */}
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="login-senha" className="block text-xs font-medium text-[#A8C5D8]">
                Senha de acesso
              </label>
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-xs text-[#3BC6F0] hover:text-[#7ADCFA] transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="campo-integra mb-5">
              <Lock className="w-[18px] h-[18px] text-[#5E86A0]" aria-hidden="true" />
              <input
                id="login-senha"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                aria-invalid={!!errorMessage}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="text-[#5E86A0] hover:text-[#9FC4DA] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>

            {/* Lembrar */}
            <label className="flex items-center gap-2.5 mb-6 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="check-integra"
              />
              <span className="text-xs text-[#8FB0C6]">Lembrar meu e-mail neste dispositivo</span>
            </label>

            {/* Erro */}
            {errorMessage && (
              <div className="alerta-integra mb-5" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Entrar */}
            <button type="submit" disabled={isLoading} className="botao-integra">
              {isLoading ? (
                <>
                  <span className="spinner-integra" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar painel
                  <ArrowRight className="w-[18px] h-[18px] seta-integra" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <footer className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[#5E86A0]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#159A72]" aria-hidden="true" />
            <span>Conexão segura SSL 256-bit · LGPD</span>
          </footer>
        </div>

        {/* ── Recuperação de senha ── */}
        {isForgotOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-[#03101B]/80"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-recuperacao"
            onClick={() => setIsForgotOpen(false)}
          >
            <div
              className="login-entrada w-full max-w-[380px] rounded-2xl border border-[#1B3D55] bg-[#0A1E2E] p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 id="titulo-recuperacao" className="text-base font-semibold text-white">
                  Recuperar acesso
                </h3>
                <button
                  onClick={() => setIsForgotOpen(false)}
                  aria-label="Fechar"
                  className="text-[#5E86A0] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="mt-3 text-sm text-[#8FB0C6] leading-relaxed">
                A redefinição de senha é feita pelo administrador do sistema. Entre em
                contato para solicitar uma nova senha de acesso.
              </p>

              <a
                href="mailto:fabriciooliveira2431@gmail.com?subject=Redefini%C3%A7%C3%A3o%20de%20senha%20-%20%C3%8DNTEGRA"
                className="botao-integra mt-5 no-underline"
              >
                Falar com o administrador
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
