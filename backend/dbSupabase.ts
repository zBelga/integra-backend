/**
 * Banco de dados no Supabase (PostgreSQL) — sem senha de banco.
 *
 * O servidor já tem a chave service_role do Supabase (usada nos documentos).
 * Em vez de abrir conexão direta com o Postgres (que exigiria a senha do banco),
 * as consultas passam pela função `integra_sql`, chamada pela API do Supabase
 * com essa mesma chave. Só a service_role pode executá-la.
 *
 * As rotas continuam chamando queryRows()/executeQuery() com o SQL que já
 * escreviam para o SQLite. Aqui ele é traduzido para o Postgres:
 *   - `?`                 → valor escapado (literal SQL seguro)
 *   - colunas camelCase    → entre aspas ("razaoSocial")
 *   - LIKE                 → ILIKE (o LIKE do SQLite ignora maiúsculas)
 *   - INSERT OR IGNORE     → INSERT ... ON CONFLICT DO NOTHING
 *   - INSERT OR REPLACE    → INSERT ... ON CONFLICT (id) DO UPDATE
 */

/** Colunas criadas em camelCase — no Postgres precisam de aspas */
const COLUNAS_CAMEL = ['razaoSocial', 'corPrimaria', 'logoUrl', 'obrasCount', 'colaboradoresCount'];
const CAMEL = new Map(COLUNAS_CAMEL.map(c => [c.toLowerCase(), c]));

/**
 * Converte um valor JS em literal SQL.
 * Todo valor vira texto entre aspas simples (tipo "unknown" no Postgres), que o
 * banco converte sozinho para o tipo da coluna — o mesmo comportamento flexível
 * do SQLite. Aspas são duplicadas; com standard_conforming_strings (padrão do
 * Supabase) a barra invertida é literal, então não há como "escapar" da string.
 */
export function literal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? "'1'" : "'0'"; // sql.js grava boolean como 1/0
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'NULL';
    return `'${String(v)}'`;
  }
  let texto: string;
  if (v instanceof Date) texto = v.toISOString();
  else if (typeof v === 'object') texto = JSON.stringify(v);
  else texto = String(v);
  // Postgres não aceita o caractere nulo dentro de texto
  texto = texto.replace(/\u0000/g, '');
  return `'${texto.replace(/'/g, "''")}'`;
}

/** Traduz o SQL do SQLite para Postgres, já com os valores embutidos. */
export function traduzirSQL(sql: string, params: unknown[] = []): string {
  let out = '';
  let i = 0;
  let p = 0;
  let aspasSimples = false;
  let aspasDuplas = false;
  let palavraAnterior = '';

  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "'" && !aspasDuplas) {
      if (aspasSimples && sql[i + 1] === "'") { out += "''"; i += 2; continue; }
      aspasSimples = !aspasSimples;
      out += ch; i++; continue;
    }
    if (ch === '"' && !aspasSimples) {
      aspasDuplas = !aspasDuplas;
      out += ch; i++; continue;
    }
    if (aspasSimples || aspasDuplas) { out += ch; i++; continue; }

    if (ch === '?') {
      if (p >= params.length) throw new Error(`SQL com mais "?" do que valores (${params.length}).`);
      out += literal(params[p++]);
      i++;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < sql.length && /[A-Za-z0-9_]/.test(sql[j])) j++;
      const palavra = sql.slice(i, j);
      const camel = CAMEL.get(palavra.toLowerCase());
      // Apelido camelCase ("AS maxSeq"): o Postgres rebaixaria para "maxseq"
      // e o código leria undefined. Com aspas, o nome é preservado.
      const apelidoMisto = palavraAnterior === 'AS' && /[a-z]/.test(palavra) && /[A-Z]/.test(palavra);
      if (camel) out += `"${camel}"`;
      else if (apelidoMisto) out += `"${palavra}"`;
      else if (palavra.toUpperCase() === 'LIKE') out += 'ILIKE';
      else out += palavra;
      palavraAnterior = palavra.toUpperCase();
      i = j;
      continue;
    }
    if (!/\s/.test(ch)) palavraAnterior = '';

    out += ch;
    i++;
  }

  if (p !== params.length) {
    throw new Error(`SQL com ${p} "?" mas ${params.length} valores.`);
  }

  return traduzirInsertOr(out);
}

