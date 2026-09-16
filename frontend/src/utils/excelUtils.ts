import ExcelJS from 'exceljs';
import { Admissao, Obra } from '../types';
import { applyCPFMask, formatDateBR, unmaskCPF } from './cpfMask';

// Helper to download binary blob
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

// Export admissions to .xlsx
export async function exportAdmissoesToExcel(admissoes: Admissao[], filename = 'Admissoes.xlsx') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema Administrativo RH';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Admissões', {
    views: [{ showGridLines: true }],
  });

  // Define columns
  worksheet.columns = [
    { header: 'Nome Completo', key: 'nome', width: 32 },
    { header: 'Função / Cargo', key: 'funcao', width: 28 },
    { header: 'CPF', key: 'cpf', width: 18 },
    { header: 'Data de Nascimento', key: 'data_nascimento', width: 20 },
    { header: 'Obra', key: 'obra_nome', width: 28 },
    { header: 'Data do Exame', key: 'data_exame', width: 18 },
    { header: 'Data ASO', key: 'data_aso', width: 18 },
    { header: 'Previsão de Contratação', key: 'previsao_contratacao', width: 24 },
  ];

  // Style Header Row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Blue 800
    };
    cell.font = {
      name: 'Calibri',
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Populate data rows
  admissoes.forEach((adm, index) => {
    const row = worksheet.addRow({
      nome: adm.nome,
      funcao: adm.funcao,
      cpf: applyCPFMask(adm.cpf),
      data_nascimento: formatDateBR(adm.data_nascimento),
      obra_nome: adm.obra_nome || 'N/A',
      data_exame: adm.data_exame ? formatDateBR(adm.data_exame) : '—',
      data_aso: adm.data_aso ? formatDateBR(adm.data_aso) : '—',
      previsao_contratacao: formatDateBR(adm.previsao_contratacao),
    });

    row.height = 22;
    const isEven = index % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10.5 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alignment rules
      if (colNumber === 1 || colNumber === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  // Write buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
}

// Generate an empty template for importing
export async function generateTemplateExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Modelo de Importação');

  worksheet.columns = [
    { header: 'Nome Completo', key: 'nome', width: 30 },
    { header: 'Função', key: 'funcao', width: 25 },
    { header: 'CPF', key: 'cpf', width: 20 },
    { header: 'Data Nascimento (DD/MM/AAAA)', key: 'data_nascimento', width: 28 },
    { header: 'Obra', key: 'obra', width: 25 },
    { header: 'Data do Exame (DD/MM/AAAA)', key: 'data_exame', width: 28 },
    { header: 'Data ASO (DD/MM/AAAA)', key: 'data_aso', width: 25 },
    { header: 'Previsão Contratação (DD/MM/AAAA)', key: 'previsao_contratacao', width: 32 },
  ];

  // Header style
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    };
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Sample Rows
  const sample1 = worksheet.addRow({
    nome: 'Carlos Eduardo Silva',
    funcao: 'Engenheiro Civil',
    cpf: '123.456.789-00',
    data_nascimento: '14/05/1988',
    obra: 'Obra Arena Multiuso',
    data_exame: '15/08/2026',
    data_aso: '18/08/2026',
    previsao_contratacao: '01/09/2026',
  });
  sample1.height = 20;

  const sample2 = worksheet.addRow({
    nome: 'Mariana Costa Rodrigues',
    funcao: 'Técnica de Segurança',
    cpf: '987.654.321-99',
    data_nascimento: '20/11/1992',
    obra: 'Obra Centro Empresarial',
    data_exame: '12/08/2026',
    data_aso: '14/08/2026',
    previsao_contratacao: '25/08/2026',
  });
  sample2.height = 20;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, 'Modelo_Importacao_Admissoes.xlsx');
}

