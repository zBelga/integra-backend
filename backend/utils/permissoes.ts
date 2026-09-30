/**
 * Permissões por cargo — a regra única do ÍNTEGRA.
 *
 * Tudo sai da matriz `cargos_permissoes` (módulo × ação), a mesma que o
 * master configura em "Permissões por Cargo". O cargo vem SEMPRE do usuário
 * do token: nada que o navegador mande (cabeçalho, body, query) é aceito.
 *
 * Regras:
 *  - master_admin: acesso total, e só ele mexe em empresas, usuários,
 *    cargos e na própria matriz de permissões.
 *  - demais cargos: o que estiver marcado na matriz. Sem linha configurada,
 *    vale o padrão conservador: só visualizar.
 *  - qualquer falha ao ler permissões nunca libera nada.
 */
import { Request, Response, NextFunction } from 'express';
import { queryRows } from '../db.js';

export type Acao = 'visualizar' | 'criar' | 'editar' | 'excluir' | 'solicitar' | 'aprovar';

/** Todas as ações que a matriz controla, na ordem em que a tela mostra. */
export const ACOES: Acao[] = ['visualizar', 'criar', 'editar', 'excluir', 'solicitar', 'aprovar'];

/** Todos os módulos que a matriz controla, na ordem em que a tela mostra. */
export const MODULOS = [
  'admissoes',
  'efetivo',
  'obras',
  'documentos',
  'rh',
  'relatorios',
  'usuarios',
] as const;

export type Modulo = (typeof MODULOS)[number];

/** Cargo sem linha na matriz: enxerga e pode pedir, mas não altera nada. */
const PADRAO: Record<Acao, boolean> = {
  visualizar: true,
  criar: false,
  editar: false,
  excluir: false,
  solicitar: true,
  aprovar: false,
};

const TUDO: Record<Acao, boolean> = {
  visualizar: true,
  criar: true,
  editar: true,
  excluir: true,
  solicitar: true,
  aprovar: true,
};

export function ehMaster(req: Request): boolean {
  return String(req.user?.perfil || '') === 'master_admin';
}

const sim = (v: any) => v === 1 || v === true || v === '1';

/** Cargo do usuário logado (id da tabela cargos), lido pelo id do token. */
async function cargoDoUsuario(req: Request): Promise<string> {
  const userId = req.user?.id;
  if (!userId) return '';
  const linhas = (await queryRows('SELECT cargo_id FROM usuarios WHERE id = ?', [userId])) as any[];
  return String(linhas[0]?.cargo_id || '');
}

/**
 * Permissões do usuário em um módulo. Fica em cache no próprio pedido para
 * não consultar o banco várias vezes na mesma requisição.
 */
export async function permissoesDoModulo(req: Request, modulo: Modulo): Promise<Record<Acao, boolean>> {
  if (ehMaster(req)) return { ...TUDO };

  const cache = ((req as any)._permissoesCache ||= {} as Record<string, Record<Acao, boolean>>);
  if (cache[modulo]) return cache[modulo];

  let resultado: Record<Acao, boolean> = { ...PADRAO };
  try {
    const cargoId = await cargoDoUsuario(req);
    if (cargoId) {
      const linhas = (await queryRows(
        'SELECT visualizar, criar, editar, excluir, solicitar, aprovar FROM cargos_permissoes WHERE cargo_id = ? AND modulo = ?',
        [cargoId, modulo]
      )) as any[];
      if (linhas.length) {
        const p = linhas[0];
        resultado = {
          visualizar: sim(p.visualizar),
          criar: sim(p.criar),
          editar: sim(p.editar),
          excluir: sim(p.excluir),
          solicitar: sim(p.solicitar),
          aprovar: sim(p.aprovar),
        };
      }
    }
  } catch {
    resultado = { ...PADRAO };
  }

  cache[modulo] = resultado;
  return resultado;
}

/** Matriz completa do usuário — o frontend usa para montar menu e botões. */
export async function permissoesDoUsuario(req: Request): Promise<Record<Modulo, Record<Acao, boolean>>> {
  const saida = {} as Record<Modulo, Record<Acao, boolean>>;
  for (const m of MODULOS) saida[m] = await permissoesDoModulo(req, m);
  return saida;
}

export async function pode(req: Request, modulo: Modulo, acao: Acao): Promise<boolean> {
  const p = await permissoesDoModulo(req, modulo);
  return p[acao];
}

const NOME_ACAO: Record<Acao, string> = {
  visualizar: 'visualizar',
  criar: 'cadastrar',
  editar: 'editar',
  excluir: 'excluir',
  solicitar: 'solicitar alteração',
  aprovar: 'aprovar solicitações',
};

/** Middleware: exige a permissão do módulo, senão responde 403. */
export function exigir(modulo: Modulo, acao: Acao) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (await pode(req, modulo, acao)) return next();
    } catch {
      /* cai no 403 */
    }
    return res.status(403).json({
      success: false,
      error: `Seu cargo não tem permissão para ${NOME_ACAO[acao]} neste módulo. Peça a liberação em Permissões por Cargo.`,
    });
  };
}

/** Middleware: só o administrador geral (master). */
export function somenteMaster(req: Request, res: Response, next: NextFunction) {
  if (ehMaster(req)) return next();
  return res.status(403).json({
    success: false,
    error: 'Esta área é exclusiva do administrador geral.',
  });
}

/** Isolamento entre empresas: fora do master, só a empresa do token. */
export function mesmaEmpresa(req: Request, empresaDoRegistro?: string | null): boolean {
  if (ehMaster(req)) return true;
  const doToken = req.user?.empresa_id;
  if (!doToken) return false;
  return String(empresaDoRegistro || '') === String(doToken);
}
