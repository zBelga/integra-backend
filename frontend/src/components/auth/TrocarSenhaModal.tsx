import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, Check, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { trocarSenha } from '../../services/api';

/**
 * Janela de troca de senha no primeiro acesso.
 *
 * Aparece por cima de tudo e não tem como fechar: enquanto a senha for a que o
 * administrador cadastrou, o servidor bloqueia o resto do sistema, então deixar
 * a pessoa "pular" só a deixaria num sistema vazio sem entender o motivo.
 */
export const TrocarSenhaModal: React.FC<{
  nome?: string;
  onPronto: () => void;
}> = ({ nome, onPronto }) => {
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
      setErro(err?.message || 'Não foi possível trocar a senha.');
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
          <span className="w-[7px] h-[7px] rounded-full border border-[#B4C0CB]" />
        </span>
      )}
      <span className={ok ? 'text-[#17212B]' : 'text-[#8995A1]'}>{texto}</span>
    </li>
  );

  const primeiroNome = (nome || '').trim().split(' ')[0];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0B1620]/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-trocar-senha"
    >
      <div className="bg-white rounded-2xl w-full max-w-[440px] shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-5 border-b border-[#E4E9ED]">
          <div className="w-11 h-11 rounded-xl bg-[#EEF4F7] border border-[#C6E3EB] flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5 text-[#176B87]" aria-hidden="true" />
          </div>
          <h2 id="titulo-trocar-senha" className="text-lg font-bold text-[#17212B]">
            Crie sua senha
          </h2>
          <p className="text-xs text-[#687582] mt-1.5 leading-relaxed">
            {primeiroNome ? `Olá, ${primeiroNome}. ` : ''}
            A senha que você usou para entrar foi cadastrada pelo administrador e vale só para este
            acesso. Escolha uma senha sua para continuar.
          </p>
        </div>

        <form onSubmit={enviar} noValidate className="px-6 py-5">
          <label htmlFor="modal-nova-senha" className="block text-xs font-semibold text-[#17212B] mb-1.5">
            Nova senha
          </label>
          <div className="relative mb-4">
            <KeyRound className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="modal-nova-senha"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              value={nova}
              onChange={e => setNova(e.target.value)}
              placeholder="••••••••"
              disabled={salvando}
              autoFocus
              className="w-full pl-9 pr-10 py-2.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-sm text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all"
            />
            <button
              type="button"
              onClick={() => setMostrar(v => !v)}
              aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8995A1] hover:text-[#17212B] transition-colors"
            >
              {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <label
            htmlFor="modal-confirma-senha"
            className="block text-xs font-semibold text-[#17212B] mb-1.5"
          >
            Repita a nova senha
          </label>
          <div className="relative mb-4">
            <KeyRound className="w-4 h-4 text-[#8995A1] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="modal-confirma-senha"
              type={mostrar ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirma}
              onChange={e => setConfirma(e.target.value)}
              placeholder="••••••••"
              disabled={salvando}
              className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-sm text-[#17212B] focus:outline-none focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] transition-all"
            />
          </div>

          <ul className="mb-5 space-y-1.5 text-xs">
            <Regra ok={nova.length >= 6} texto="Pelo menos 6 caracteres" />
            <Regra ok={nova.length >= 6 && nova === confirma} texto="As duas senhas são iguais" />
          </ul>

          {(erro || curta || diferem) && (
            <div
              className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-[#FDEBEC] border border-[#F5C6CA] rounded-xl text-xs text-[#A32B36]"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
              <span>
                {erro ||
                  (curta
                    ? 'A senha precisa ter pelo menos 6 caracteres.'
                    : 'As senhas não são iguais.')}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!podeSalvar}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#176B87] hover:bg-[#135a73] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {salvando ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Salvar e continuar
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#8995A1]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#159A72]" aria-hidden="true" />
            Ninguém mais tem acesso à senha que você escolher.
          </p>
        </form>
      </div>
    </div>
  );
};
