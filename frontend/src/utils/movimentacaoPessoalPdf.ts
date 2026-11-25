/**
 * MOVIMENTAÇÃO DE PESSOAL — CLT (FO-RH-12-V1) — gerador PDF.
 *
 * Reproduz a estrutura do formulário oficial da MW em A4 retrato, com as mesmas
 * seções: situação atual, mudança de situação, contratação, demissão e
 * assinaturas. Os campos vêm preenchidos; o que não se aplica fica em branco,
 * como no papel. Não grava nada no banco.
 */
import { LOGO_MW_RELATORIO_JPEG } from './logoMwRelatorio';

export type TipoMudanca = '' | 'transferencia' | 'aumento' | 'promocao' | 'ferias' | 'outros';
export type FeriasModo = '' | '20+10' | '30';

export interface DadosMovimentacaoPessoal {
  elaboradoPor: string;
  /** Data do formulário, ISO yyyy-MM-dd */
  dataFormulario: string;

  // Situação atual
  nome: string;
  registro: string;
  departamento: string;
  cargo: string;
  salario: string;
  baseMensal: boolean | null; // true = mensal, false = horário, null = não informado

  // Mudança de situação
  tipo: TipoMudanca;
  mudDepartamento: string;
  mudCargo: string;
  mudSalario: string;
  superiorImediato: string;
  valorProposto: string;
  mudBaseMensal: boolean | null;
  funcaoProposta: string;
  dataMudanca: string; // ISO
  dataFerias: string;  // ISO
  feriasModo: FeriasModo;
}

const MARGEM = 12;
const LARGURA = 186;
const LABEL_W = 10;          // coluna vertical com o nome da seção
const X_CONTEUDO = MARGEM + LABEL_W; // 22
const W_CONTEUDO = LARGURA - LABEL_W; // 176
const PRETO: [number, number, number] = [0, 0, 0];
const CINZA: [number, number, number] = [230, 230, 230];
const AZUL_VALOR: [number, number, number] = [31, 56, 100];
const LARANJA: [number, number, number] = [196, 90, 20];

function dataBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
}

function retangulo(doc: any, x: number, y: number, w: number, h: number, fundo?: [number, number, number]) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  if (fundo) {
    doc.setFillColor(...fundo);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
}

/** Célula com rótulo pequeno em cima e valor embaixo. */
function campo(doc: any, x: number, y: number, w: number, h: number, rotulo: string, valor?: string) {
  retangulo(doc, x, y, w, h);
  doc.setTextColor(...PRETO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(rotulo, x + 1.5, y + 2.6);
  if (valor) {
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(8.5);
    doc.setTextColor(...AZUL_VALOR);
    doc.text(valor, x + 2, y + h - 1.4);
  }
}

/** Célula com uma caixa de marcação e um rótulo. */
function opcao(doc: any, x: number, y: number, w: number, h: number, rotulo: string, marcado: boolean) {
  retangulo(doc, x, y, w, h);
  const q = 3.2;
  const qx = x + 2;
  const qy = y + (h - q) / 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(qx, qy, q, q, 'S');
  if (marcado) {
    doc.setLineWidth(0.4);
    doc.line(qx + 0.5, qy + 0.5, qx + q - 0.5, qy + q - 0.5);
    doc.line(qx + q - 0.5, qy + 0.5, qx + 0.5, qy + q - 0.5);
  }
  doc.setTextColor(...PRETO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(rotulo, qx + q + 2, y + h / 2 + 1.2);
}

/** Coluna vertical à esquerda com o título da seção (texto girado, lido de baixo para cima). */
function rotuloSecao(doc: any, y: number, h: number, titulo: string, cor: [number, number, number], subtitulo?: string) {
  retangulo(doc, MARGEM, y, LABEL_W, h, CINZA);
  const centroX = MARGEM + LABEL_W / 2;
  const meioY = y + h / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...cor);
  doc.text(titulo, centroX - 0.4, meioY + doc.getTextWidth(titulo) / 2, { angle: 90 });

  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...PRETO);
    doc.text(subtitulo, centroX + 2.8, meioY + doc.getTextWidth(subtitulo) / 2, { angle: 90 });
  }
}

