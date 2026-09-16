import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  X, 
  Upload, 
  Image as ImageIcon, 
  Palette, 
  Check, 
  Trash2, 
  Sparkles,
  Link,
  Layers
} from 'lucide-react';
import { Empresa } from '../../types';
import { PRESET_COMPANY_COLORS, PRESET_COMPANY_LOGOS, getCompanyTheme } from '../../utils/theme';

interface EmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (empresaData: Omit<Empresa, 'id' | 'obrasCount' | 'colaboradoresCount'>, id?: string) => void;
  editingEmpresa?: Empresa | null;
}

export const EmpresaModal: React.FC<EmpresaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingEmpresa,
}) => {
  const [nome, setNome] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [segmento, setSegmento] = useState('Construção Civil & Infraestrutura');
  const [corPrimaria, setCorPrimaria] = useState('#176B87');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoInputType, setLogoInputType] = useState<'upload' | 'url' | 'presets'>('upload');
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingEmpresa) {
      setNome(editingEmpresa.nome || '');
      setRazaoSocial(editingEmpresa.razaoSocial || '');
      setCnpj(editingEmpresa.cnpj || '');
      setSegmento(editingEmpresa.segmento || 'Construção Civil & Infraestrutura');
      setCorPrimaria(editingEmpresa.corPrimaria || '#176B87');
      setLogoUrl(editingEmpresa.logoUrl || '');
    } else {
      setNome('');
      setRazaoSocial('');
      setCnpj('');
      setSegmento('Construção Civil & Infraestrutura');
      setCorPrimaria('#176B87');
      setLogoUrl('');
    }
    setError('');
  }, [editingEmpresa, isOpen]);

  if (!isOpen) return null;

  const theme = getCompanyTheme(corPrimaria);

  // File upload handler (Base64)
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('O tamanho da imagem não deve exceder 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setLogoUrl(e.target.result as string);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cnpj.trim()) {
      setError('Nome da Empresa e CNPJ são obrigatórios.');
      return;
    }

    onSave(
      {
        nome: nome.trim(),
        razaoSocial: razaoSocial.trim() || nome.trim(),
        cnpj: cnpj.trim(),
        segmento: segmento.trim(),
        corPrimaria: corPrimaria || '#176B87',
        logoUrl: logoUrl.trim() || undefined,
        status: editingEmpresa ? editingEmpresa.status : 'ativa',
      },
      editingEmpresa?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17212B]/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-[#DDE3E8] w-full max-w-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-[#F8FAFB] text-[#17212B] px-6 py-4 flex items-center justify-between border-b border-[#DDE3E8]">
          <div className="flex items-center space-x-2.5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-2xs"
              style={{ backgroundColor: corPrimaria }}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#17212B]">
                {editingEmpresa ? 'Editar Empresa & Identidade Visual' : 'Cadastrar Nova Empresa'}
              </h2>
              <p className="text-[11px] text-[#687582]">
                Configure os dados, logo e cor dos módulos da organização
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#687582] hover:text-[#17212B] p-1.5 rounded-lg hover:bg-[#E8EDF2] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 bg-[#FDEBEC] border border-[#FAC5C9] text-[#D64550] rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* SECTION 1: Basic Company Data */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17212B] flex items-center space-x-2 border-b border-[#DDE3E8] pb-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#687582]" />
              <span>Dados Cadastrais da Empresa</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#17212B] mb-1">
                  Nome da Empresa <span className="text-[#D64550]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Construtora Horizonte"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-[#17212B] placeholder-[#8995A1] focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#17212B] mb-1">
                  CNPJ <span className="text-[#D64550]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="00.000.000/0001-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-[#17212B] placeholder-[#8995A1] focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#17212B] mb-1">Razão Social</label>
                <input
                  type="text"
                  placeholder="Ex: Horizonte Construções & Engenharia S/A"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-[#17212B] placeholder-[#8995A1] focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#17212B] mb-1">Segmento de Atuação</label>
                <input
                  type="text"
                  placeholder="Ex: Construção Civil & Infraestrutura"
                  value={segmento}
                  onChange={(e) => setSegmento(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-[#17212B] placeholder-[#8995A1] focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Logo / Imagem da Empresa */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#DDE3E8] pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17212B] flex items-center space-x-2">
                <ImageIcon className="w-3.5 h-3.5 text-[#687582]" />
                <span>Imagem / Logotipo da Empresa</span>
              </h3>

              {/* Mode switch */}
              <div className="flex items-center space-x-1 bg-[#F1F4F7] p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLogoInputType('upload')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                    logoInputType === 'upload' ? 'bg-white text-[#17212B] shadow-2xs' : 'text-[#687582]'
                  }`}
                >
                  Upload Imagem
                </button>
                <button
                  type="button"
                  onClick={() => setLogoInputType('presets')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                    logoInputType === 'presets' ? 'bg-white text-[#17212B] shadow-2xs' : 'text-[#687582]'
                  }`}
                >
                  Galeria
                </button>
                <button
                  type="button"
                  onClick={() => setLogoInputType('url')}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                    logoInputType === 'url' ? 'bg-white text-[#17212B] shadow-2xs' : 'text-[#687582]'
                  }`}
                >
                  Link URL
                </button>
              </div>
            </div>

            {/* Current Image Preview & Actions */}
            <div className="flex items-center gap-4 p-3.5 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl">
              <div className="relative">
                {logoUrl ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-white">
                    <img 
                      src={logoUrl} 
                      alt="Logo Preview" 
                      className="w-full h-full object-cover"
                      onError={() => {
                        setError('Não foi possível carregar a imagem. Verifique o link ou envie outro arquivo.');
                      }}
                    />
                  </div>
                ) : (
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center font-extrabold text-white text-xl shadow-xs"
                    style={{ backgroundColor: corPrimaria }}
                  >
                    {nome ? nome.substring(0, 2).toUpperCase() : 'EM'}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#17212B] text-xs">
                  {logoUrl ? 'Imagem definida' : 'Nenhuma imagem personalizada (usando monograma)'}
                </p>
                <p className="text-[11px] text-[#687582] mt-0.5">
                  Esta imagem será exibida nos cabeçalhos, barra lateral e cartões da organização.
                </p>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="mt-1.5 text-[11px] font-semibold text-[#D64550] hover:text-[#B53640] flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remover imagem</span>
                  </button>
                )}
              </div>
            </div>

            {/* Upload Area */}
            {logoInputType === 'upload' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  isDragOver 
                    ? 'border-[#176B87] bg-[#E8F3F6]' 
                    : 'border-[#DDE3E8] hover:border-[#176B87] bg-[#FAFBFD]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-[#176B87] mx-auto mb-1.5" />
                <p className="font-bold text-xs text-[#17212B]">
                  Clique para selecionar ou arraste o arquivo aqui
                </p>
                <p className="text-[11px] text-[#687582] mt-0.5">
                  Formatos suportados: PNG, JPG, SVG, WebP (Máx. 2MB)
                </p>
              </div>
            )}

            {/* Presets Gallery */}
            {logoInputType === 'presets' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRESET_COMPANY_LOGOS.map((preset) => {
                  const isSelected = logoUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setLogoUrl(preset.url)}
                      className={`p-2 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-[#176B87] bg-[#E8F3F6] ring-2 ring-[#176B87]/20 shadow-2xs' 
                          : 'border-[#DDE3E8] hover:bg-[#F8FAFB]'
                      }`}
                    >
                      <img 
                        src={preset.url} 
                        alt={preset.name} 
                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-[#DDE3E8]"
                      />
                      <span className="text-[11px] font-semibold text-[#17212B] truncate">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* URL Input */}
            {logoInputType === 'url' && (
              <div className="relative">
                <Link className="w-4 h-4 text-[#8995A1] absolute left-3 top-2.5" />
                <input
                  type="url"
                  placeholder="https://exemplo.com/logo-empresa.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFB] border border-[#DDE3E8] rounded-xl text-[#17212B] placeholder-[#8995A1] focus:ring-2 focus:ring-[#176B87]/20 focus:border-[#176B87] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* SECTION 3: Cor do Módulo / Identidade Visual */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17212B] flex items-center space-x-2 border-b border-[#DDE3E8] pb-1.5">
              <Palette className="w-3.5 h-3.5 text-[#687582]" />
              <span>Cor do Módulo & Identidade Visual</span>
            </h3>

            <p className="text-[11px] text-[#687582]">
              Todos os módulos e botões deste tenant adotarão esta cor como padrão para os usuários.
            </p>

            {/* Preset Color Swatches */}
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {PRESET_COMPANY_COLORS.map((color) => {
                const isSelected = corPrimaria.toLowerCase() === color.hex.toLowerCase();
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setCorPrimaria(color.hex)}
                    className={`flex items-center space-x-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-[#17212B] ring-2 ring-[#17212B]/20 bg-[#F8FAFB] font-bold' 
                        : 'border-[#DDE3E8] hover:bg-[#F8FAFB]'
                    }`}
                  >
                    <span 
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] shadow-2xs"
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className="text-[10px] text-[#17212B] truncate">{color.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center space-x-3 pt-1">
              <label className="text-[11px] font-semibold text-[#17212B]">
                Ou escolha uma cor personalizada (HEX):
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-[#DDE3E8] p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-24 px-2 py-1 bg-[#F8FAFB] border border-[#DDE3E8] rounded-lg text-xs font-mono font-bold text-[#17212B] uppercase text-center"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Live Interactive Preview */}
          <div className="space-y-2 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#687582] flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#176B87]" />
              <span>Pré-visualização do Módulo com a Identidade da Empresa</span>
            </h4>

            <div className="p-4 rounded-xl border border-[#DDE3E8] bg-white shadow-2xs space-y-3">
              {/* Top simulation bar */}
              <div className="flex items-center justify-between pb-2 border-b border-[#DDE3E8]">
                <div className="flex items-center space-x-2.5">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-2xs overflow-hidden"
                    style={{ backgroundColor: corPrimaria }}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      nome.substring(0, 1).toUpperCase() || 'E'
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#17212B]">{nome || 'Nome da Empresa'}</span>
                    <span 
                      className="ml-2 text-[9px] font-bold px-1.5 py-0.2 rounded border"
                      style={{
                        backgroundColor: theme.bgLight,
                        borderColor: theme.borderLight,
                        color: corPrimaria,
                      }}
                    >
                      MÓDULO ATIVO
                    </span>
                  </div>
                </div>

                <div 
                  className="px-3 py-1 rounded-lg text-white font-bold text-[11px] shadow-2xs flex items-center space-x-1"
                  style={{ backgroundColor: corPrimaria }}
                >
                  <Layers className="w-3 h-3" />
                  <span>+ Nova Admissão</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#687582]">
                <span>Cor ativa: <strong style={{ color: corPrimaria }}>{corPrimaria}</strong></span>
                <span>Segmento: <strong>{segmento}</strong></span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#DDE3E8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#DDE3E8] text-[#17212B] rounded-xl hover:bg-[#F8FAFB] font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white rounded-xl font-semibold shadow-xs cursor-pointer transition-all hover:opacity-90 flex items-center space-x-1.5"
              style={{ backgroundColor: corPrimaria }}
            >
              <Check className="w-4 h-4" />
              <span>{editingEmpresa ? 'Salvar Alterações' : 'Cadastrar Empresa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
