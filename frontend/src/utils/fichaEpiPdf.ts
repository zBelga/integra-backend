/**
 * Ficha de Controle de Entrega de EPI — FO-RH-05-V2.
 *
 * Monta o PDF no próprio navegador, com o mesmo desenho da planilha que o RH
 * usa hoje: logo e código do formulário no topo, os dados da pessoa logo
 * abaixo e a tabela de entrega com as colunas de devolução em branco, para
 * serem preenchidas à mão quando o EPI voltar.
 *
 * O jsPDF entra por import() — são ~180 KB que só fazem sentido baixar para
 * quem realmente clica em "gerar ficha".
 */
import { LOGO_MW_JPEG } from './logoMw';

export interface ItemFichaEpi {
  qtde: number;
  ca: string;
  descricao: string;
  /** Tamanho da botina, uniforme etc. Vai junto da descrição quando existe. */
  tamanho?: string;
}

export interface DadosFichaEpi {
  nome: string;
  registro: string;
  funcao: string;
  obra: string;
  dataEntrega: string;
  /** Repete a tabela numa segunda página em branco, para as próximas entregas. */
  comVerso: boolean;
  itens: ItemFichaEpi[];
  /** Linhas vazias a mais no fim da tabela, para anotar algo à mão. */
  linhasExtras?: number;
}

const CODIGOS_DEVOLUCAO =
  'CÓDIGOS MOTIVOS DA DEVOLUÇÃO:  [T] TEMPO DE USO   [D] DANIFICADO   ' +
  '[E] EXTRAVIO   [A] ACIDENTE   [O] OUTROS';

const CABECALHO = [
  'OBRA', 'DATA DA\nENTREGA', 'QTDE', 'C.A.', 'DESCRIÇÃO DO EPI',
  'DATA\nDEVOLUÇÃO', 'RECEBEDOR', 'CÓD.\nDEV.', 'ASSINATURA DO EMPREGADO',
];

/** 2026-03-14 → 14/03/2026. Qualquer outro formato volta como veio. */
export function dataBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || '');
}

function descricaoCompleta(i: ItemFichaEpi): string {
  const t = String(i.tamanho || '').trim();
  return t ? `${i.descricao}  —  Tam. ${t}` : i.descricao;
}

/**
 * Desenha uma página da ficha. Devolve nada: escreve direto no documento.
 * `linhas` vazio = página de verso (tabela em branco).
 */
function desenharPagina(
  doc: any,
  autoTable: any,
  dados: DadosFichaEpi,
  linhas: string[][],
  rotulo: string
) {
  const margem = 10;
  const largura = doc.internal.pageSize.getWidth();

  // ── Topo: logo | título | código do formulário ──
  try {
    doc.addImage(LOGO_MW_JPEG, 'JPEG', margem, 8, 32, 14);
  } catch {
    // Sem a imagem a ficha continua valendo; só não leva a marca.
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FICHA DE CONTROLE DE ENTREGA DE EPI', largura / 2, 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Equipamento de Proteção Individual', largura / 2, 20, { align: 'center' });
  doc.text('FO-RH-05-V2', largura - margem, 12, { align: 'right' });
  doc.text(rotulo, largura - margem, 16, { align: 'right' });

  // ── Dados da pessoa ──
  autoTable(doc, {
    startY: 26,
    margin: { left: margem, right: margem },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6, lineColor: [120, 120, 120], lineWidth: 0.2 },
    body: [
      [
        { content: 'NOME', styles: { fontStyle: 'bold', fillColor: [238, 241, 244], cellWidth: 20 } },
        { content: dados.nome || '' },
        { content: 'REGISTRO', styles: { fontStyle: 'bold', fillColor: [238, 241, 244], cellWidth: 22 } },
        { content: dados.registro || '', styles: { cellWidth: 26 } },
      ],
      [
        { content: 'FUNÇÃO', styles: { fontStyle: 'bold', fillColor: [238, 241, 244] } },
        { content: dados.funcao || '' },
        { content: 'OBRA', styles: { fontStyle: 'bold', fillColor: [238, 241, 244] } },
        { content: dados.obra || '' },
      ],
    ],
  });

  // ── Tabela de entrega ──
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 3,
    margin: { left: margem, right: margem },
    head: [CABECALHO],
    body: linhas,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.4, lineColor: [120, 120, 120], lineWidth: 0.2, minCellHeight: 7 },
    headStyles: {
      fillColor: [23, 107, 135], textColor: 255, fontSize: 6.5,
      halign: 'center', valign: 'middle', fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 11, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 22 },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 40 },
    },
  });

  // ── Rodapé: códigos de devolução e assinaturas ──
  const y = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(6.5);
  doc.text(CODIGOS_DEVOLUCAO, margem, y);

  doc.setFontSize(7.5);
  const meio = largura / 2;
  doc.line(margem, y + 16, meio - 8, y + 16);
  doc.line(meio + 8, y + 16, largura - margem, y + 16);
  doc.text('Assinatura do empregado', (margem + meio - 8) / 2, y + 20, { align: 'center' });
  doc.text('Téc. de Segurança do Trabalho', (meio + 8 + largura - margem) / 2, y + 20, { align: 'center' });
}

/**
 * Gera o PDF e devolve o Blob. Quem chamou decide se baixa ou abre.
 */
export async function gerarFichaEpiPdf(dados: DadosFichaEpi): Promise<Blob> {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const data = dataBr(dados.dataEntrega);
  const linhas: string[][] = dados.itens.map(i => [
    dados.obra || '', data, String(i.qtde || 1), i.ca || '', descricaoCompleta(i),
    '', '', '', '',
  ]);
  for (let n = 0; n < (dados.linhasExtras ?? 2); n++) {
    linhas.push(['', '', '', '', '', '', '', '', '']);
  }

  desenharPagina(doc, autoTable, dados, linhas, dados.comVerso ? 'Frente' : '');

  if (dados.comVerso) {
    doc.addPage();
    // Verso em branco: as próximas entregas são anotadas à mão nesta folha.
    const vazias: string[][] = Array.from({ length: 18 }, () =>
      ['', '', '', '', '', '', '', '', '']);
    desenharPagina(doc, autoTable, dados, vazias, 'Verso — próximas entregas');
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
  // Dá tempo do navegador começar a baixar antes de soltar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
