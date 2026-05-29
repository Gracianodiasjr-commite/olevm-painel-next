import { NextResponse } from 'next/server';

// Protege todo o painel com autenticação básica (usuário + senha).
// As credenciais vêm de variáveis de ambiente (NUNCA ficam no código):
//   BASIC_AUTH_USER, BASIC_AUTH_PASSWORD
// Configuradas em Vercel → Settings → Environment Variables.

export const config = {
  // Protege tudo, menos os assets estáticos do Next e o favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export function middleware(req) {
  const USER = process.env.BASIC_AUTH_USER;
  const PASS = process.env.BASIC_AUTH_PASSWORD;

  // Se as credenciais não estiverem configuradas, não bloqueia
  // (evita travar o acesso antes das env vars existirem).
  if (!USER || !PASS) return NextResponse.next();

  const header = req.headers.get('authorization') || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    let decoded = '';
    try {
      decoded = atob(encoded);
    } catch (e) {
      decoded = '';
    }
    const sep = decoded.indexOf(':');
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    if (user === USER && pass === PASS) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Autenticação necessária.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Painel de Produção OléVM", charset="UTF-8"',
    },
  });
}
