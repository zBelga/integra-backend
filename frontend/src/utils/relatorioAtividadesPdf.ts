/**
 * RELATÓRIO DE ATIVIDADES — gerador PDF.
 *
 * Reproduz o modelo oficial da MW em PDF retrato A4 via jsPDF.
 * Campos dinâmicos: nome, CPF, função, registro, projeto, data.
 * O restante (horários, resumo de atividades) é o texto padrão do modelo.
 */
import { LOGO_MW_RELATORIO_JPEG } from './logoMwRelatorio';
import { LOGO_ISO_JPEG } from './logoIso';

export interface DadosRelatorioAtividades {
  nome: string;
  cpf: string;
  funcao: string;
  registro: string;
  projeto: string;
  /** Data que aparece nas assinaturas, formato ISO yyyy-MM-dd. */
  data: string;
  /** Texto do resumo de atividades. */
  resumoAtividades: string;
}

/* ── Constantes de layout ── */

const MARGEM = 20;
const LARGURA_UTIL = 170;   // A4 portrait: 210 - 2×20
const FONTE = 'helvetica';
const PRETO: [number, number, number] = [0, 0, 0];
const CINZA_FUNDO: [number, number, number] = [223, 223, 223];

const INSTITUICAO = 'MW ENGENHARIA';
const CNPJ = '03.193.498/0001-44';

const HORARIOS: { dia: string; horario: string }[] = [
  { dia: 'SEGUNDA FEIRA  - Pausa de 1 Hora de intervalo para refeição e descanso', horario: '07:00 as 17:00' },
  { dia: 'TERÇA FEIRA        - Pausa de 1 Hora de intervalo para refeição e descanso', horario: '07:00 as 17:00' },
  { dia: 'QUARTA FEIRA    - Pausa de 1 Hora de intervalo para refeição e descanso', horario: '07:00 as 17:00' },
  { dia: 'QUINTA FEIRA     - Pausa de 1 Hora de intervalo para refeição e descanso', horario: '07:00 as 17:00' },
  { dia: 'SEXTA FEIRA        - Pausa de 1 Hora de intervalo para refeição e descanso', horario: '07:00 as 16:00' },
];

const RESUMO_PADRAO =
  'Participar da elaboração e auxiliar na implementação de política de saúde e segurança do trabalho. ' +
  'Auxiliar no desenvolvimento de ações educativas na área de saúde e segurança do trabalho. ' +
  'Auxiliar no gerenciamento de documentação do SST (Saúde e segurança no trabalho). ' +
  'Distribuir e controlar EPIs.';

export { RESUMO_PADRAO };

/* ── Helpers ── */

/** 2026-10-01 → "01 de Outubro de 2026" */
function dataExtenso(iso: string): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  return `${m[3]} de ${meses[Number(m[2]) - 1]} de ${m[1]}`;
}

function caixa(doc: any, x: number, y: number, w: number, h: number, fundo?: [number, number, number]) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  if (fundo) {
    doc.setFillColor(...fundo);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
}

function texto(doc: any, t: string, x: number, y: number, opts?: any) {
  doc.setTextColor(...PRETO);
  doc.text(t, x, y, opts);
}

/* ── Geração ── */

