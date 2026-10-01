/**
 * Permissões por cargo — a regra única do ÍNTEGRA.
 *
 * O acesso é decidido em dois andares, como na tela de Cargos & Permissões:
 *
 *   módulo (Administrativo, Documentação…)
 *     └── tela (Admissões, Efetivo Geral, Documentos do colaborador…)
 *           ver · criar · editar · excluir  +  ações especiais da tela
 *                                              (contratar, baixar, exportar…)
 *
 * Guardado em `cargos_telas`. O cargo vem SEMPRE do usuário do token: nada
 * que o navegador mande (cabeçalho, body, query) é aceito.
 *
 * Regras:
 *  - master_admin: acesso total, e só ele mexe em empresas, usuários, cargos
 *    e nas próprias permissões.
 *  - demais cargos: exatamente o que estiver marcado. Nada marcado = nada.
 *  - cargo ainda sem linha em `cargos_telas`: lê a matriz antiga
 *    (`cargos_permissoes`) e traduz, para ninguém ficar travado na virada.
 *  - qualquer falha ao ler permissões nunca libera nada.
 */
import { Request, Response, NextFunction } from 'express';
import { queryRows } from '../db.js';
import { CATALOGO, AcaoTela, buscarTela, partirChave } from './catalogoPermissoes.js';

export type { AcaoTela } from './catalogoPermissoes.js';

/** Permissão de uma tela para um cargo. */
export interface PermissaoTela {
  ver: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  extras: Record<string, boolean>;
}

export type MapaTelas = Record<string, PermissaoTela>;

const VAZIA: PermissaoTela = { ver: false, criar: false, editar: false, excluir: false, extras: {} };

function telaVazia(): PermissaoTela {
  return { ver: false, criar: false, editar: false, excluir: false, extras: {} };
}

function telaCheia(chave: string): PermissaoTela {
  const achado = buscarTela(chave);
  const extras: Record<string, boolean> = {};
  (achado?.tela.extras || []).forEach(e => { extras[e.id] = true; });
  return { ver: true, criar: true, editar: true, excluir: true, extras };
}

export function ehMaster(req: Request): boolean {
  return String(req.user?.perfil || '') === 'master_admin';
}

const sim = (v: any) => v === 1 || v === true || v === '1';

function lerExtras(texto: any): Record<string, boolean> {
  try {
    const obj = typeof texto === 'string' ? JSON.parse(texto || '{}') : texto || {};
    const saida: Record<string, boolean> = {};
    Object.keys(obj).forEach(k => { saida[k] = !!obj[k]; });
    return saida;
  } catch {
    return {};
  }
}

/** Cargo do usuário logado (id da tabela cargos), lido pelo id do token. */
async function cargoDoUsuario(req: Request): Promise<string> {
  const userId = req.user?.id;
  if (!userId) return '';
  const linhas = (await queryRows('SELECT cargo_id FROM usuarios WHERE id = ?', [userId])) as any[];
  return String(linhas[0]?.cargo_id || '');
}

// ─────────────────────────────────────────────────────────────
// Leitura das permissões de um cargo
// ─────────────────────────────────────────────────────────────

/**
 * Tradução da matriz antiga (módulo × ação) para o modelo de telas.
 * Vale só enquanto o cargo não for salvo no formato novo.
 */
export async function telasDaMatrizAntiga(cargoId: string): Promise<MapaTelas> {
  const mapa: MapaTelas = {};
  const linhas = (await queryRows(
    'SELECT modulo, visualizar, criar, editar, excluir, solicitar, aprovar FROM cargos_permissoes WHERE cargo_id = ?',
    [cargoId]
  )) as any[];

  if (!linhas.length) return mapa;

  const porModulo: Record<string, any> = {};
  linhas.forEach(l => { porModulo[String(l.modulo)] = l; });

  const copiar = (origem: string, chave: string, extras: Record<string, boolean> = {}) => {
    const l = porModulo[origem];
    if (!l || !sim(l.visualizar)) return;
    // A tela pode não ter alguma das ações padrão (relatório não "cria", por ex.)
    const sem = buscarTela(chave)?.tela.semAcoes || [];
    const tem = (a: AcaoTela, valor: boolean) => (sem.includes(a) ? false : valor);
    mapa[chave] = {
      ver: true,
      criar: tem('criar', sim(l.criar)),
      editar: tem('editar', sim(l.editar)),
      excluir: tem('excluir', sim(l.excluir)),
      extras,
    };
  };

  copiar('admissoes', 'administrativo.admissoes', {
    contratar: sim(porModulo['admissoes']?.editar),
    importar: sim(porModulo['admissoes']?.criar),
    exportar: true,
  });
  copiar('efetivo', 'administrativo.efetivo', { exportar: true, desligar: sim(porModulo['efetivo']?.excluir) });
  copiar('efetivo', 'administrativo.efetivoObra', { remanejar: sim(porModulo['efetivo']?.editar) });
  copiar('obras', 'administrativo.obras');
  copiar('documentos', 'documentacao.documentos', {
    baixar: true,
    restaurar: sim(porModulo['documentos']?.excluir),
  });
  copiar('documentos', 'documentacao.tipos');
  copiar('documentos', 'documentacao.porFuncao');
  copiar('relatorios', 'relatorios.gerais', { exportar: true });

  const solic = porModulo['admissoes'] || porModulo['documentos'];
  if (solic && (sim(solic.solicitar) || sim(solic.aprovar))) {
    mapa['aprovacoes.solicitacoes'] = {
      ver: true,
      criar: sim(solic.solicitar),
      editar: sim(solic.aprovar),
      excluir: false,
      extras: { aprovar: sim(solic.aprovar) },
    };
  }

  return mapa;
}

