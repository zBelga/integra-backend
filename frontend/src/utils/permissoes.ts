/**
 * Leitura das permissões do usuário logado na tela.
 *
 * O servidor continua conferindo tudo de novo em cada rota — isto aqui só
 * decide o que aparece: menu, módulos do painel e botões.
 *
 * Sem resposta do servidor ainda, nada é liberado (assume o mínimo).
 */
import type { PermissoesUsuario, PermissaoTela, AcaoTela } from '../types';

const VAZIA: PermissaoTela = { ver: false, criar: false, editar: false, excluir: false, extras: {} };

/** Permissão de uma tela: podeTela(p, 'documentacao.documentos') */
export function telaDe(perm: PermissoesUsuario | null | undefined, chave: string): PermissaoTela {
  if (!perm) return VAZIA;
  const [modulo, tela] = String(chave).split('.');
  const m = perm.modulos?.[modulo];
  const t = m?.telas?.[tela];
  if (!t) return VAZIA;
  return {
    ver: !!t.ver,
    criar: !!t.criar,
    editar: !!t.editar,
    excluir: !!t.excluir,
    extras: t.extras || {},
  };
}

/** podeNaTela(p, 'administrativo.admissoes', 'criar') */
export function podeNaTela(
  perm: PermissoesUsuario | null | undefined,
  chave: string,
  acao: AcaoTela = 'ver'
): boolean {
  const t = telaDe(perm, chave);
  if (!t.ver) return false;
  return acao === 'ver' ? true : !!t[acao];
}

/** podeExtra(p, 'documentacao.documentos', 'baixar') */
export function podeExtra(
  perm: PermissoesUsuario | null | undefined,
  chave: string,
  extra: string
): boolean {
  const t = telaDe(perm, chave);
  return !!(t.ver && t.extras[extra]);
}

/** O módulo aparece no menu? */
export function moduloVisivel(perm: PermissoesUsuario | null | undefined, modulo: string): boolean {
  if (!perm) return false;
  if (perm.master) return true;
  return !!perm.modulos?.[modulo]?.algumAcesso;
}

export function ehMaster(perm: PermissoesUsuario | null | undefined): boolean {
  return !!perm?.master;
}