export async function gerarRelatorioAtividadesPdf(dados: DadosRelatorioAtividades): Promise<Blob> {
  const [{ default: JsPDF }] = await Promise.all([
    import('jspdf'),
  ]);

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pad = 2.5; // padding interno das caixas

  let y = 15;

  /* ── Logos + Título ── */
  // MW logo à esquerda
  try {
    doc.addImage(LOGO_MW_RELATORIO_JPEG, 'JPEG', MARGEM, y, 30, 24);
  } catch { /* sem logo continua */ }

  // ISO logo à direita
  try {
    doc.addImage(LOGO_ISO_JPEG, 'JPEG', MARGEM + LARGURA_UTIL - 28, y, 28, 28);
  } catch { /* sem logo continua */ }

  doc.setFont(FONTE, 'bold');
  doc.setFontSize(10);
  texto(doc, 'RELATÓRIO DE ATIVIDADES', MARGEM + LARGURA_UTIL / 2, y + 18, { align: 'center' });

  doc.setFontSize(10);
  texto(doc, '001/2026', MARGEM + LARGURA_UTIL / 2, y + 24, { align: 'center' });

  y += 34;

  /* ── Bloco Executor ── */
  const linhaH = 6;
  const campos = [
    `Executor: ${dados.nome}`,
    `CPF: ${dados.cpf}`,
    `Função: ${dados.funcao}`,
    `Registro: ${dados.registro}`,
  ];
  const blocoH = campos.length * linhaH + 3;
  caixa(doc, MARGEM, y, LARGURA_UTIL, blocoH);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(9);
  let ly = y + 5;
  for (const c of campos) {
    texto(doc, c, MARGEM + pad, ly);
    ly += linhaH;
  }
  y += blocoH;

  /* ── Instituição ── */
  caixa(doc, MARGEM, y, LARGURA_UTIL, linhaH + 2);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(9);
  texto(doc, `Instituição: ${INSTITUICAO}`, MARGEM + pad, y + 5);
  y += linhaH + 2;

  /* ── CNPJ ── */
  caixa(doc, MARGEM, y, LARGURA_UTIL, linhaH + 2);
  texto(doc, `CNPJ: ${CNPJ}`, MARGEM + pad, y + 5);
  y += linhaH + 2;

  /* ── Projeto ── */
  caixa(doc, MARGEM, y, LARGURA_UTIL, linhaH + 2);
  texto(doc, `Projeto: ${dados.projeto}`, MARGEM + pad, y + 5);
  y += linhaH + 2;

  y += 6;

  /* ── Tabela de horários ── */
  const colHora = 30;
  const colDia = LARGURA_UTIL - colHora;

  // Cabeçalho
  caixa(doc, MARGEM, y, colHora, linhaH + 2, CINZA_FUNDO);
  caixa(doc, MARGEM + colHora, y, colDia, linhaH + 2, CINZA_FUNDO);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(9);
  texto(doc, 'Nº horas', MARGEM + colHora / 2, y + 5.2, { align: 'center' });
  texto(doc, 'Dias / Horário de trabalho', MARGEM + colHora + colDia / 2, y + 5.2, { align: 'center' });
  y += linhaH + 2;

  // Linhas de cada dia
  doc.setFontSize(7.5);
  for (const h of HORARIOS) {
    const rH = linhaH + 2;
    caixa(doc, MARGEM, y, colHora, rH);
    caixa(doc, MARGEM + colHora, y, colDia, rH);
    doc.setFont(FONTE, 'bold');
    texto(doc, h.horario, MARGEM + pad, y + 5.2);
    texto(doc, h.dia, MARGEM + colHora + pad, y + 5.2);
    y += rH;
  }

  // Total semanal
  caixa(doc, MARGEM, y, colHora, linhaH + 2);
  caixa(doc, MARGEM + colHora, y, colDia, linhaH + 2);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(8);
  texto(doc, '44:00', MARGEM + pad + 4, y + 5.2);
  texto(doc, 'SEMANA', MARGEM + colHora + pad, y + 5.2);
  y += linhaH + 2;

  y += 6;

  /* ── Resumo das atividades ── */
  caixa(doc, MARGEM, y, LARGURA_UTIL, linhaH + 2, CINZA_FUNDO);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(9);
  texto(doc, '2.  Resumo das atividades desempenhadas', MARGEM + pad, y + 5.2);
  y += linhaH + 2;

  const resumo = dados.resumoAtividades || RESUMO_PADRAO;
  doc.setFont(FONTE, 'normal');
  doc.setFontSize(9);
  const linhasResumo: string[] = doc.splitTextToSize('- ' + resumo, LARGURA_UTIL - pad * 2);
  const resumoH = Math.max(linhasResumo.length * 4.5 + 6, 20);
  caixa(doc, MARGEM, y, LARGURA_UTIL, resumoH);
  let ry = y + 5;
  for (const l of linhasResumo) {
    texto(doc, l, MARGEM + pad, ry);
    ry += 4.5;
  }
  y += resumoH;

  y += 8;

  /* ── Assinaturas (duas colunas) ── */
  const metade = LARGURA_UTIL / 2;
  const dataStr = `São Paulo      ${dataExtenso(dados.data)}`;
  const assiH = 52;

  // Se não cabe na página, nova página
  if (y + assiH > 280) {
    doc.addPage();
    y = 20;
  }

  // Coluna esquerda — Responsável pela execução
  caixa(doc, MARGEM, y, metade, assiH);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(8.5);
  texto(doc, dataStr, MARGEM + pad, y + 8);

  doc.setFont(FONTE, 'normal');
  doc.setFontSize(7.5);
  const declExec = 'Declaro para os devidos fins de direito a veracidade das informações constantes neste documento.';
  const lExec = doc.splitTextToSize(declExec, metade - pad * 2 - 6);
  let ey = y + 16;
  for (const l of lExec) {
    texto(doc, l, MARGEM + pad + 6, ey);
    ey += 3.5;
  }

  doc.setFont(FONTE, 'bold');
  doc.setFontSize(8.5);
  texto(doc, 'X__________________________________________', MARGEM + pad, y + 32);
  texto(doc, 'Responsável pela execução', MARGEM + metade / 2, y + 46, { align: 'center' });

  // Coluna direita — Coordenador/Supervisor
  caixa(doc, MARGEM + metade, y, metade, assiH);
  doc.setFont(FONTE, 'bold');
  doc.setFontSize(8.5);
  texto(doc, dataStr, MARGEM + metade + pad, y + 8);

  doc.setFont(FONTE, 'normal');
  doc.setFontSize(7.5);
  const declCoord = 'Declaro que o executor atuou sob minha orientação e, portanto ratifico a execução das atividades conforme descrito neste documento.';
  const lCoord = doc.splitTextToSize(declCoord, metade - pad * 2 - 6);
  let cy = y + 16;
  for (const l of lCoord) {
    texto(doc, l, MARGEM + metade + pad + 6, cy);
    cy += 3.5;
  }

  doc.setFont(FONTE, 'bold');
  doc.setFontSize(8.5);
  texto(doc, 'X__________________________________________', MARGEM + metade + pad, y + 32);
  texto(doc, 'Coordenador/Supervisor do Projeto', MARGEM + metade + metade / 2, y + 46, { align: 'center' });

  return doc.output('blob');
}

/** Nome de arquivo: RELATORIO-ATIVIDADES_NOME-COMPLETO.pdf */
export function nomeArquivoRelatorio(nome: string): string {
  const limpo = String(nome || 'colaborador')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `RELATORIO-ATIVIDADES_${limpo}.pdf`;
}
