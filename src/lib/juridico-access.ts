export const MARIA_JURIDICO_EMAIL = 'maria.rodrigues@viasudeste.com'
export const DANIEL_BROTAS_EMAIL = 'daniel.brotas@viasudeste.com'

export const isMariaJuridico = (email?: string | null): boolean =>
  !!email && email.toLowerCase() === MARIA_JURIDICO_EMAIL

export const isDanielBrotas = (email?: string | null): boolean =>
  !!email && email.toLowerCase() === DANIEL_BROTAS_EMAIL
