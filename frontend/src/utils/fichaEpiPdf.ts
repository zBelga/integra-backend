/**
 * FICHA INDIVIDUAL DE CONTROLE DE EPI´s — FO-RH-05-V2.
 *
 * Reprodução do formulário oficial da MW (a planilha que o RH usa hoje),
 * medida em cima dela: mesmo título, mesmo cabeçalho, a declaração inteira
 * com as alíneas a) até f), as mesmas 9 colunas nas mesmas larguras, 13 linhas
 * na frente e 23 no verso, e o mesmo rodapé de códigos de devolução.
 *
 * O que o sistema preenche sai em azul negrito itálico, como no modelo; o
 * resto fica em branco para ser escrito à mão — inclusive a data e a
 * assinatura do funcionário no fim da declaração.
 *
 * O jsPDF entra por import(): são ~180 KB que só fazem sentido baixar para
 * quem realmente clica em gerar.
 */
import { LOGO_MW_JPEG } from './logoMw';

export interface ItemFichaEpi {
  qtde: number;
  ca: string;
  descricao: string;
  /** Tamanho da botina, uniforme etc. Entra junto da descrição. */
  tamanho?: string;
}

export interface DadosFichaEpi {
  nome: string;
  registro: string;
  funcao: string;
  obra: string;
  dataEntrega: string;
  /** Acrescenta a folha do verso, com 23 linhas em branco. */
  comVerso: boolean;
  itens: ItemFichaEpi[];
}

/** Linhas da tabela em cada folha, como no formulário impresso. */
export const LINHAS_FRENTE = 13;
export const LINHAS_VERSO = 23;

const TITULO = 'FICHA INDIVIDUAL DE CONTROLE DE EPI´s';
const RODAPE_FRENTE = 'FO-RH-05-V2 - Formulário para Ficha Individual de EPIs';
const RODAPE_VERSO = 'FO-RH-05-V2 - Formulário para Ficha Individual de EPIs (verso)';

const CABECALHO = [
  'OBRA', 'DATA DA ENTREGA', 'QTDE.', 'C.A.', 'DESCRIÇÃO DO EPI',
  'DATA DEVOLUÇÃO', 'RECEBEDOR', 'CÓD.DEV.', 'ASSINATURA DO EMPREGADO',
];

/** Larguras tiradas da planilha original (mm). Somam os 267 mm úteis. */
const LARGURAS = [14.7, 26.4, 10.2, 19.8, 72.4, 27.9, 24.9, 13.2, 57.5];

const MARGEM = 15;
const UTIL = 267;
const ALTURA_LINHA = 7.3;

const AZUL: [number, number, number] = [31, 56, 100];
const CINZA: [number, number, number] = [217, 217, 217];
const PRETO: [number, number, number] = [0, 0, 0];

const DECLARACAO_TITULO =
  'DECLARAÇÃO DE RECEBIMENTO, SUBSTITUIÇÃO E/OU DEVOLUÇÃO DE EPI / UNIFORME';

/** Texto corrido da declaração. `negrito` marca as duas linhas destacadas. */
const DECLARACAO: { texto: string; negrito?: boolean }[] = [
  {
    texto:
      'Declaro para todos os devidos fins de direito que recebi, do Serviço Especializado em Engenharia e Medicina do Trabalho da MW Engenharia Ltda na obra identificada, ' +
      'instruções específicas sobre Normas de Segurança, Higiene e Medicina do Trabalho, comprometendo-me a cumpri-las, integralmente, bem como recebimentos dos ' +
      'Equipamentos de Proteção Individual (EPI), abaixo relacionado(s), os quais obrigo-me a usar sistematicamente em meu trabalho, atendendo as exigências da NR-6, ' +
      'itens 6.6 e 6.7, NR-1 e seus sub-itens.',
  },
  { texto: 'Declaro ainda ter ciência que:', negrito: true },
  { texto: 'a) Os EPI´s deverão ser utilizados unicamente para o fim a que se destinam.' },
  { texto: 'b) Qualquer alteração que tornem os EPI´s parcial ou totalmente danificados, deverão ser comunicados à empresa, por mim.' },
  {
    texto:
      'c) A falta de uso dos EPI´s fornecidos pela empregadora, constutui ato faltoso, sujeito às sanções disciplinares previstas na Legislação, no Regulamento interno e ' +
      'Normas de Segurança da Empresa, aplicáveis, inclusive e especialmente, a demissão por justa causa, conforme artigo 158, combinado à alínea H do artigo 482 da CLT.',
  },
  { texto: 'd) Declaro ter sido treinado para o uso correto e adequado dos EPI´s recebidos.' },
  { texto: 'e) Eu serei o único responsável pela guarda e conservação dos EPI´s que forem entregues.' },
  {
    texto:
      'f) A empregadora fica expressamente autorizada a descontar do meu salário, gratificações ou qualquer outra remuneração, ou indenização, os valores dos EPI´s que ' +
      'por ventura forem danificados, por mim, culposa ou dolosamente, ou forem extraviados, devendo ser devolvido para substituição, ou por ocasião de qualquer tipo de ' +
      'afastamento ou desligamento da empresa.',
  },
  { texto: 'Finalmente, declaro estar de acordo com todos os termos da presente, razão pela qual assino, nesta data, por livre e espontânea vontade.' },
];