/** INSERT OR IGNORE / INSERT OR REPLACE → sintaxe do Postgres */
function traduzirInsertOr(sql: string): string {
  const ignorar = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\s+/i;
  if (ignorar.test(sql)) {
    return sql.replace(ignorar, 'INSERT INTO ').replace(/;?\s*$/, '') + ' ON CONFLICT DO NOTHING';
  }

  const substituir = /^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/i;
  const m = sql.match(substituir);
  if (m) {
    const colunas = m[2].split(',').map(c => c.trim()).filter(Boolean);
    const atualiza = colunas
      .filter(c => c.replace(/"/g, '').toLowerCase() !== 'id')
      .map(c => `${c} = EXCLUDED.${c}`)
      .join(', ');
    const base = sql.replace(/^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+/i, 'INSERT INTO ').replace(/;?\s*$/, '');
    return atualiza ? `${base} ON CONFLICT (id) DO UPDATE SET ${atualiza}` : `${base} ON CONFLICT (id) DO NOTHING`;
  }

  return sql;
}

// ─────────────────────────────────────────────────────────────
// Chamada à função integra_sql pela API do Supabase
// ─────────────────────────────────────────────────────────────

function credenciais() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias no modo Supabase.');
  return { url: url.replace(/\/+$/, ''), chave };
}

/** Executa SQL já traduzido. SELECT devolve linhas; o resto devolve { linhas_afetadas }. */
export async function executarSQL(sql: string): Promise<any> {
  const { url, chave } = credenciais();
  const tentativas = 3;
  let ultimoErro: any;

  for (let t = 1; t <= tentativas; t++) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/integra_sql`, {
        method: 'POST',
        headers: {
          apikey: chave,
          Authorization: `Bearer ${chave}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: sql }),
      });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) {
        // Erro do banco (sintaxe, restrição...) não adianta repetir
        const msg = corpo?.message || corpo?.error || `HTTP ${res.status}`;
        const erro: any = new Error(msg);
        erro.codigo = corpo?.code;
        erro.definitivo = res.status < 500;
        throw erro;
      }
      return corpo;
    } catch (err: any) {
      ultimoErro = err;
      if (err?.definitivo || t === tentativas) break;
      await new Promise(r => setTimeout(r, 300 * t)); // falha de rede: tenta de novo
    }
  }

  console.error('[DB] Falha no Supabase:', ultimoErro?.message);
  console.error('     SQL:', sql.replace(/\s+/g, ' ').slice(0, 300));
  throw ultimoErro;
}

export async function queryRowsSupabase<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await executarSQL(traduzirSQL(sql, params));
  return (Array.isArray(r) ? r : []) as T[];
}

export async function executeQuerySupabase(sql: string, params: unknown[] = []): Promise<void> {
  await executarSQL(traduzirSQL(sql, params));
}

// ─────────────────────────────────────────────────────────────
// Importação única do banco antigo (SQLite no volume do Railway)
// ─────────────────────────────────────────────────────────────

/** Ordem de importação: primeiro quem é referenciado */
export const TABELAS_IMPORTACAO = [
  'empresas',
  'obras',
  'cargos',
  'usuarios',
  'cargos_permissoes',
  'admissoes',
  'colaboradores',
  'solicitacoes_alteracao',
  'solicitacoes_historico',
];

const MARCADOR = 'importacao_sqlite';

export async function importacaoJaFeita(): Promise<string | null> {
  const r = await executarSQL(`SELECT valor FROM integra_meta WHERE chave = ${literal(MARCADOR)}`);
  return Array.isArray(r) && r.length ? String(r[0].valor) : null;
}