// Convert date from formats (Excel serial number, DD/MM/YYYY, YYYY-MM-DD, Date object) to YYYY-MM-DD
export function normalizeExcelDate(val: any): string {
  if (!val) return '';
  
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  
  // Format DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // If number (Excel serial timestamp)
  const num = Number(val);
  if (!isNaN(num) && num > 1000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

export interface ParsedImportRow {
  rowNumber: number;
  nome: string;
  funcao: string;
  cpf: string;
  rawCpf: string;
  data_nascimento: string;
  obra_nome: string;
  obra_id?: string;
  data_exame: string;
  data_aso: string;
  previsao_contratacao: string;
  isValid: boolean;
  errors: string[];
}

// Parse uploaded Excel buffer
export async function parseExcelFile(
  fileBuffer: ArrayBuffer,
  existingObras: Obra[]
): Promise<ParsedImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('A planilha selecionada está vazia.');
  }

  const parsedRows: ParsedImportRow[] = [];

  // Map header columns flexibly
  let headerMap: { [key: string]: number } = {};
  const firstRow = worksheet.getRow(1);

  firstRow.eachCell((cell, colNumber) => {
    const val = String(cell.value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (val.includes('nome')) headerMap['nome'] = colNumber;
    else if (val.includes('func') || val.includes('cargo')) headerMap['funcao'] = colNumber;
    else if (val.includes('cpf')) headerMap['cpf'] = colNumber;
    else if (val.includes('nasc')) headerMap['data_nascimento'] = colNumber;
    else if (val.includes('obra')) headerMap['obra'] = colNumber;
    else if (val.includes('exame')) headerMap['data_exame'] = colNumber;
    else if (val.includes('aso')) headerMap['data_aso'] = colNumber;
    else if (val.includes('previs') || val.includes('contrat')) headerMap['previsao_contratacao'] = colNumber;
  });

  // Fallback to standard index if headers were not recognized
  if (!headerMap['nome']) headerMap['nome'] = 1;
  if (!headerMap['funcao']) headerMap['funcao'] = 2;
  if (!headerMap['cpf']) headerMap['cpf'] = 3;
  if (!headerMap['data_nascimento']) headerMap['data_nascimento'] = 4;
  if (!headerMap['obra']) headerMap['obra'] = 5;
  if (!headerMap['data_exame']) headerMap['data_exame'] = 6;
  if (!headerMap['data_aso']) headerMap['data_aso'] = 7;
  if (!headerMap['previsao_contratacao']) headerMap['previsao_contratacao'] = 8;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const getCellText = (colKey: string) => {
      const colIdx = headerMap[colKey];
      if (!colIdx) return '';
      const cellVal = row.getCell(colIdx).value;
      if (cellVal === null || cellVal === undefined) return '';
      if (typeof cellVal === 'object' && 'text' in cellVal) return String((cellVal as any).text);
      if (typeof cellVal === 'object' && 'result' in cellVal) return String((cellVal as any).result);
      return String(cellVal);
    };

    const getCellDate = (colKey: string) => {
      const colIdx = headerMap[colKey];
      if (!colIdx) return '';
      const cellVal = row.getCell(colIdx).value;
      return normalizeExcelDate(cellVal);
    };

    const nome = getCellText('nome').trim();
    const funcao = getCellText('funcao').trim();
    const rawCpf = getCellText('cpf').trim();
    const cpf = unmaskCPF(rawCpf);
    const data_nascimento = getCellDate('data_nascimento');
    const obra_nome = getCellText('obra').trim();
    const data_exame = getCellDate('data_exame');
    const data_aso = getCellDate('data_aso');
    const previsao_contratacao = getCellDate('previsao_contratacao');

    // Skip empty lines
    if (!nome && !cpf && !funcao) {
      return;
    }

    const errors: string[] = [];
    if (!nome) errors.push('Nome obrigatório');
    if (!funcao) errors.push('Função obrigatória');
    if (!cpf || cpf.length !== 11) errors.push('CPF inválido (11 dígitos)');
    if (!data_nascimento) errors.push('Data nasc. inválida');
    if (!previsao_contratacao) errors.push('Previsão contratação inválida');

    // Find obra ID
    let matchedObra = existingObras.find(
      (o) =>
        o.nome.toLowerCase() === obra_nome.toLowerCase() ||
        o.codigo.toLowerCase() === obra_nome.toLowerCase()
    );

    parsedRows.push({
      rowNumber,
      nome,
      funcao,
      cpf,
      rawCpf,
      data_nascimento,
      obra_nome: obra_nome || (matchedObra ? matchedObra.nome : 'Obra Padrão'),
      obra_id: matchedObra ? matchedObra.id : existingObras[0]?.id,
      data_exame,
      data_aso,
      previsao_contratacao,
      isValid: errors.length === 0,
      errors,
    });
  });

  return parsedRows;
}
