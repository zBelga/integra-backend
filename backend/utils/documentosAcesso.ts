/**
 * Regras de acesso da gestão de documentos.
 *
 * Usa o sistema de permissões que já existe no ÍNTEGRA — a matriz
 * `cargos_permissoes`, módulo "documentos" — em vez de inventar outro:
 *
 *   visualizar → ver lista, abrir, baixar, histórico
 *   criar      → anexar documento novo
 *   editar     → substituir documento
 *   excluir    → excluir e restaurar
 *
 * Perfis de gestão (master, administrador, gestor de RH) têm acesso total.
 * Quem não tem linha configurada na matriz recebe os valores padrão da própria
 * tabela (só visualizar) — o master libera o resto em "Permissões por Cargo".
 */
import { Request } from 'express';
import { queryRows } from '../db.js';

export type AcaoDocumento = 'visualizar' | 'criar' | 'editar' | 'excluir';

const PERFIS_GESTAO = new Set(['master_admin', 'administrador', 'gestor_rh']);

/** Mesmos padrões da coluna na tabela cargos_permissoes */
const PADRAO: Record<AcaoDocumento, boolean> = {
  visualizar: true,
  criar: false,
  editar: false,
  excluir: false,
};

export function ehGestao(req: Request): boolean {
  return PERFIS_GESTAO.has(String(req.user?.perfil || ''));
}

export function ehMaster(req: Request): boolean {
  return req.user?.perfil === 'master_admin';
}

/** Permissões de documentos do usuário logado, lidas da matriz por cargo. */
export async function permissoesDocumentos(req: Request): Promise<Record<AcaoDocumento, boolean>> {
  if (ehGestao(req)) return { visualizar: true, criar: true, editar: true, excluir: true };

  const userId = req.user?.id;
  if (!userId) return { ...PADRAO };

  try {
    const usuarios = (await queryRows('SELECT cargo_id FROM usuarios WHERE id = ?', [userId])) as any[];
    const cargoId = usuarios[0]?.cargo_id;
    if (!cargoId) return { ...PADRAO };

    const linhas = (await queryRows(
      'SELECT visualizar, criar, editar, excluir FROM cargos_permissoes WHERE cargo_id = ? AND modulo = ?',
      [cargoId, 'documentos']
    )) as any[];
    if (!linhas.length) return { ...PADRAO };

    const p = linhas[0];
    const sim = (v: any) => v === 1 || v === true || v === '1';
    return {
      visualizar: sim(p.visualizar),
      criar: sim(p.criar),
      editar: sim(p.editar),
      excluir: sim(p.excluir),
    };
  } catch {
    // Falha ao ler permissões nunca libera acesso: cai no padrão (só ver)
    return { ...PADRAO };
  }
}

export async function pode(req: Request, acao: AcaoDocumento): Promise<boolean> {
  const p = await permissoesDocumentos(req);
  return p[acao];
}

/**
 * Isolamento entre empresas: o usuário só toca em registros da empresa do
 * token. O master pode alternar entre empresas, então passa direto.
 */
export function mesmaEmpresa(req: Request, empresaDoRegistro?: string | null): boolean {
  if (ehMaster(req)) return true;
  const doToken = req.user?.empresa_id;
  if (!doToken) return false;
  return String(empresaDoRegistro || '') === String(doToken);
}

export const MENSAGEM_SEM_PERMISSAO: Record<AcaoDocumento, string> = {
  visualizar: 'Você não tem permissão para visualizar documentos.',
  criar: 'Você não tem permissão para anexar documentos. Peça a liberação em Permissões por Cargo.',
  editar: 'Você não tem permissão para substituir documentos. Peça a liberação em Permissões por Cargo.',
  excluir: 'Você não tem permissão para excluir documentos. Peça a liberação em Permissões por Cargo.',
};