/** 2026-03-14 → 14/3/2026, como a planilha escreve. */
export function dataBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : String(iso || '');
}

function descricaoCompleta(i: ItemFichaEpi): string {
  const t = String(i.tamanho || '').trim();
  return t ? `${i.descricao}  ${t}` : i.descricao;
}

/** Caixa com borda fina, igual às da planilha. */
function caixa(doc: any, x: number, y: number, w: number, h: number, fundo?: [number, number, number]) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  if (fundo) {
    doc.setFillColor(...fundo);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
}

/** Cabeçalho da folha: logo, título e, na frente, os dados do funcionário. */
function desenharTopo(doc: any, dados: DadosFichaEpi, frente: boolean): number {
  let y = 10;

  if (frente) {
    // Faixa do título com a logo à esquerda
    const larguraLogo = 30;
    caixa(doc, MARGEM, y, larguraLogo, 14);
    caixa(doc, MARGEM + larguraLogo, y, UTIL - larguraLogo, 14);
    try {
      doc.addImage(LOGO_MW_JPEG, 'JPEG', MARGEM + 3, y + 1.5, 24, 11);
    } catch {
      // Sem a imagem a ficha continua valendo; só não leva a marca.
    }
    doc.setTextColor(...PRETO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(TITULO, MARGEM + larguraLogo + (UTIL - larguraLogo) / 2, y + 9, { align: 'center' });
    y += 14;

    // NOME DO FUNCIONÁRIO | REGISTRO / MATRÍCULA N°
    const h = 6.5;
    const rotNome = 53, rotReg = 43, valReg = 53;
    const valNome = UTIL - rotNome - rotReg - valReg;
    doc.setFontSize(8);
    caixa(doc, MARGEM, y, rotNome, h, CINZA);
    doc.text('NOME DO FUNCIONÁRIO:', MARGEM + rotNome - 2, y + 4.4, { align: 'right' });
    caixa(doc, MARGEM + rotNome, y, valNome, h);
    caixa(doc, MARGEM + rotNome + valNome, y, rotReg, h, CINZA);
    doc.text('REGISTRO / MATRÍCULA N°:', MARGEM + rotNome + valNome + rotReg - 2, y + 4.4, { align: 'right' });
    caixa(doc, MARGEM + rotNome + valNome + rotReg, y, valReg, h);

    doc.setTextColor(...AZUL);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9);
    doc.text(dados.nome || '', MARGEM + rotNome + 2, y + 4.5);
    doc.text(dados.registro || '', MARGEM + rotNome + valNome + rotReg + 2, y + 4.5);
    y += h;

    // FUNÇÃO / CARGO
    doc.setTextColor(...PRETO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    caixa(doc, MARGEM, y, rotNome, h, CINZA);
    doc.text('FUNÇÃO / CARGO:', MARGEM + rotNome - 2, y + 4.4, { align: 'right' });
    caixa(doc, MARGEM + rotNome, y, UTIL - rotNome, h);
    doc.setTextColor(...AZUL);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(9);
    doc.text(dados.funcao || '', MARGEM + rotNome + 2, y + 4.5);
    y += h + 2;

    y = desenharDeclaracao(doc, y);
  } else {
    // Verso: só a faixa do título
    caixa(doc, MARGEM, y, UTIL, 10);
    doc.setTextColor(...PRETO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(TITULO, MARGEM + UTIL / 2, y + 7, { align: 'center' });
    y += 12;
  }

  return y;
}

/** O bloco da declaração, dentro de uma moldura só. */
function desenharDeclaracao(doc: any, topo: number): number {
  const padX = 2.5;
  const largura = UTIL - padX * 2;
  let y = topo + 6;

  doc.setTextColor(...PRETO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(DECLARACAO_TITULO, MARGEM + padX, y);
  y += 4;

  doc.setFontSize(5.9);
  for (const p of DECLARACAO) {
    doc.setFont('helvetica', p.negrito ? 'bold' : 'normal');
    const linhas = doc.splitTextToSize(p.texto, largura);
    for (const l of linhas) {
      doc.text(l, MARGEM + padX, y);
      y += 2.45;
    }
  }

  // Data e assinatura: ficam em branco, para preencher à mão
  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Data: ______ / _______ / ______', MARGEM + padX + 4, y);
  doc.text('Assinatura do Funcionário: _______________________________________________________',
    MARGEM + padX + 78, y);
  y += 2.5;

  // Moldura por fora de tudo
  caixa(doc, MARGEM, topo, UTIL, y - topo);
  return y + 2;
}

/** Linhas da tabela: as preenchidas em azul, o resto com os "/  /" do modelo. */
function montarCorpo(dados: DadosFichaEpi, itens: ItemFichaEpi[], total: number) {
  const azul = { textColor: AZUL, fontStyle: 'bolditalic' as const };
  const data = dataBr(dados.dataEntrega);
  const corpo: any[][] = [];

  for (let n = 0; n < total; n++) {
    const i = itens[n];
    if (i) {
      corpo.push([
        { content: dados.obra || '', styles: { ...azul, halign: 'center' } },
        { content: data, styles: { ...azul, halign: 'center' } },
        { content: String(i.qtde || 1), styles: { ...azul, halign: 'center' } },
        { content: i.ca || '***', styles: { ...azul, halign: 'center' } },
        { content: descricaoCompleta(i), styles: azul },
        { content: '/        /', styles: { ...azul, halign: 'center' } },
        '', '',
        { content: 'x', styles: azul },
      ]);
    } else {
      corpo.push([
        '',
        { content: '/        /', styles: { ...azul, halign: 'center' } },
        '', '', '',
        { content: '/        /', styles: { ...azul, halign: 'center' } },
        '', '', '',
      ]);
    }
  }
  return corpo;
}

function desenharTabela(doc: any, autoTable: any, dados: DadosFichaEpi, itens: ItemFichaEpi[], total: number, topo: number) {
  const colunas: Record<number, any> = {};
  LARGURAS.forEach((w, n) => { colunas[n] = { cellWidth: w }; });

  autoTable(doc, {
    startY: topo,
    // bottom pequeno: as 23 linhas do verso precisam caber numa folha só
    margin: { left: MARGEM, right: MARGEM, bottom: 6 },
    head: [CABECALHO],
    body: montarCorpo(dados, itens, total),
    theme: 'grid',
    styles: {
      font: 'helvetica', fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 },
      lineColor: PRETO, lineWidth: 0.2, minCellHeight: ALTURA_LINHA, valign: 'middle',
      textColor: PRETO,
    },
    headStyles: {
      fillColor: CINZA, textColor: PRETO, fontSize: 6.2, fontStyle: 'bold',
      halign: 'center', valign: 'middle', minCellHeight: 6,
      cellPadding: { top: 1, bottom: 1, left: 0.6, right: 0.6 },
    },
    columnStyles: colunas,
  });
}

/** Faixa cinza dos códigos de devolução + a identificação do formulário. */
function desenharRodape(doc: any, y: number, rodape: string) {
  caixa(doc, MARGEM, y, UTIL, 5.5, CINZA);
  doc.setTextColor(...PRETO);
  doc.setFontSize(7.5);

  const partes: [string, 'bold' | 'normal'][] = [
    ['CÓDIGOS MOTIVOS DA DEVOLUÇÃO:', 'normal'],
    ['[T] TEMPO DE USO', 'bold'],
    ['[D] DANIFICADO', 'bold'],
    ['[E] EXTRAVIO', 'bold'],
    ['[A] ACIDENTE', 'bold'],
    ['[O] OUTROS', 'bold'],
  ];
  const vao = 8;
  const total = partes.reduce((s, [t, e]) => {
    doc.setFont('helvetica', e);
    return s + doc.getTextWidth(t);
  }, 0) + vao * (partes.length - 1);

  let x = MARGEM + (UTIL - total) / 2;
  for (const [t, e] of partes) {
    doc.setFont('helvetica', e);
    doc.text(t, x, y + 3.8);
    x += doc.getTextWidth(t) + vao;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  doc.text(rodape, MARGEM - 3, y + 11);
}

/** Gera o PDF e devolve o Blob. Quem chamou decide se baixa ou abre. */
export async function gerarFichaEpiPdf(dados: DadosFichaEpi): Promise<Blob> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Frente — cabem 13 itens; o que passar disso a tela já avisou antes.
  const naFrente = dados.itens.slice(0, LINHAS_FRENTE);
  let y = desenharTopo(doc, dados, true);
  desenharTabela(doc, autoTable, dados, naFrente, LINHAS_FRENTE, y);
  desenharRodape(doc, (doc as any).lastAutoTable.finalY, RODAPE_FRENTE);

  if (dados.comVerso) {
    doc.addPage();
    y = desenharTopo(doc, dados, false);
    desenharTabela(doc, autoTable, dados, [], LINHAS_VERSO, y);
    desenharRodape(doc, (doc as any).lastAutoTable.finalY, RODAPE_VERSO);
  }

  return doc.output('blob');
}

/** Nome de arquivo previsível: FICHA-EPI_5231_MARIA-DA-SILVA.pdf */
export function nomeArquivoFicha(registro: string, nome: string): string {
  const limpo = String(nome || 'colaborador')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const reg = String(registro || '').replace(/[^A-Za-z0-9]/g, '');
  return `FICHA-EPI${reg ? '_' + reg : ''}_${limpo}.pdf`;
}

/** Dispara o download no navegador. */
export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
