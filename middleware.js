// Middleware Vercel : refuse les robots d'IA et les outils d'aspiration de contenu (403).
// Les moteurs de recherche (Googlebot, Bingbot…) et les navigateurs passent normalement.
// robots.txt reste accessible à tous pour que les robots lisent l'interdiction.
const BLOCKED = /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|Claude-SearchBot|Claude-User|anthropic-ai|CCBot|Google-Extended|GoogleOther|Applebot-Extended|PerplexityBot|Perplexity-User|Bytespider|Amazonbot|Meta-ExternalAgent|Meta-ExternalFetcher|FacebookBot|cohere-ai|cohere-training-data-crawler|Diffbot|ImagesiftBot|Omgili|omgilibot|Timpibot|YouBot|AI2Bot|Ai2Bot-Dolma|PanguBot|Kangaroo Bot|Scrapy|DuckAssistBot|MistralAI-User|img2dataset|Webzio-Extended|SemrushBot|AhrefsBot|MJ12bot|DotBot|PetalBot|DataForSeoBot|python-requests|python-urllib|Go-http-client|curl|wget|PhantomJS/i;

export const config = { matcher: '/((?!robots\\.txt$).*)' };

export default function middleware(request) {
    const ua = request.headers.get('user-agent') || '';
    if (!ua || BLOCKED.test(ua)) {
        return new Response('Accès automatisé non autorisé.', {
            status: 403,
            headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex, nofollow, noai, noimageai' }
        });
    }
}
