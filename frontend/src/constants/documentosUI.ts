/**
 * Aparência compartilhada da gestão de documentos.
 *
 * Nada aqui depende do catálogo: os tipos vêm do banco (por empresa). Este
 * arquivo só decide ícone e cor a partir do código do documento, com um
 * fallback genérico para qualquer tipo novo que o usuário cadastrar.
 */
import {
  FileText,
  Stethoscope,
  HardHat,
  Users,
  FileSignature,
  ClipboardList,
  IdCard,
  CreditCard,
  BookUser,
  Home,
  ShieldCheck,
  Zap,
  MoveVertical,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import type { SituacaoDocumento } from '../types';

/** Ícone por código de documento. Qualquer código novo cai no genérico. */
const ICONES: Record<string, LucideIcon> = {
  RG: IdCard,
  CPF: CreditCard,
  CTPS: BookUser,
  ASO: Stethoscope,
  CONTRATO: FileSignature,
  FICHA: ClipboardList,
  'FICHA REGISTRO': ClipboardList,
  COMPRESID: Home,
  NR06: HardHat,
  NR10: Zap,
  NR18: HardHat,
  NR35: MoveVertical,
  INTEGRACAO: Users,
  TREINAMENTO: GraduationCap,
  EPI: ShieldCheck,
};

export function iconeDoTipo(codigo: string): LucideIcon {
  const chave = String(codigo || '').toUpperCase().replace(/[\s._-]/g, '');
  return ICONES[chave] || ICONES[String(codigo || '').toUpperCase()] || FileText;
}

export interface EstiloSituacao {
  rotulo: string;
  texto: string;
  fundo: string;
  borda: string;
  ponto: string;
}

/** Paleta de status — mesma linguagem visual em todas as telas. */
export const ESTILO_SITUACAO: Record<SituacaoDocumento, EstiloSituacao> = {
  pendente:     { rotulo: 'Pendente',      texto: '#B4341F', fundo: '#FDECE8', borda: '#F7C9BD', ponto: '#E0603F' },
  valido:       { rotulo: 'Válido',        texto: '#0F7A5A', fundo: '#E8F6F1', borda: '#B8E8D9', ponto: '#159A72' },
  sem_validade: { rotulo: 'Válido',        texto: '#0F7A5A', fundo: '#E8F6F1', borda: '#B8E8D9', ponto: '#159A72' },
  a_vencer:     { rotulo: 'A vencer',      texto: '#A9690A', fundo: '#FEF3E0', borda: '#F8D99B', ponto: '#D4890A' },
  vencido:      { rotulo: 'Vencido',       texto: '#A8323C', fundo: '#FDEBEC', borda: '#F5B8BB', ponto: '#D64550' },
};

/** Dias até vencer. Negativo = já venceu. null = documento sem validade. */
export function diasParaVencer(dataISO?: string): number | null {
  const iso = String(dataISO || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - hoje.getTime()) / 86400000);
}

/** Situação de um documento anexado, considerando o alerta do tipo. */
export function situacaoDoDocumento(dataVencimento?: string, diasAlerta = 30): SituacaoDocumento {
  const dias = diasParaVencer(dataVencimento);
  if (dias === null) return 'sem_validade';
  if (dias < 0) return 'vencido';
  if (dias <= (diasAlerta > 0 ? diasAlerta : 30)) return 'a_vencer';
  return 'valido';
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Soma meses a uma data ISO (usado para sugerir o vencimento). */
export function addMeses(dataISO: string, meses: number): string {
  const d = new Date(`${dataISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

/** Cor da barra de conformidade. */
export function corConformidade(pct: number): string {
  if (pct >= 100) return '#159A72';
  if (pct >= 60) return '#D4890A';
  return '#D64550';
}
