import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  KeyRound,
  X,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Database,
  Copy,
  Check
} from 'lucide-react';
import { fetchSupabaseStatus, fetchSupabaseSchema, ADMIN_USER_DEFAULT } from '../../services/supabase';
import { loginUser } from '../../services/api';

interface LoginViewProps {
  onLogin: (credentials: { email: string; name: string; role: string }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Supabase status & schema modal states
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [schemaSql, setSchemaSql] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  // Form starts empty - no auto login or pre-filled credentials
  useEffect(() => {
    // Check Supabase status
    fetchSupabaseStatus().then((status) => {
      setSupabaseStatus(status);
    });
  }, []);

  const handleOpenSupabaseModal = async () => {
    setIsSupabaseModalOpen(true);
    const sql = await fetchSupabaseSchema();
    setSchemaSql(sql);
  };

  const handleCopySql = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('Por favor, informe seu e-mail corporativo.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, informe sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginUser(normalizedEmail, password);
      if (!result.success || !result.token) {
        setErrorMessage(result.error || 'Credenciais inválidas.');
        return;
      }

      if (rememberMe) {
        localStorage.setItem('saved_user_email', normalizedEmail);
      } else {
        localStorage.removeItem('saved_user_email');
      }

      onLogin({
        email: result.user?.email || normalizedEmail,
        name:  result.user?.nome  || 'Usuário',
        role:  result.user?.cargo || result.user?.perfil || 'Operacional',
      });
    } catch (err) {
      setErrorMessage('Erro de conexão. Verifique se o servidor está rodando.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    if (forgotEmail.trim().toLowerCase() !== ADMIN_USER_DEFAULT.email.toLowerCase()) {
      setErrorMessage('E-mail não cadastrado como administrador.');
      return;
    }

    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setIsForgotModalOpen(false);
      setForgotEmail('');
    }, 2000);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F5F7F9] text-[#17212B] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 overflow-hidden select-none">
      
      {/* Background Decorative Ambient Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] rounded-full bg-[#E8F3F6] blur-[90px] opacity-75"
        />
        <div 
          className="absolute -bottom-[15%] -right-[10%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] rounded-full bg-[#DDEAF0] blur-[100px] opacity-70"
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-white blur-[120px] opacity-60"
        />
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#176B87 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Main Authentication Container */}
      <div className="relative z-10 w-full max-w-[460px] mx-auto animate-in fade-in zoom-in-95 duration-300">
        
        {/* Brand Identity Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#176B87] text-white shadow-md mb-1 hover:scale-105 transition-transform duration-200">
            <Building2 className="w-8 h-8" />
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#17212B]">
              ÍNTEGRA
            </h1>
            <span className="bg-[#E8F3F6] text-[#176B87] text-[11px] font-bold px-2 py-0.5 rounded-md border border-[#C6E3EB]">
              SaaS Empresarial
            </span>
          </div>

          <p className="text-xs sm:text-sm text-[#687582] max-w-xs mx-auto">
            Acesso administrativo e gestão operacional de obras e admissões
          </p>

          {/* Supabase Connection Status Pill */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleOpenSupabaseModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white hover:bg-[#F8FAFB] border border-[#DDE3E8] rounded-full text-[11px] text-[#17212B] transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-[#176B87]" />
              <span className="font-semibold">
                {supabaseStatus?.connected ? 'Supabase Conectado' : 'Supabase Integrado'}
              </span>
              <span className={`w-2 h-2 rounded-full ${supabaseStatus?.connected ? 'bg-[#159A72]' : 'bg-[#176B87]'}`} />
            </button>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white border border-[#DDE3E8] rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-6">
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-[#FDEBEC] border border-[#FAC5C9] text-[#D64550] rounded-2xl text-xs font-medium flex items-start space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-[#17212B]">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8995A1] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="seu.email@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] placeholder-[#8995A1] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#17212B]">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[11px] font-semibold text-[#176B87] hover:text-[#0F536A] hover:underline cursor-pointer transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8995A1] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] placeholder-[#8995A1] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8995A1] hover:text-[#17212B] transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs text-[#687582] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-[#176B87] bg-white border-[#DDE3E8] rounded focus:ring-[#176B87] cursor-pointer"
                />
                <span>Lembrar e-mail neste dispositivo</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#176B87] hover:bg-[#0F536A] text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs hover:shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Acessar Painel</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Minimal Footer Info */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#687582] px-2 gap-2">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#159A72]" />
            <span className="font-medium">Conexão segura SSL 256-bit & LGPD</span>
          </div>

          <button
            onClick={handleOpenSupabaseModal}
            className="flex items-center space-x-1 text-[#176B87] hover:underline font-semibold cursor-pointer"
          >
            <Database className="w-3 h-3" />
            <span>Detalhes do Banco Supabase</span>
          </button>
        </div>
      </div>

      {/* Supabase Status & SQL Schema Modal */}
      {isSupabaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17212B]/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#DDE3E8] text-[#17212B] rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#176B87] text-white flex items-center justify-center font-bold">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17212B]">Integração com Supabase</h3>
                  <p className="text-[10px] text-[#687582]">Status da conexão e conta de Administrador</p>
                </div>
              </div>
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="text-[#687582] hover:text-[#17212B] p-1.5 rounded-xl hover:bg-[#F4F6F8] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin Info */}
            <div className="p-3.5 bg-[#E8F3F6] border border-[#C6E3EB] rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#176B87] uppercase">Administrador Vinculado:</span>
                <span className="text-[10px] font-bold bg-white text-[#159A72] px-2 py-0.5 rounded border border-[#B8E8D9]">
                  Super Admin
                </span>
              </div>
              <p className="text-xs font-bold text-[#17212B]">Fabrício Oliveira</p>
              <p className="text-xs text-[#687582] font-mono">fabriciooliveira2431@gmail.com</p>
            </div>

            {/* Connection Info */}
            <div className="p-3.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#687582]">Status do Banco:</span>
                <span className="font-bold text-[#17212B]">{supabaseStatus?.database || 'Supabase PostgreSQL / Local'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#687582]">Mensagem:</span>
                <span className="text-[#176B87] font-medium text-right text-[11px]">{supabaseStatus?.message}</span>
              </div>
            </div>

            {/* SQL Script View & Copy */}
            {schemaSql && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17212B]">Script SQL das Tabelas (Supabase):</span>
                  <button
                    onClick={handleCopySql}
                    className="px-2.5 py-1 bg-[#F8FAFB] hover:bg-[#E8F3F6] border border-[#DDE3E8] rounded-lg text-[11px] font-semibold text-[#176B87] flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-[#159A72]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copiado!' : 'Copiar SQL'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#17212B] text-[#E0F2FE] text-[10px] font-mono rounded-xl max-h-40 overflow-y-auto custom-scrollbar">
                  {schemaSql}
                </pre>
              </div>
            )}

            <div className="pt-2 border-t border-[#DDE3E8] flex justify-end">
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="px-4 py-2 bg-[#176B87] text-white rounded-xl text-xs font-bold hover:bg-[#0F536A] transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17212B]/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-[#DDE3E8] text-[#17212B] rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-[0_20px_50px_rgba(23,107,135,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E8]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8F3F6] text-[#176B87] flex items-center justify-center border border-[#C6E3EB]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17212B]">Recuperação de Senha</h3>
                  <p className="text-[10px] text-[#687582]">Redefinição segura de credenciais</p>
                </div>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-[#687582] hover:text-[#17212B] p-1.5 rounded-xl hover:bg-[#F4F6F8] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotSent ? (
              <div className="p-5 bg-[#E8F6F1] border border-[#B8E8D9] text-[#17212B] rounded-2xl text-xs space-y-2 text-center">
                <CheckCircle2 className="w-9 h-9 text-[#159A72] mx-auto" />
                <p className="font-bold text-sm text-[#17212B]">Instruções enviadas com sucesso!</p>
                <p className="text-[#687582] text-xs">
                  Enviamos o link de redefinição de credencial para <strong>{forgotEmail}</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                <p className="text-[#687582] leading-relaxed">
                  Informe o seu e-mail corporativo cadastrado. Você receberá um token seguro com instruções para cadastrar sua nova senha.
                </p>
                <div>
                  <label className="block font-semibold text-[#17212B] mb-1.5">E-mail Cadastrado</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="fabriciooliveira2431@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-xs text-[#17212B] placeholder-[#8995A1] focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2 border border-[#DDE3E8] text-[#17212B] rounded-xl font-semibold hover:bg-[#F8FAFB] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#176B87] hover:bg-[#0F536A] text-white rounded-xl font-semibold cursor-pointer shadow-2xs"
                  >
                    Enviar Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