/** Todas as telas liberadas para o cargo, já resolvidas. Com cache por pedido. */
export async function telasDoUsuario(req: Request): Promise<MapaTelas> {
  const cache = (req as any)._telasCache as MapaTelas | undefined;
  if (cache) return cache;

  let mapa: MapaTelas = {};

  if (ehMaster(req)) {
    CATALOGO.forEach(m => m.telas.forEach(t => {
      mapa[`${m.id}.${t.id}`] = telaCheia(`${m.id}.${t.id}`);
    }));
    (req as any)._telasCache = mapa;
    return mapa;
  }

  try {
    const cargoId = await cargoDoUsuario(req);
    if (cargoId) {
      const linhas = (await queryRows(
        'SELECT modulo, tela, ver, criar, editar, excluir, extras FROM cargos_telas WHERE cargo_id = ?',
        [cargoId]
      )) as any[];

      if (linhas.length) {
        linhas.forEach(l => {
          const chave = `${l.modulo}.${l.tela}`;
          mapa[chave] = {
            ver: sim(l.ver),
            criar: sim(l.criar),
            editar: sim(l.editar),
            excluir: sim(l.excluir),
            extras: lerExtras(l.extras),
          };
        });
      } else {
        mapa = await telasDaMatrizAntiga(cargoId);
      }
    }
  } catch {
    mapa = {};
  }

  (req as any)._telasCache = mapa;
  return mapa;
}

/** Permissão de uma tela específica ('administrativo.admissoes'). */
export async function permissaoDaTela(req: Request, chave: string): Promise<PermissaoTela> {
  const mapa = await telasDoUsuario(req);
  return mapa[chave] || telaVazia();
}

/** Pode fazer a ação padrão na tela? Qualquer ação exige também o 'ver'. */
export async function podeNaTela(req: Request, chave: string, acao: AcaoTela): Promise<boolean> {
  const p = await permissaoDaTela(req, chave);
  if (!p.ver) return false;
  return acao === 'ver' ? true : !!p[acao];
}

/** Pode usar a ação especial da tela (contratar, baixar, exportar…)? */
export async function podeExtra(req: Request, chave: string, extra: string): Promise<boolean> {
  const p = await permissaoDaTela(req, chave);
  return !!(p.ver && p.extras[extra]);
}

/** Árvore completa — o frontend monta menu, botões e resumo com ela. */
export async function permissoesDoUsuario(req: Request) {
  const mapa = await telasDoUsuario(req);
  const modulos: Record<string, { algumAcesso: boolean; telas: Record<string, PermissaoTela> }> = {};

  CATALOGO.forEach(m => {
    const telas: Record<string, PermissaoTela> = {};
    let algum = false;
    m.telas.forEach(t => {
      const p = mapa[`${m.id}.${t.id}`] || telaVazia();
      telas[t.id] = p;
      if (p.ver) algum = true;
    });
    modulos[m.id] = { algumAcesso: algum, telas };
  });

  return {
    master: ehMaster(req),
    perfil: req.user?.perfil || '',
    empresa_id: req.user?.empresa_id || '',
    modulos,
  };
}

// ─────────────────────────────────────────────────────────────
// Middlewares
// ─────────────────────────────────────────────────────────────

const NOME_ACAO: Record<AcaoTela, string> = {
  ver: 'abrir',
  criar: 'cadastrar',
  editar: 'editar',
  excluir: 'excluir',
};

function negar(res: Response, texto: string) {
  return res.status(403).json({
    success: false,
    error: `${texto} Peça a liberação em Permissões por Cargo.`,
  });
}

