import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Trash2,
  User,
  Briefcase,
  Calendar,
  Hash,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  X,
  AlertTriangle,
  CreditCard,
  MapPin,
} from 'lucide-react';
import { UploadDocumentoModal } from './UploadDocumentoModal';
import { fetchDocumentosColaborador, downloadDocumento, deleteDocumento } from '../../services/api';
import { Colaborador, Documento } from '../../types';
import {
  DOCS_OBRIGATORIOS,
  CATEGORIAS,
  getTipoConfig,
  getStatusVencimento,
  diasParaVencer,
  formatBytes,
  StatusVencimento,
} from '../../constants/documentosConfig';
import { applyCPFMask, formatDateBR } from '../../utils/cpfMask';

interface ColaboradorPerfilProps {
  colaborador: Colaborador;
  onBack: () => void;
}

function StatusBadge({ status, dias }: { status: StatusVencimento; dias: number | null }) {
  if (status === 'vencido') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDEBEC] text-[#D64550] border border-[#F5B8BB] whitespace-nowrap">
        <AlertCircle className="w-3 h-3" />
        {dias !== null ? `Vencido ${Math.abs(dias)}d` : 'Vencido'}
      </span>
    );
  }
  if (status === 'a_vencer') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3E0] text-[#D4890A] border border-[#F8D99B] whitespace-nowrap">
        <Clock className="w-3 h-3" />
        {dias === 0 ? 'Hoje' : `${dias}d`}
      </span>
    );
  }
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F6F1] text-[#159A72] border border-[#B8E8D9] whitespace-nowrap">
        <CheckCircle className="w-3 h-3" /> Válido
      </span>
    );
  }
  return <span className="text-[#8995A1] text-[10px]">Sem validade</span>;
}

