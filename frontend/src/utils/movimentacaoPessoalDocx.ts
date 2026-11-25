/**
 * Movimentação de Pessoal — CLT (FO-RH-12).
 *
 * Usa o próprio Word do formulário (public/templates/movimentacao-pessoal-fo-rh-12.docx).
 * Só troca os campos preenchidos: {{CAMPO}} pelo valor e [[CK:chave]] por ☒ ou ☐.
 * Não altera a estrutura do documento. Nada é gravado no banco.
 */
import JSZip from 'jszip';

export const TEMPLATE_MOVIMENTACAO_URL = '/templates/movimentacao-pessoal-fo-rh-12.docx';

export interface DadosMovimentacaoDocx {
  elaboradoPor: string;
  dataFormulario: string; // yyyy-mm-dd
  nome: string;
  registro: string;
  departamento: string; // obra atual
  cargo: string;
  salario: string;
  baseMensal: boolean | null;
  superiorImediato: string;
  mudDepartamento: string; // obra de destino
  dataMudanca: string; // yyyy-mm-dd
  // Transferência de obra: cargo, salário e base são os mesmos da situação atual
  valorProposto: string;
  funcaoProposta: string;
}

/** Chaves dos quadradinhos, na ordem em que aparecem no formulário. */
const TODAS_CHAVES = [
  'base_mensal', 'base_horario', 'mud', 'transferencia', 'aumento', 'promocao', 'ferias', 'outros',
  'val_mensal', 'val_horario', 'ferias_20_10', 'ferias_30', 'cont', 'permanente', 'temporario',
  'adicao', 'substituicao', 'novo', 'recontratacao', 'horista', 'mensalista', 'dem', 'sem_justa',
  'pedido_dem', 'termino', 'sim', 'nao',
  ...['conh', 'hab', 'assid', 'comp'].flatMap((l) =>
    ['exc', 'bom', 'reg', 'insuf'].map((c) => `aval_${l}_${c}`),
  ),
];

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function dataBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Valores em dinheiro sempre com R$ e duas casas (ex.: 3500 → R$ 3.500,00). */
function dinheiro(valor: string): string {
  const bruto = String(valor || '').trim();
  if (!bruto) return '';
  const semSimbolo = bruto.replace(/R\$/gi, '').replace(/\s+/g, '');
  const normal = semSimbolo.includes(',')
    ? semSimbolo.replace(/\./g, '').replace(',', '.')
    : semSimbolo;
  const n = Number(normal);
  if (!Number.isFinite(n)) return bruto.startsWith('R$') ? bruto : `R$ ${bruto}`;
  const fmt = n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `R$ ${fmt}`;
}

function marcados(d: DadosMovimentacaoDocx): Set<string> {
  const on = new Set<string>();
  // Tipo: só transferência de obra
  on.add('transferencia');
  // Base de pagamento (situação atual e valor proposto são os mesmos)
  if (d.baseMensal === true) {
    on.add('base_mensal');
    on.add('val_mensal');
    on.add('mensalista');
  } else if (d.baseMensal === false) {
    on.add('base_horario');
    on.add('val_horario');
    on.add('horista');
  }
  return on;
}

export async function gerarMovimentacaoPessoalDocx(d: DadosMovimentacaoDocx): Promise<Blob> {
  const resp = await fetch(TEMPLATE_MOVIMENTACAO_URL);
  if (!resp.ok) throw new Error('Modelo do formulário não encontrado.');
  const zip = await JSZip.loadAsync(await resp.arrayBuffer());
  const arquivo = zip.file('word/document.xml');
  if (!arquivo) throw new Error('Modelo do formulário inválido.');
  let xml = await arquivo.async('string');

  const campos: Record<string, string> = {
    ELAB: d.elaboradoPor,
    DATA_FORM: dataBr(d.dataFormulario),
    NOME: d.nome,
    REGISTRO: d.registro,
    OBRA_ATUAL: d.departamento,
    CARGO_ATUAL: d.cargo,
    SAL_ATUAL: dinheiro(d.salario),
    OBRA_NOVA: d.mudDepartamento,
    CARGO_NOVO: d.cargo,
    SAL_NOVO: dinheiro(d.salario),
    SUPERIOR: d.superiorImediato,
    VALOR: dinheiro(d.valorProposto),
    FUNCAO: d.funcaoProposta,
    DATA_MUDANCA: dataBr(d.dataMudanca),
  };
  xml = xml.replace(/\{\{([A-Z_]+)\}\}/g, (_, k: string) => escapeXml(campos[k] ?? ''));

  const on = marcados(d);
  xml = xml.replace(/\[\[CK:([a-z_]+)\]\]/g, (_, k: string) => {
    const marcado = TODAS_CHAVES.includes(k) && on.has(k);
    return marcado ? '☒' : '☐';
  });

  zip.file('word/document.xml', xml);
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export function nomeArquivoMovimentacaoDocx(nome: string, dataIso: string): string {
  const base = String(nome || 'colaborador')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, '').trim().replace(/\s+/g, '_').toUpperCase();
  const data = dataBr(dataIso).replace(/\//g, '-') || 'sem-data';
  return `MOVIMENTACAO-PESSOAL_${base}_${data}.docx`;
}
