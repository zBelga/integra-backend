import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, Check, Sparkles } from 'lucide-react';
import { uploadDocumento } from '../../services/api';
import { addMeses } from '../../constants/documentosUI';

/** Um tipo do catálogo da empresa (vem do banco, não de uma lista fixa). */
export interface TipoCatalogo {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tem_validade: boolean;
  validade_meses?: number | null;
  dias_alerta?: number;
}

interface UploadDocumentoModalProps {
  colaboradorId: string;
  empresaId: string;
  /** Catálogo ativo da empresa */
  catalogo: TipoCatalogo[];
  /** Quando vem do checklist, já chega com o tipo escolhido */
  tipoPreSelecionado?: { id: string; codigo: string; nome: string };
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_MB = 10;

export const UploadDocumentoModal: React.FC<UploadDocumentoModalProps> = ({
  colaboradorId,
  empresaId,
  catalogo,
  tipoPreSelecionado,
  onClose,
  onSuccess,
}) => {
  const [tipoId, setTipoId] = useState(tipoPreSelecionado?.id || '');
  const [nome, setNome] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tipoCfg = catalogo.find(t => t.id === tipoId);

  // Pré-preenche o nome quando o tipo já vem escolhido pelo checklist
  useEffect(() => {
    if (tipoPreSelecionado && !nome) setNome(tipoPreSelecionado.nome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoPreSelecionado]);

  // Sugere o vencimento a partir da emissão + validade do tipo
  useEffect(() => {
    if (dataEmissao && tipoCfg?.tem_validade && tipoCfg.validade_meses && !dataVencimento) {
      setDataVencimento(addMeses(dataEmissao, tipoCfg.validade_meses));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataEmissao, tipoId]);

  const validarArquivo = (file: File): boolean => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo ${MAX_MB} MB.`);
      return false;
    }
    const ok = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
    if (!ok) {
      setError('Formato não aceito. Use PDF, JPG, PNG ou WEBP.');
      return false;
    }
    return true;
  };

  const aplicarArquivo = (file: File) => {
    if (!validarArquivo(file)) return;
    setSelectedFile(file);
    setError('');
    if (!nome) {
      const base = file.name.replace(/\.[^/.]+$/, '');
      setNome(tipoCfg?.nome || base);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) aplicarArquivo(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) aplicarArquivo(file);
  };

  const handleTipoChange = (novoTipoId: string) => {
    setTipoId(novoTipoId);
    const cfg = catalogo.find(t => t.id === novoTipoId);
    // Se o nome ainda não foi digitado à mão, sugere o nome do tipo
    if (cfg && (!nome || catalogo.some(t => t.nome === nome))) setNome(cfg.nome);
    // Tipo sem validade não guarda vencimento
    if (cfg && !cfg.tem_validade) setDataVencimento('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setError('Selecione um arquivo.'); return; }
    if (!tipoCfg) { setError('Selecione o tipo do documento.'); return; }
    if (!nome.trim()) { setError('Informe um nome para o documento.'); return; }
    if (dataEmissao && dataVencimento && dataVencimento < dataEmissao) {
      setError('A data de vencimento não pode ser anterior à emissão.');
      return;
    }

    setIsLoading(true);
    setError('');
    setProgresso(20);

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      setProgresso(60);

      await uploadDocumento({
        colaborador_id: colaboradorId,
        empresa_id: empresaId,
        tipo: tipoCfg.codigo,
        tipo_id: tipoCfg.id,
        nome: nome.trim(),
        nome_arquivo: selectedFile.name,
        fileBase64,
        mimeType: selectedFile.type || 'application/octet-stream',
        data_emissao: dataEmissao,
        data_vencimento: dataVencimento,
        observacoes,
      });

      setProgresso(100);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload.');
      setProgresso(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDE3E8] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#E8F3F6] rounded-lg flex items-center justify-center">
              <Upload className="w-4 h-4 text-[#176B87]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#17212B]">Anexar Documento</h2>
              <p className="text-xs text-[#687582]">PDF, JPG, PNG ou WEBP · máx. {MAX_MB} MB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Dropzone */}
          <div
            onClick={() => !isLoading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#176B87] bg-[#E8F3F6] scale-[1.01]'
                : selectedFile
                  ? 'border-[#159A72] bg-[#E8F6F1]'
                  : 'border-[#DDE3E8] hover:border-[#176B87] hover:bg-[#F8FAFB]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#B8E8D9] flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-[#159A72]" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-[#159A72] truncate">{selectedFile.name}</p>
                  <p className="text-xs text-[#687582]">
                    {(selectedFile.size / 1024).toFixed(0)} KB · clique para trocar
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-[#176B87]' : 'text-[#8995A1]'}`} />
                <p className="text-sm font-medium text-[#687582]">
                  {isDragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
                </p>
                <p className="text-xs text-[#8995A1] mt-0.5">PDF, JPG, PNG ou WEBP</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo — agrupado por categoria */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#17212B] mb-1">Tipo de Documento *</label>
              <select
                value={tipoId}
                onChange={e => handleTipoChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87] bg-white"
              >
                <option value="">Selecione o tipo...</option>
                {catalogo.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.codigo})
                  </option>
                ))}
              </select>
              {tipoCfg?.descricao && (
                <p className="mt-1 text-[10px] text-[#687582] leading-snug">{tipoCfg.descricao}</p>
              )}
            </div>

            {/* Nome */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#17212B] mb-1">Nome do Documento *</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: ASO Admissional 2026"
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87]"
              />
            </div>

            {/* Datas */}
            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">Data de Emissão</label>
              <input
                type="date"
                value={dataEmissao}
                onChange={e => setDataEmissao(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17212B] mb-1">
                Vencimento
                {tipoCfg?.validade_meses ? (
                  <span className="ml-1 text-[9px] text-[#159A72] font-bold inline-flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />{tipoCfg.validade_meses}m
                  </span>
                ) : null}
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
                disabled={tipoCfg ? !tipoCfg.tem_validade : false}
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87] disabled:bg-[#F4F6F8] disabled:text-[#8995A1]"
              />
            </div>

            {/* Observações */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#17212B] mb-1">Observações</label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={2}
                placeholder="Informações adicionais..."
                className="w-full px-3 py-2 text-xs border border-[#DDE3E8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#176B87] resize-none"
              />
            </div>
          </div>

          {tipoCfg?.validade_meses && dataEmissao && dataVencimento ? (
            <p className="text-[10px] text-[#159A72] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Vencimento sugerido ({tipoCfg.validade_meses} meses após a emissão) — pode ser ajustado.
            </p>
          ) : null}

          {error && (
            <div className="flex items-center gap-2 bg-[#FDEBEC] border border-[#F5B8BB] rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-[#D64550] shrink-0" />
              <p className="text-xs text-[#D64550]">{error}</p>
            </div>
          )}

          {isLoading && progresso > 0 && (
            <div className="h-1.5 bg-[#F4F6F8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#176B87] rounded-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2 text-xs font-semibold text-[#687582] bg-[#F4F6F8] hover:bg-[#DDE3E8] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="flex-1 py-2 text-xs font-semibold text-white bg-[#176B87] hover:bg-[#135a73] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Anexar Documento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