export async function gerarMovimentacaoPessoalPdf(d: DadosMovimentacaoPessoal): Promise<Blob> {
  const { default: JsPDF } = await import('jspdf');
  const doc: any = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  /* ── Cabeçalho ── */
  const yTopo = 12;
  const hTopo = 26;
  retangulo(doc, MARGEM, yTopo, 32, hTopo);
  try { doc.addImage(LOGO_MW_RELATORIO_JPEG, 'JPEG', MARGEM + 1, yTopo + 1, 30, 20); } catch { /* sem logo */ }

  retangulo(doc, MARGEM + 32, yTopo, 98, hTopo);
  doc.setFontSize(11);
  doc.text('MOVIMENTAÇÃO DE PESSOAL - CLT', MARGEM + 32 + 49, yTopo + hTopo / 2 + 1.5, { align: 'center' });

  retangulo(doc, MARGEM + 130, yTopo, 56, hTopo);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Elaborado por:', MARGEM + 132, yTopo + 4);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  doc.setTextColor(...AZUL_VALOR);
  doc.text(d.elaboradoPor || '', MARGEM + 132, yTopo + 10);
  doc.setTextColor(...PRETO);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Data:', MARGEM + 132, yTopo + 17);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9);
  doc.setTextColor(...AZUL_VALOR);
  doc.text(dataBr(d.dataFormulario), MARGEM + 182, yTopo + 23, { align: 'right' });

  /* ── Situação atual ── */
  let y = 40;
  const hLinha = 8;
  rotuloSecao(doc, y, hLinha * 4, 'SITUAÇÃO ATUAL', PRETO);
  campo(doc, X_CONTEUDO, y, 118, hLinha, 'NOME:', d.nome);
  campo(doc, X_CONTEUDO + 118, y, 58, hLinha, 'REGISTRO:', d.registro);
  y += hLinha;
  campo(doc, X_CONTEUDO, y, W_CONTEUDO, hLinha, 'DEPARTAMENTO/OBRA:', d.departamento);
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 112, hLinha, 'CARGO:', d.cargo);
  campo(doc, X_CONTEUDO + 112, y, 64, hLinha, 'SALÁRIO:', d.salario);
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 56, hLinha, 'BASE DE PAGAMENTO');
  opcao(doc, X_CONTEUDO + 56, y, 56, hLinha, 'MENSAL', d.baseMensal === true);
  opcao(doc, X_CONTEUDO + 112, y, 64, hLinha, 'HORÁRIO', d.baseMensal === false);

  /* ── Mudança de situação ── */
  y += hLinha;
  const yMudanca = y;
  rotuloSecao(doc, yMudanca, hLinha * 7, 'MUDANÇA DE SITUAÇÃO', LARANJA, 'Em caso de transferência — Anexar FO-RH-10');
  const wTipo = W_CONTEUDO / 5;
  opcao(doc, X_CONTEUDO, y, wTipo, hLinha, 'TRANSFERÊNCIA', d.tipo === 'transferencia');
  opcao(doc, X_CONTEUDO + wTipo, y, wTipo, hLinha, 'AUMENTO MÉRITO', d.tipo === 'aumento');
  opcao(doc, X_CONTEUDO + wTipo * 2, y, wTipo, hLinha, 'PROMOÇÃO', d.tipo === 'promocao');
  opcao(doc, X_CONTEUDO + wTipo * 3, y, wTipo, hLinha, 'FÉRIAS', d.tipo === 'ferias');
  opcao(doc, X_CONTEUDO + wTipo * 4, y, wTipo, hLinha, 'OUTROS', d.tipo === 'outros');
  y += hLinha;
  campo(doc, X_CONTEUDO, y, W_CONTEUDO, hLinha, 'DEPARTAMENTO/OBRA:', d.mudDepartamento);
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 112, hLinha, 'CARGO:', d.mudCargo);
  campo(doc, X_CONTEUDO + 112, y, 64, hLinha, 'SALÁRIO:', d.mudSalario);
  y += hLinha;
  campo(doc, X_CONTEUDO, y, W_CONTEUDO, hLinha, 'SUPERIOR IMEDIATO:', d.superiorImediato);
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 64, hLinha, 'VALOR PROPOSTO:', d.valorProposto);
  opcao(doc, X_CONTEUDO + 64, y, 48, hLinha, 'MENSAL', d.mudBaseMensal === true);
  opcao(doc, X_CONTEUDO + 112, y, 64, hLinha, 'HORÁRIO', d.mudBaseMensal === false);
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 112, hLinha, 'FUNÇÃO PROPOSTA:', d.funcaoProposta);
  campo(doc, X_CONTEUDO + 112, y, 64, hLinha, 'DATA DA MUDANÇA:', dataBr(d.dataMudanca));
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 86, hLinha, 'DATA PARA FÉRIAS:', dataBr(d.dataFerias));
  opcao(doc, X_CONTEUDO + 86, y, 45, hLinha, '20 DIAS + 10 ABONO', d.feriasModo === '20+10');
  opcao(doc, X_CONTEUDO + 131, y, 45, hLinha, '30 DIAS', d.feriasModo === '30');

  /* ── Contratação (em branco: não se aplica a esta movimentação) ── */
  y = yMudanca + hLinha * 7;
  const hContr = hLinha * 5 + 10;
  rotuloSecao(doc, y, hContr, 'CONTRATAÇÃO', LARANJA, 'Anexar FO-RH-03');
  const w4 = W_CONTEUDO / 4;
  ['PERMANENTE', 'ADIÇÃO', 'NOVO', 'HORISTA'].forEach((t, i) => opcao(doc, X_CONTEUDO + w4 * i, y, w4, hLinha, t, false));
  y += hLinha;
  ['TEMPORÁRIO', 'SUBSTITUIÇÃO', 'RECONTRATAÇÃO', 'MENSALISTA'].forEach((t, i) => opcao(doc, X_CONTEUDO + w4 * i, y, w4, hLinha, t, false));
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 88, hLinha, 'DATA DE INÍCIO:');
  campo(doc, X_CONTEUDO + 88, y, 88, hLinha, 'DURAÇÃO PREVISTA:');
  y += hLinha;
  campo(doc, X_CONTEUDO, y, W_CONTEUDO, hLinha, 'LOCALIZAÇÃO SERVIÇO:');
  y += hLinha;
  campo(doc, X_CONTEUDO, y, W_CONTEUDO, hLinha + 10, 'OBSERVAÇÕES:');

  /* ── Demissão (em branco) ── */
  y += hLinha + 10;
  const hDem = hLinha * 3 + 7 + 6 * 4 + 12;
  rotuloSecao(doc, y, hDem, 'DEMISSÃO', LARANJA, 'Anexar FO-RH-09');
  const w3 = [58, 58, W_CONTEUDO - 116];
  opcao(doc, X_CONTEUDO, y, w3[0], hLinha, 'SEM JUSTA CAUSA', false);
  opcao(doc, X_CONTEUDO + w3[0], y, w3[1], hLinha, 'PEDIDO DE DEMISSÃO', false);
  opcao(doc, X_CONTEUDO + w3[0] + w3[1], y, w3[2], hLinha, 'TÉRMINO / INTERRUPÇÃO DE CONTRATO', false);
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 88, hLinha, 'DATA DA NOTIFICAÇÃO:');
  campo(doc, X_CONTEUDO + 88, y, 88, hLinha, 'RECOMENDA A RECONTRATAÇÃO NO FUTURO?');
  y += hLinha;
  campo(doc, X_CONTEUDO, y, 88, hLinha, 'DATA EFETIVA DA SAÍDA:');
  opcao(doc, X_CONTEUDO + 88, y, 44, hLinha, 'SIM', false);
  opcao(doc, X_CONTEUDO + 132, y, 44, hLinha, 'NÃO', false);
  y += hLinha;
  const w4a = (W_CONTEUDO - 44) / 4;
  retangulo(doc, X_CONTEUDO, y, 44, 7, CINZA);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...PRETO);
  doc.text('AVALIAÇÃO:', X_CONTEUDO + 22, y + 4.6, { align: 'center' });
  ['EXCELENTE', 'BOM', 'REGULAR', 'INSUFICIENTE'].forEach((t, i) => {
    retangulo(doc, X_CONTEUDO + 44 + w4a * i, y, w4a, 7, CINZA);
    doc.text(t, X_CONTEUDO + 44 + w4a * i + w4a / 2, y + 4.6, { align: 'center' });
  });
  y += 7;
  ['CONHECIMENTO', 'HABILIDADE', 'ASSIDUIDADE', 'COMPROMETIMENTO'].forEach(t => {
    retangulo(doc, X_CONTEUDO, y, 44, 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text(t, X_CONTEUDO + 42, y + 4, { align: 'right' });
    for (let i = 0; i < 4; i++) {
      retangulo(doc, X_CONTEUDO + 44 + w4a * i, y, w4a, 6);
      doc.rect(X_CONTEUDO + 44 + w4a * i + w4a / 2 - 1.5, y + 1.5, 3, 3, 'S');
    }
    y += 6;
  });
  campo(doc, X_CONTEUDO, y, W_CONTEUDO, 12, 'OBSERVAÇÕES: (DESCREVER O MOTIVO DE DESLIGAMENTO)');

  /* ── Assinaturas ── */
  y += 12 + 4;
  const wAss = LARGURA / 4;
  ['ENCARREGADO DA OBRA', 'ADMINISTRATIVO DA OBRA', 'GESTOR / ENG° DA OBRA', 'RECURSOS HUMANOS'].forEach((t, i) => {
    retangulo(doc, MARGEM + wAss * i, y, wAss, 6, CINZA);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...PRETO);
    doc.text(t, MARGEM + wAss * i + wAss / 2, y + 4, { align: 'center' });
    retangulo(doc, MARGEM + wAss * i, y + 6, wAss, 20);
  });

  /* ── Rodapé ── */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('FO-RH-12-V1 – Formulário para Movimentação de Pessoal - CLT', MARGEM, 287);

  return doc.output('blob');
}

export function nomeArquivoMovimentacao(nome: string, data: string): string {
  const limpo = String(nome || 'colaborador')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const d = String(data || '').replace(/-/g, '');
  return `MOVIMENTACAO-PESSOAL_${limpo}_${d}.pdf`;
}
