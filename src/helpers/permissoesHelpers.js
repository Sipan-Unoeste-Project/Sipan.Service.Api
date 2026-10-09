/** Níveis de acesso do sistema (ENUM usuarios.permissao). */
export const PERMISSOES = [
  'Administrador',
  'Financeiro',
  'Veterinário',
  'Voluntário',
];

/** Recursos internos e quem pode acessar. */
export const MATRIZ_ACESSO = {
  inicio: PERMISSOES,
  'trocar-senha': PERMISSOES,
  usuarios: ['Administrador'],
  pessoas: ['Administrador', 'Financeiro', 'Voluntário'],
  animais: ['Administrador', 'Veterinário', 'Voluntário'],
  adocoes: ['Administrador', 'Voluntário'],
  voluntarios: ['Administrador'],
  apac: PERMISSOES,
  doacoes: ['Administrador', 'Financeiro', 'Voluntário'],
  campanhas: ['Administrador', 'Financeiro'],
  estoque: ['Administrador', 'Veterinário', 'Voluntário'],
  saude: ['Administrador', 'Veterinário'],
  financeiro: ['Administrador', 'Financeiro'],
  despesas: ['Administrador', 'Financeiro'],
  balancete: ['Administrador', 'Financeiro'],
  parceiros: ['Administrador', 'Financeiro'],
};

/** Prefixo da API → recurso da matriz. */
const API_RECURSOS = [
  { prefix: '/api/usuarios', recurso: 'usuarios' },
  { prefix: '/api/pessoas', recurso: 'pessoas' },
  { prefix: '/api/animais', recurso: 'animais' },
  { prefix: '/api/adocoes', recurso: 'adocoes' },
  { prefix: '/api/voluntarios', recurso: 'voluntarios' },
  { prefix: '/api/doacoes', recurso: 'doacoes' },
  { prefix: '/api/campanhas', recurso: 'campanhas' },
  { prefix: '/api/estoque', recurso: 'estoque' },
  { prefix: '/api/saude', recurso: 'saude' },
  { prefix: '/api/financeiro', recurso: 'financeiro' },
  { prefix: '/api/despesas', recurso: 'despesas' },
];

/** Normaliza legado Funcionário → Financeiro. */
export function normalizarPermissao(permissao) {
  if (permissao === 'Funcionário') return 'Financeiro';
  return permissao;
}

export function podeAcessarRecurso(permissao, recurso) {
  const nivel = normalizarPermissao(permissao);
  if (!nivel || !recurso) return false;
  if (nivel === 'Administrador') return true;
  const permitidos = MATRIZ_ACESSO[recurso];
  return Array.isArray(permitidos) && permitidos.includes(nivel);
}

export function recursoDaRotaApi(path) {
  if (!path || path.startsWith('/api/auth')) return null;
  const hit = API_RECURSOS.find(
    (item) => path === item.prefix || path.startsWith(`${item.prefix}/`)
  );
  return hit?.recurso ?? null;
}

export function isPermissaoValida(permissao) {
  return PERMISSOES.includes(normalizarPermissao(permissao));
}