/** Modal de visualização inline (PDF / imagem) */
function PreviewModal({ url, nome, onClose }: { url: string; nome: string; onClose: () => void }) {
  const isImagem = /\.(jpe?g|png|webp|gif)$/i.test(nome);
  return (
    <div className="fixed inset-0 z-[60] bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#DDE3E8] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#176B87] shrink-0" />
            <h3 className="text-sm font-bold text-[#17212B] truncate">{nome}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              download={nome}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#176B87] hover:bg-[#135a73] text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Baixar
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-[#687582] hover:text-[#17212B] hover:bg-[#F4F6F8] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-[#F4F6F8] overflow-auto flex items-center justify-center">
          {isImagem ? (
            <img src={url} alt={nome} className="max-w-full max-h-full object-contain" />
          ) : (
            <iframe src={url} title={nome} className="w-full h-full border-0" />
          )}
        </div>
      </div>
    </div>
  );
}

export const ColaboradorPerfil: React.FC<ColaboradorPerfilProps> = ({ colaborador, onBack }) => {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTipoPre, setUploadTipoPre] = useState<string | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; nome: string } | null>(null);
  const [error, setError] = useState('');

  const loadDocumentos = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetchDocumentosColaborador(colaborador.id);
      setDocumentos(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar documentos.');
    } finally {
      setIsLoading(false);
    }
  }, [colaborador.id]);

  useEffect(() => { loadDocumentos(); }, [loadDocumentos]);

  // ─── Pendências obrigatórias ───
  const pendentes = useMemo(() => {
    const presentes = new Set(documentos.map(d => d.tipo));
    return DOCS_OBRIGATORIOS.filter(ob => !presentes.has(ob.codigo) && !presentes.has(ob.nome));
  }, [documentos]);

  const conformidade = useMemo(() => {
    const total = DOCS_OBRIGATORIOS.length;
    const ok = total - pendentes.length;
    return { ok, total, pct: total === 0 ? 100 : Math.round((ok / total) * 100) };
  }, [pendentes]);

  // ─── Documentos agrupados por categoria ───
  const agrupados = useMemo(() => {
    const grupos: Record<string, Documento[]> = {};
    documentos.forEach(doc => {
      const cfg = getTipoConfig(doc.tipo);
      const cat = cfg?.categoria || 'outros';
      if (!grupos[cat]) grupos[cat] = [];
      grupos[cat].push(doc);
    });
    // Ordena docs dentro de cada grupo: vencidos primeiro
    const ordem: StatusVencimento[] = ['vencido', 'a_vencer', 'sem_data', 'ok'];
    Object.values(grupos).forEach(arr =>
      arr.sort((a, b) => ordem.indexOf(getStatusVencimento(a.data_vencimento)) - ordem.indexOf(getStatusVencimento(b.data_vencimento)))
    );
    return grupos;
  }, [documentos]);

  const handleVisualizar = async (doc: Documento) => {
    setDownloadingId(doc.id);
    try {
      const res = await downloadDocumento(doc.id);
      setPreview({ url: res.url, nome: res.nome_arquivo || doc.nome_arquivo });
    } catch (err: any) {
      setError('Erro ao abrir documento: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownload = async (doc: Documento) => {
    setDownloadingId(doc.id);
    try {
      const res = await downloadDocumento(doc.id);
      const a = document.createElement('a');
      a.href = res.url;
      a.download = res.nome_arquivo || doc.nome_arquivo;
      a.target = '_blank';
      a.click();
    } catch (err: any) {
      setError('Erro ao baixar documento: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.nome}"?\n\nEsta ação não pode ser desfeita.`)) return;
    setDeletingId(doc.id);
    try {
      await deleteDocumento(doc.id);
      setDocumentos(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: any) {
      setError('Erro ao excluir: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const abrirUpload = (tipoPre?: string) => {
    setUploadTipoPre(tipoPre);
    setShowUpload(true);
  };

  const vencidos = documentos.filter(d => getStatusVencimento(d.data_vencimento) === 'vencido').length;
  const aVencer = documentos.filter(d => getStatusVencimento(d.data_vencimento) === 'a_vencer').length;

  return (
    <div className="p-6 space-y-5">
      {/* Voltar */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-[#687582] hover:text-[#17212B] transition-colors cursor-pointer font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Documentos
      </button>

      {/* Card do colaborador */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-[#E8F3F6] flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-[#176B87]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#17212B]">{colaborador.nome}</h2>
              {colaborador.numero_chapa && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB] rounded-md text-[11px] font-bold">
                  <Hash className="w-3 h-3" /> {colaborador.numero_chapa}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#687582]">
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> {colaborador.funcao}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Admissão: {formatDateBR(colaborador.data_admissao)}
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> {applyCPFMask(colaborador.cpf)}
              </span>
              {colaborador.obra_nome && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {colaborador.obra_nome}
                </span>
              )}
            </div>
          </div>

          {/* Conformidade */}
          <div className="shrink-0 w-full sm:w-52">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-[#687582] uppercase tracking-wide">Conformidade</span>
              <span className={`text-xs font-bold ${
                conformidade.pct === 100 ? 'text-[#159A72]' : conformidade.pct >= 60 ? 'text-[#D4890A]' : 'text-[#D64550]'
              }`}>
                {conformidade.pct}%
              </span>
            </div>
            <div className="h-2 bg-[#F4F6F8] rounded-full overflow-hidden border border-[#DDE3E8]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  conformidade.pct === 100 ? 'bg-[#159A72]' : conformidade.pct >= 60 ? 'bg-[#D4890A]' : 'bg-[#D64550]'
                }`}
                style={{ width: `${conformidade.pct}%` }}
              />
            </div>
            <p className="text-[10px] text-[#687582] mt-1">
              {conformidade.ok} de {conformidade.total} documentos obrigatórios
            </p>
          </div>
        </div>

        {/* Mini-stats */}
        <div className="mt-4 pt-4 border-t border-[#DDE3E8] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] font-semibold text-[#687582] uppercase">Total</p>
            <p className="text-lg font-bold text-[#17212B]">{documentos.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#D64550] uppercase">Vencidos</p>
            <p className="text-lg font-bold text-[#D64550]">{vencidos}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#D4890A] uppercase">A vencer</p>
            <p className="text-lg font-bold text-[#D4890A]">{aVencer}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#7C3AED] uppercase">Pendentes</p>
            <p className="text-lg font-bold text-[#7C3AED]">{pendentes.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-[#FDEBEC] border border-[#F5B8BB] rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-[#D64550] shrink-0" />
          <p className="text-xs text-[#D64550] flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-[#D64550] cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Checklist de pendências obrigatórias */}
      {!isLoading && pendentes.length > 0 && (
        <div className="bg-white border border-[#DDD6FE] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-[#EDE9FE] border-b border-[#DDD6FE]">
            <AlertTriangle className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm font-bold text-[#7C3AED]">
              Documentos obrigatórios pendentes ({pendentes.length})
            </h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {pendentes.map(p => (
              <button
                key={p.codigo}
                onClick={() => abrirUpload(p.codigo)}
                title={`Anexar ${p.nome}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#DDD6FE] hover:border-[#7C3AED] hover:bg-[#EDE9FE] text-[#7C3AED] rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                {p.codigo}
              </button>
            ))}
          </div>
          <p className="px-4 pb-3 text-[10px] text-[#687582]">
            Clique em um item para anexar o documento correspondente.
          </p>
        </div>
      )}

      {/* Documentos */}
      <div className="bg-white rounded-2xl border border-[#DDE3E8] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE3E8]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#176B87]" />
            <h3 className="text-sm font-bold text-[#17212B]">Documentos Anexados</h3>
            <span className="px-2 py-0.5 bg-[#F4F6F8] text-[#687582] rounded-full text-[11px] font-medium">
              {documentos.length}
            </span>
          </div>
          <button
            onClick={() => abrirUpload()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#176B87] hover:bg-[#135a73] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> Anexar Documento
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block animate-spin rounded-full h-7 w-7 border-4 border-[#176B87] border-t-transparent" />
            <p className="mt-3 text-xs text-[#687582]">Carregando documentos...</p>
          </div>
        ) : documentos.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-[#8995A1] mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-[#17212B]">Nenhum documento anexado</h4>
            <p className="text-xs text-[#687582] mt-1">Clique em "Anexar Documento" para começar.</p>
          </div>
        ) : (
          <div>
            {(Object.keys(CATEGORIAS) as Array<keyof typeof CATEGORIAS>).map(cat => {
              const docs = agrupados[cat];
              if (!docs || docs.length === 0) return null;
              const catCfg = CATEGORIAS[cat];
              return (
                <div key={cat}>
                  {/* Cabeçalho da categoria */}
                  <div
                    className="px-5 py-2 flex items-center gap-2 border-b"
                    style={{ backgroundColor: catCfg.bg, borderColor: catCfg.border }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: catCfg.cor }}>
                      {catCfg.label}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: catCfg.cor }}>
                      ({docs.length})
                    </span>
                  </div>

                  <div className="divide-y divide-[#DDE3E8]">
                    {docs.map(doc => {
                      const st = getStatusVencimento(doc.data_vencimento);
                      const dias = diasParaVencer(doc.data_vencimento);
                      return (
                        <div
                          key={doc.id}
                          className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[#F8FAFB] transition-colors ${
                            st === 'vencido' ? 'bg-[#FDEBEC]/30' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#F4F6F8] border border-[#DDE3E8] flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-[#687582]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-[#17212B] truncate">{doc.nome}</span>
                              <span className="px-1.5 py-0.5 bg-[#E8F3F6] text-[#176B87] border border-[#C6E3EB] rounded text-[10px] font-bold shrink-0">
                                {doc.tipo}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {doc.data_emissao && (
                                <span className="text-[10px] text-[#687582]">
                                  Emitido: {formatDateBR(doc.data_emissao)}
                                </span>
                              )}
                              {doc.data_vencimento && (
                                <span className="text-[10px] text-[#687582]">
                                  Vence: {formatDateBR(doc.data_vencimento)}
                                </span>
                              )}
                              <span className="text-[10px] text-[#8995A1]">{formatBytes(doc.tamanho_bytes)}</span>
                            </div>
                          </div>

                          <div className="shrink-0 hidden sm:block">
                            <StatusBadge status={st} dias={dias} />
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => handleVisualizar(doc)}
                              disabled={downloadingId === doc.id}
                              title="Visualizar"
                              className="p-1.5 text-[#687582] hover:text-[#7C3AED] hover:bg-[#EDE9FE] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {downloadingId === doc.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                              title="Baixar"
                              className="p-1.5 text-[#687582] hover:text-[#176B87] hover:bg-[#E8F3F6] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc)}
                              disabled={deletingId === doc.id}
                              title="Excluir"
                              className="p-1.5 text-[#687582] hover:text-[#D64550] hover:bg-[#FDEBEC] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {deletingId === doc.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#D64550]/30 border-t-[#D64550] rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadDocumentoModal
          colaboradorId={colaborador.id}
          empresaId={colaborador.empresa_id || 'geral'}
          tipoPreSelecionado={uploadTipoPre}
          onClose={() => { setShowUpload(false); setUploadTipoPre(undefined); }}
          onSuccess={loadDocumentos}
        />
      )}

      {preview && (
        <PreviewModal url={preview.url} nome={preview.nome} onClose={() => setPreview(null)} />
      )}
    </div>
  );
};
