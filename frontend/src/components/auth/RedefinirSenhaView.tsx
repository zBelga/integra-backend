import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Check, AlertCircle, ShieldCheck, ArrowRight, LogOut } from 'lucide-react';
import { trocarSenha } from '../../services/api';

/**
 * Tela de redefinição de senha no primeiro acesso.
 *
 * É uma tela inteira, não uma janela: enquanto a senha for a que o
 * administrador cadastrou, o sistema não abre. Ela aparece logo depois do
 * login, antes de qualquer carregamento de empresa ou permissão — quem manda
 * é a resposta do próprio login, e não há nada mais a dar errado no caminho.
 */
export const RedefinirSenhaView: React.FC<{
  nome?: string;
  email?: string;
  onPronto: () => void;
  onSair: () => void;
}> = ({ nome, email, onPronto, onSair }) => {
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const curta = nova.length > 0 && nova.length < 6;
  const diferem = confirma.length > 0 && nova !== confirma;
  const podeSalvar = nova.length >= 6 && nova === confirma && !salvando;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      await trocarSenha(nova);
      onPronto();
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível salvar a senha. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const Regra = ({ ok, texto }: { ok: boolean; texto: string }) => (
    <li className="flex items-center gap-2">
      {ok ? (
        <Check className="w-3.5 h-3.5 shrink-0 text-[#159A72]" aria-hidden="true" />
      ) : (
        <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center" aria-hidden="true">
          <span className="w-[7px] h-[7px] rounded-full border border-[#44637A]" />
        </span>
      )}
      <span className={ok ? 'text-[#A8C5D8]' : 'text-[#6D8EA5]'}>{texto}</span>
    </li>
  );

  const primeiroNome = (nome || '').trim().split(' ')[0];

  return (
    <div className="login-integra min-h-screen w-full flex items-center justify-center bg-[#061421] text-white px-5 py-10">
      {/* Brilho ambiente, igual ao login */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 50% at 70% 15%, rgba(34,164,214,0.16), transparent 70%),' +
            'radial-gradient(50% 40% at 20% 90%, rgba(23,107,135,0.14), transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="login-entrada relative w-full max-w-[420px]">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 48 48" className="w-10 h-10 text-[#3BC6F0]" aria-hidden="true" fill="none">
              <rect x="2" y="2" width="44" height="44" rx="13" stroke="currentColor" strokeWidth="2.5" />
              <rect x="14" y="26" width="5" height="10" rx="1.2" fill="currentColor" />
              <rect x="21.5" y="19" width="5" height="17" rx="1.2" fill="currentColor" />
              <rect x="29" y="23" width="5" height="13" rx="1.2" fill="currentColor" />
              <path d="M24 10.5l7 4.5H17l7-4.5z" fill="currentColor" />
            </svg>
            <div className="leading-none">
              <h1 className="text-[26px] font-bold tracking-[0.14em] text-white">ÍNTEGRA</h1>
              <p className="mt-1.5 text-[10px] tracking-[0.22em] text-[#7FA8C0] uppercase">
                Primeiro acesso
              </p>
            </div>
          </div>

          <h2 className="mt-8 text-[22px] font-semibold text-white leading-snug">
            Redefina sua senha
          </h2>
          <p className="mt-1.5 text-sm text-[#8FB0C6]">
            {primeiroNome ? `Olá, ${primeiroNome}. ` : ''}
            A senha que você usou para entrar foi cadastrada pelo administrador e vale só para este
            acesso. Crie a sua para continuar.
          </p>
          {email && (
            <p className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0E2435] border border-[#1C3E55] text-[11px] text-[#A8C5D8]">
              {email}
            </p>
          )}
        </header>

        <form onSubmit={enviar} noValidate>
          <label htmlFor="nova-senha" className="block text-xs font-medium text-[#A8C5D8] mb-2">
            Nova senha
          </label>
          <div className="campo-integra mb-5">
            <KeyRound className="w-[18px] h-[18px] text-[#5E86A0]" aria-hidden="true" />
            <input
              id="nova-senha"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              value={nova}
              onChange={e => setNova(e.target.value)}
              placeholder="••••••••"
              disabled={salvando}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setMostrar(v => !v)}
              aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
              className="text-[#5E86A0] hover:text-[#9FC4DA] transition-colors"
              tabIndex={-1}
            >
              {mostrar ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>

          <label htmlFor="confirma-senha" className="block text-xs font-medium text-[#A8C5D8] mb-2">
            Repita a nova senha
          </label>
          <div className="campo-integra mb-4">
            <KeyRound className="w-[18px] h-[18px] text-[#5E86A0]" aria-hidden="true" />
            <input
              id="confirma-senha"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirma}
              onChange={e => setConfirma(e.target.value)}
              placeholder="••••••••"
              disabled={salvando}
            />
          </div>

          <ul className="mb-6 space-y-1.5 text-xs">
            <Regra ok={nova.length >= 6} texto="Pelo menos 6 caracteres" />
            <Regra ok={nova.length >= 6 && nova === confirma} texto="As duas senhas são iguais" />
          </ul>

          {(erro || curta || diferem) && (
            <div className="alerta-integra mb-5" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              <span>
                {erro ||
                  (curta
                    ? 'A senha precisa ter pelo menos 6 caracteres.'
                    : 'As senhas não são iguais.')}
              </span>
            </div>
          )}

          <button type="submit" disabled={!podeSalvar} className="botao-integra">
            {salvando ? (
              <>
                <span className="spinner-integra" aria-hidden="true" />
                Salvando...
              </>
            ) : (
              <>
                Salvar e entrar
                <ArrowRight className="w-[18px] h-[18px] seta-integra" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onSair}
            className="flex items-center gap-1.5 text-xs text-[#7FA8C0] hover:text-[#A8C5D8] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sair e entrar com outra conta
          </button>
          <p className="flex items-center gap-2 text-[11px] text-[#5E86A0]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#159A72]" aria-hidden="true" />
            Ninguém mais tem acesso à senha que você escolher.
          </p>
        </div>
      </div>
    </div>
  );
};
