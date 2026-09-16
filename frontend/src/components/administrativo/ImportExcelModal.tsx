import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Obra, AdmissaoFormData } from '../../types';
import { parseExcelFile, generateTemplateExcel, ParsedImportRow } from '../../utils/excelUtils';
import { applyCPFMask, formatDateBR } from '../../utils/cpfMask';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  obras: Obra[];
  onImportSuccess: (admissoes: AdmissaoFormData[]) => Promise<void>;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  obras,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setIsParsing(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const rows = await parseExcelFile(buffer, obras);
      if (rows.length === 0) {
        setError('Nenhum registro encontrado na planilha fornecida.');
        setParsedRows([]);
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar arquivo Excel.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError('Nenhum registro válido para importar.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const dataToSave: AdmissaoFormData[] = validRows.map((r) => ({
        nome: r.nome,
        funcao: r.funcao,
        cpf: r.cpf,
        data_nascimento: r.data_nascimento,
        obra_id: r.obra_id || obras[0]?.id || 'obra-001',
        data_exame: r.data_exame || '',
        data_aso: r.data_aso || '',
        previsao_contratacao: r.previsao_contratacao,
      }));

      await onImportSuccess(dataToSave);
      handleReset();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao importar admissões.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-red-400" />
            <h2 className="text-sm font-bold tracking-wide">Importar Admissões via Excel (.xlsx)</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Template Download & Upload Area */}
          {!file && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-zinc-900">
                <div className="space-y-0.5">
                  <p className="font-semibold text-xs">Precisa do modelo padrão?</p>
                  <p className="text-[11px] text-zinc-500">
                    Baixe nossa planilha pré-formatada com as colunas corretas para preenchimento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => generateTemplateExcel()}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white font-semibold rounded-md flex items-center space-x-1.5 shadow-xs transition-colors whitespace-nowrap text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Modelo Excel</span>
                </button>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 hover:border-red-600 bg-zinc-50/70 hover:bg-red-50/30 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-zinc-800 text-sm">
                    Arraste sua planilha Excel aqui ou clique para selecionar
                  </p>
                  <p className="text-zinc-500 text-xs">
                    Formatos suportados: .xlsx, .xls (Tamanho máx: 10MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isParsing && (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-zinc-600">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              <p className="font-medium text-xs">Lendo e validando planilha...</p>
            </div>
          )}

          {/* Parsed Preview Table */}
          {!isParsing && parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5 text-zinc-800 font-semibold">
                    <FileSpreadsheet className="w-4 h-4 text-red-600" />
                    <span className="truncate max-w-[200px]">{file?.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="inline-flex items-center space-x-1 bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded font-medium">
                      <CheckCircle2 className="w-3 h-3 text-red-600" />
                      <span>{validCount} válidos</span>
                    </span>
                    {invalidCount > 0 && (
                      <span className="inline-flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-0.5 rounded font-medium">
                        <AlertCircle className="w-3 h-3" />
                        <span>{invalidCount} com erro</span>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="text-xs text-zinc-600 hover:text-red-600 underline"
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Preview Rows */}
              <div className="border border-zinc-200 rounded-lg overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-zinc-100 font-bold text-zinc-700 border-b border-zinc-200">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Nome</th>
                      <th className="py-2.5 px-3">Função</th>
                      <th className="py-2.5 px-3">CPF</th>
                      <th className="py-2.5 px-3">Data Nasc.</th>
                      <th className="py-2.5 px-3">Obra</th>
                      <th className="py-2.5 px-3">Data Exame</th>
                      <th className="py-2.5 px-3">Data ASO</th>
                      <th className="py-2.5 px-3">Previsão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'hover:bg-zinc-50' : 'bg-red-50/50 hover:bg-red-50'}
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center space-x-1 text-zinc-800 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                              <span>OK</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center space-x-1 text-red-700 font-medium cursor-help"
                              title={row.errors.join(', ')}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[100px]">{row.errors[0]}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-zinc-900 whitespace-nowrap">
                          {row.nome || '—'}
                        </td>
                        <td className="py-2 px-3 text-zinc-700 whitespace-nowrap">{row.funcao || '—'}</td>
                        <td className="py-2 px-3 font-mono text-zinc-700 whitespace-nowrap">
                          {row.cpf ? applyCPFMask(row.cpf) : '—'}
                        </td>
                        <td className="py-2 px-3 text-zinc-600 whitespace-nowrap">
                          {row.data_nascimento ? formatDateBR(row.data_nascimento) : '—'}
                        </td>
                        <td className="py-2 px-3 text-zinc-800 whitespace-nowrap">
                          {row.obra_nome || '—'}
                        </td>
                        <td className="py-2 px-3 text-zinc-600 whitespace-nowrap">
                          {row.data_exame ? formatDateBR(row.data_exame) : '—'}
                        </td>
                        <td className="py-2 px-3 text-zinc-600 whitespace-nowrap">
                          {row.data_aso ? formatDateBR(row.data_aso) : '—'}
                        </td>
                        <td className="py-2 px-3 text-zinc-800 whitespace-nowrap">
                          {row.previsao_contratacao ? formatDateBR(row.previsao_contratacao) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 transition-colors"
          >
            Cancelar
          </button>

          {parsedRows.length > 0 && (
            <button
              type="button"
              disabled={validCount === 0 || isSubmitting}
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importando registros...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmar Importação ({validCount} registros)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
