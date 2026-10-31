/**
 * Fonte unica da checagem de admin. Cliente e servidor precisam normalizar
 * do mesmo jeito, senao um email gravado com maiuscula passa em um lado e
 * e barrado no outro.
 */
export const ADMIN_EMAIL = "marcineifelipe@hotmail.com";

export function isAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}