/** Middleware: exige a ação padrão na tela. */
export function exigirTela(chave: string, acao: AcaoTela) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (await podeNaTela(req, chave, acao)) return next();
    } catch {
      /* cai no 403 */
    }
    const achado = buscarTela(chave);
    const nome = achado ? achado.tela.nome : partirChave(chave).tela;
    return negar(res, `Seu cargo não tem permissão para ${NOME_ACAO[acao]} em ${nome}.`);
  };
}

/**
 * Middleware: exige "ver" em pelo menos UMA das telas da lista.
 *
 * Serve para leitura que alimenta mais de uma tela — a lista de obras, por
 * exemplo, aparece no filtro de Admissões e no Efetivo.
 */
export function exigirAlgumaTela(chaves: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const chave of chaves) {
        if (await podeNaTela(req, chave, 'ver')) return next();
      }
    } catch {
      /* cai no 403 */
    }
    const nomes = chaves
      .map(c => buscarTela(c)?.tela.nome || partirChave(c).tela)
      .join(', ');
    return negar(res, `Seu cargo não tem permissão para ver estes dados (${nomes}).`);
  };
}

/** Middleware: exige a ação especial da tela. */
export function exigirExtra(chave: string, extra: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (await podeExtra(req, chave, extra)) return next();
    } catch {
      /* cai no 403 */
    }
    const achado = buscarTela(chave);
    const nomeExtra = achado?.tela.extras.find(e => e.id === extra)?.nome || extra;
    const nomeTela = achado ? achado.tela.nome : partirChave(chave).tela;
    return negar(res, `Seu cargo não tem a ação "${nomeExtra}" em ${nomeTela}.`);
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

/**
 * Empresa que vale para este pedido.
 * Fora do master é sempre a do token — o que vem na URL é ignorado.
 */
export function empresaDoPedido(req: Request): string {
  const doToken = req.user?.empresa_id || '';
  if (!ehMaster(req)) return doToken;
  const daQuery = String((req.query as any)?.empresa_id || (req.body as any)?.empresa_id || '');
  return daQuery || doToken;
}

/** Isolamento entre empresas: fora do master, só a empresa do token. */
export function mesmaEmpresa(req: Request, empresaDoRegistro?: string | null): boolean {
  if (ehMaster(req)) return true;
  const doToken = req.user?.empresa_id;
  if (!doToken) return false;
  return String(empresaDoRegistro || '') === String(doToken);
}

// ─────────────────────────────────────────────────────────────
// Compatibilidade com o modelo antigo (módulo × ação)
// ─────────────────────────────────────────────────────────────

/** Módulos do modelo antigo, ainda usados por rotas que não migraram. */
export const MODULOS = ['admissoes', 'efetivo', 'obras', 'documentos', 'rh', 'relatorios', 'usuarios'] as const;
export type Modulo = (typeof MODULOS)[number];
export type Acao = 'visualizar' | 'criar' | 'editar' | 'excluir' | 'solicitar' | 'aprovar';

const TELA_DO_MODULO: Record<string, string> = {
  admissoes: 'administrativo.admissoes',
  efetivo: 'administrativo.efetivo',
  obras: 'administrativo.obras',
  documentos: 'documentacao.documentos',
  relatorios: 'relatorios.gerais',
  rh: 'administrativo.efetivo',
  usuarios: 'administrativo.efetivo',
};

export async function pode(req: Request, modulo: Modulo, acao: Acao): Promise<boolean> {
  const chave = TELA_DO_MODULO[modulo] || '';
  if (!chave) return ehMaster(req);
  if (acao === 'solicitar') return podeNaTela(req, 'aprovacoes.solicitacoes', 'criar');
  if (acao === 'aprovar') return podeExtra(req, 'aprovacoes.solicitacoes', 'aprovar');
  const traduz: Record<string, AcaoTela> = {
    visualizar: 'ver',
    criar: 'criar',
    editar: 'editar',
    excluir: 'excluir',
  };
  return podeNaTela(req, chave, traduz[acao]);
}

export async function permissoesDoModulo(req: Request, modulo: Modulo): Promise<Record<Acao, boolean>> {
  return {
    visualizar: await pode(req, modulo, 'visualizar'),
    criar: await pode(req, modulo, 'criar'),
    editar: await pode(req, modulo, 'editar'),
    excluir: await pode(req, modulo, 'excluir'),
    solicitar: await pode(req, modulo, 'solicitar'),
    aprovar: await pode(req, modulo, 'aprovar'),
  };
}

export function exigir(modulo: Modulo, acao: Acao) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (await pode(req, modulo, acao)) return next();
    } catch {
      /* cai no 403 */
    }
    return negar(res, 'Seu cargo não tem permissão para esta ação.');
  };
}
