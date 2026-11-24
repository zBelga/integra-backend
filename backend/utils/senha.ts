import bcrypt from 'bcryptjs';

/**
 * Hash de senhas com bcrypt.
 *
 * Senhas antigas estão guardadas em texto puro. Elas continuam funcionando:
 * verificarSenha() aceita o texto puro e o login regrava o hash na hora
 * (migração gradual, sem precisar redefinir senha de ninguém).
 */

const COST = 10;
const HASH_PREFIX = /^\$2[aby]\$\d{2}\$/;

export function ehHashBcrypt(valor: unknown): boolean {
  return typeof valor === 'string' && HASH_PREFIX.test(valor);
}

export function hashSenhaSync(senha: string): string {
  return bcrypt.hashSync(senha, COST);
}

/**
 * Confere a senha digitada contra o valor guardado no banco.
 * precisaRehash = true quando a senha guardada ainda é texto puro e bateu:
 * quem chamar deve gravar o hash.
 */
export async function verificarSenha(
  digitada: string,
  guardada: unknown
): Promise<{ ok: boolean; precisaRehash: boolean }> {
  if (typeof guardada !== 'string' || guardada === '') {
    return { ok: false, precisaRehash: false };
  }
  if (ehHashBcrypt(guardada)) {
    return { ok: await bcrypt.compare(digitada, guardada), precisaRehash: false };
  }
  // Legado: texto puro
  const ok = guardada === digitada;
  return { ok, precisaRehash: ok };
}
