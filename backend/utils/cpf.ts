/**
 * CPF Validation and Formatting Utilities
 * Adheres strictly to the official Brazilian CPF modulo 11 checksum algorithm.
 */

export function cleanCPF(cpf: string): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

export function formatCPF(cpf: string): string {
  const cleaned = cleanCPF(cpf);
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function isValidCPF(cpf: string): boolean {
  const cleaned = cleanCPF(cpf);

  // Must be 11 digits
  if (cleaned.length !== 11) return false;

  // Reject known invalid repetitive sequences (e.g., '111.111.111-11')
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validate 1st verifier digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleaned.charAt(9), 10)) return false;

  // Validate 2nd verifier digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleaned.charAt(10), 10)) return false;

  return true;
}
