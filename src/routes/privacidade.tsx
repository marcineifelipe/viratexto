import { createFileRoute, Link } from "@tanstack/react-router";
import { FileAudio } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | ViraTexto" },
      { name: "description", content: "Política de Privacidade do ViraTexto — saiba como tratamos seus dados pessoais." },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-neutral-900 text-white">
              <FileAudio className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">ViraTexto</span>
          </Link>
          <Link to="/auth" className="text-sm font-medium text-primary hover:underline">
            Entrar
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: 24 de junho de 2025
          </p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-relaxed text-neutral-700">

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">1. Introdução</h2>
            <p>
              O ViraTexto respeita sua privacidade e está comprometido com a proteção dos seus dados pessoais.
              Esta Política descreve quais dados coletamos, como os utilizamos, com quem os compartilhamos e
              quais são seus direitos, em conformidade com a{" "}
              <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">2. Dados que Coletamos</h2>
            <p>Coletamos apenas os dados necessários para a prestação do Serviço:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Dados de cadastro:</strong> endereço de e-mail e, opcionalmente, nome fornecido via
                provedor de autenticação (Google);
              </li>
              <li>
                <strong>Arquivos de mídia:</strong> arquivos de áudio e vídeo enviados para transcrição —
                armazenados temporariamente durante o processamento;
              </li>
              <li>
                <strong>Transcrições geradas:</strong> textos resultantes do processamento dos seus arquivos;
              </li>
              <li>
                <strong>Dados de uso:</strong> informações técnicas como endereço IP, tipo de navegador,
                timestamps de acesso e logs de erros, coletados automaticamente para fins de segurança e
                diagnóstico.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">3. Finalidade do Tratamento</h2>
            <p>Utilizamos seus dados para:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Criar e gerenciar sua conta;</li>
              <li>Processar e entregar as transcrições solicitadas;</li>
              <li>Manter a segurança e integridade da plataforma;</li>
              <li>Enviar comunicações relacionadas ao Serviço (confirmação de e-mail, redefinição de senha);</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
            <p>
              <strong>Não</strong> utilizamos seus arquivos ou transcrições para treinar modelos de IA, vender
              dados a terceiros ou fins publicitários.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">4. Base Legal</h2>
            <p>O tratamento dos seus dados é fundamentado nas seguintes bases legais da LGPD:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Execução de contrato</strong> (art. 7º, V): para prestar o Serviço que você solicitou;
              </li>
              <li>
                <strong>Consentimento</strong> (art. 7º, I): para o envio de comunicações opcionais;
              </li>
              <li>
                <strong>Legítimo interesse</strong> (art. 7º, IX): para garantir a segurança e melhoria do Serviço;
              </li>
              <li>
                <strong>Cumprimento de obrigação legal</strong> (art. 7º, II): quando exigido por lei.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">5. Compartilhamento de Dados</h2>
            <p>
              Seus dados podem ser compartilhados com terceiros apenas nas seguintes situações:
            </p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                <strong>Supabase:</strong> plataforma de banco de dados, autenticação e armazenamento de arquivos,
                utilizada como infraestrutura do Serviço;
              </li>
              <li>
                <strong>OpenAI:</strong> seus arquivos de áudio/vídeo são enviados à API Whisper da OpenAI para
                processamento de transcrição. Consulte a{" "}
                <a
                  href="https://openai.com/policies/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  política de privacidade da OpenAI
                </a>
                ;
              </li>
              <li>
                <strong>Vercel:</strong> infraestrutura de hospedagem e entrega do Serviço;
              </li>
              <li>
                <strong>Autoridades competentes:</strong> quando exigido por lei ou ordem judicial.
              </li>
            </ul>
            <p>Não vendemos seus dados a terceiros.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">6. Retenção de Dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Os arquivos de mídia enviados são
              excluídos automaticamente após o processamento da transcrição. As transcrições permanecem
              disponíveis em sua conta até que você as exclua ou encerre a conta.
            </p>
            <p>
              Logs técnicos são mantidos por até 90 dias para fins de segurança e diagnóstico.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">7. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo transmissão
              criptografada via HTTPS, controle de acesso baseado em função e armazenamento seguro em
              infraestrutura de nuvem. Contudo, nenhum sistema é 100% inviolável, e não podemos garantir
              segurança absoluta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">8. Seus Direitos (LGPD)</h2>
            <p>Conforme a LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li><strong>Acesso:</strong> saber quais dados possuímos sobre você;</li>
              <li><strong>Correção:</strong> corrigir dados incompletos ou incorretos;</li>
              <li><strong>Exclusão:</strong> solicitar a eliminação dos seus dados;</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado;</li>
              <li><strong>Revogação de consentimento:</strong> retirar consentimentos concedidos;</li>
              <li><strong>Oposição:</strong> opor-se a tratamentos com os quais discorde.</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato pelo e-mail:{" "}
              <a href="mailto:privacidade@viratexto.com.br" className="text-primary hover:underline">
                privacidade@viratexto.com.br
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">9. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para manter sua sessão autenticada. Não utilizamos cookies de
              rastreamento publicitário. Você pode configurar seu navegador para bloquear cookies, mas isso
              pode impedir o funcionamento correto do Serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">10. Menores de Idade</h2>
            <p>
              O ViraTexto não é direcionado a menores de 18 anos. Se você tiver conhecimento de que um menor
              criou uma conta em nossa plataforma, entre em contato conosco para que possamos excluir os dados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">11. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política periodicamente. Em caso de alterações relevantes, notificaremos
              você por e-mail ou mediante aviso na plataforma. A continuação do uso do Serviço após as
              alterações constitui aceitação da nova versão.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">12. Contato e Encarregado (DPO)</h2>
            <p>
              Para questões relacionadas à privacidade e proteção de dados, entre em contato com nosso
              responsável pelo tratamento de dados:
            </p>
            <p>
              E-mail:{" "}
              <a href="mailto:privacidade@viratexto.com.br" className="text-primary hover:underline">
                privacidade@viratexto.com.br
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 flex gap-6 text-xs text-muted-foreground">
          <Link to="/termos" className="hover:text-primary hover:underline">
            Termos de Uso
          </Link>
          <Link to="/" className="hover:text-primary hover:underline">
            Voltar para o início
          </Link>
        </div>
      </main>
    </div>
  );
}