export async function contarTabelas(): Promise<Record<string, number>> {
  const partes = TABELAS_IMPORTACAO.map(t => `(SELECT COUNT(*) FROM ${t}) AS ${t}`).join(', ');
  const r = await executarSQL(`SELECT ${partes}`);
  const linha = (Array.isArray(r) && r[0]) || {};
  const saida: Record<string, number> = {};
  TABELAS_IMPORTACAO.forEach(t => (saida[t] = Number(linha[t]) || 0));
  return saida;
}

/**
 * Copia TODAS as tabelas do SQLite para o Supabase numa única transação.
 * Se qualquer linha falhar, nada é gravado. O arquivo do SQLite não é tocado.
 *
 * @param lerTabela devolve { colunas, linhas } de uma tabela do SQLite
 */
export async function importarDoSqlite(
  lerTabela: (tabela: string) => { colunas: string[]; linhas: any[][] }
): Promise<Record<string, number>> {
  // Colunas e tipos que existem no Supabase
  const info = (await executarSQL(
    `SELECT table_name, column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name IN (${TABELAS_IMPORTACAO.map(literal).join(',')})`
  )) as Array<{ table_name: string; column_name: string; data_type: string }>;

  const tiposPorTabela = new Map<string, Map<string, string>>();
  info.forEach(c => {
    if (!tiposPorTabela.has(c.table_name)) tiposPorTabela.set(c.table_name, new Map());
    tiposPorTabela.get(c.table_name)!.set(c.column_name, c.data_type);
  });

  const comandos: string[] = [];
  const esperado: Record<string, number> = {};

  for (const tabela of TABELAS_IMPORTACAO) {
    const destino = tiposPorTabela.get(tabela);
    if (!destino) throw new Error(`Tabela ${tabela} não existe no Supabase.`);

    const { colunas, linhas } = lerTabela(tabela);
    esperado[tabela] = linhas.length;

    // Nenhuma coluna do banco antigo pode ficar para trás
    const faltando = colunas.filter(c => !destino.has(c));
    if (faltando.length) {
      throw new Error(`Colunas de ${tabela} sem correspondente no Supabase: ${faltando.join(', ')}`);
    }

    comandos.push(`DELETE FROM ${tabela} WHERE true`);
    if (!linhas.length) continue;

    const nomes = colunas.map(c => (CAMEL.has(c.toLowerCase()) ? `"${c}"` : c)).join(', ');
    const naoTexto = colunas.map(c => !/char|text/i.test(destino.get(c) || 'text'));

    // Lotes de 200 linhas por INSERT
    for (let i = 0; i < linhas.length; i += 200) {
      const valores = linhas
        .slice(i, i + 200)
        .map(linha =>
          '(' +
          linha
            .map((v, k) => (naoTexto[k] && (v === '' || v === undefined) ? 'NULL' : literal(v)))
            .join(', ') +
          ')'
        )
        .join(',\n');
      comandos.push(`INSERT INTO ${tabela} (${nomes}) VALUES\n${valores}`);
    }
  }

  const resumo = JSON.stringify({ em: new Date().toISOString(), linhas: esperado });
  comandos.push(
    `INSERT INTO integra_meta (chave, valor, updated_at) VALUES (${literal(MARCADOR)}, ${literal(resumo)}, now())
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now()`
  );

  // Uma chamada = uma transação: ou entra tudo, ou nada
  await executarSQL(comandos.join(';\n'));

  // Conferência: o que está no Supabase bate com o que saiu do SQLite?
  const obtido = await contarTabelas();
  const divergencias = TABELAS_IMPORTACAO.filter(t => obtido[t] !== esperado[t]);
  if (divergencias.length) {
    await executarSQL(`DELETE FROM integra_meta WHERE chave = ${literal(MARCADOR)}`);
    throw new Error(
      `Conferência falhou: ${divergencias.map(t => `${t} esperado ${esperado[t]}, obtido ${obtido[t]}`).join('; ')}`
    );
  }

  return esperado;
}
