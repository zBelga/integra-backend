/**
 * Regras de acesso da gestão de documentos.
 *
 * Tudo vem da matriz `cargos_permissoes`, módulo "documentos" — a mesma que o
 * master configura em "Permissões por Cargo":
 *
 *   visualizar → ver lista, abrir, baixar, histórico
 *   criar      → anexar documento novo
 *   editar     → substituir documento e configurar tipos/exigências
 *   excluir    → excluir e restaurar
 *
 * Só o master tem acesso total automático. Qualquer outro cargo — inclusive
 * administrador e gestor de RH — segue exatamente o que está marcado na
 * matriz. Cargo sem linha configurada fica no padrão: só visualizar.
 */
import { Request } from 'express';
import { permissoesDoModulo, ehMaster as ehMasterGeral, mesmaEmpresa as mesmaEmpresaGeral } from './permissoes.js';

export type AcaoDocumento = 'visualizar' | 'criar' | 'editar' | 'excluir';

export function ehMaster(req: Request): boolean {
  return ehMasterGeral(req);
}

/** Mantido por compatibilidade: agora "gestão" é só quem pode editar. */
export async function ehGestaoDocumentos(req: Request): Promise<boolean> {
  const p = await permissoesDocumentos(req);
  return p.editar;
}

/** Permissões de documentos do usuário logado, lidas da matriz por cargo. */
export async function permissoesDocumentos(req: Request): Promise<Record<AcaoDocumento, boolean>> {
  return permissoesDoModulo(req, 'documentos');
}

export async function pode(req: Request, acao: AcaoDocumento): Promise<boolean> {
  const p = await permissoesDocumentos(req);
  return p[acao];
}

/** Isolamento entre empresas: fora do master, só a empresa do token. */
export function mesmaEmpresa(req: Request, empresaDoRegistro?: string | null): boolean {
  return mesmaEmpresaGeral(req, empresaDoRegistro);
}

export const MENSAGEM_SEM_PERMISSAO: Record<AcaoDocumento, string> = {
  visualizar: 'Você não tem permissão para visualizar documentos.',
  criar: 'Você não tem permissão para anexar documentos. Peça a liberação em Permissões por Cargo.',
  editar: 'Você não tem permissão para substituir documentos. Peça a liberação em Permissões por Cargo.',
  excluir: 'Você não tem permissão para excluir documentos. Peça a liberação em Permissões por Cargo.',
};
