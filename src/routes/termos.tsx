import { createFileRoute, Link } from "@tanstack/react-router";
import { FileAudio } from "lucide-react";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | ViraTexto" },
      {
        name: "description",
        content: "Termos de Uso do ViraTexto — plataforma de transcrição de áudio e vídeo com IA.",
      },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
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
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Termos de Uso</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: 24 de junho de 2025
          </p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-8 text-sm leading-relaxed text-neutral-700">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar o ViraTexto (<strong>"Serviço"</strong>), você concorda com
              estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o
              Serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">2. Descrição do Serviço</h2>
            <p>
              O ViraTexto é uma plataforma online que utiliza inteligência artificial para
              transcrever arquivos de áudio e vídeo em texto. O Serviço é fornecido "no estado em
              que se encontra", sem garantias de disponibilidade ininterrupta ou ausência de erros.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">3. Cadastro e Conta</h2>
            <p>
              Para utilizar o Serviço, você deve criar uma conta fornecendo um endereço de e-mail
              válido ou autenticando-se via Google. Você é responsável por manter a
              confidencialidade de suas credenciais e por todas as atividades realizadas em sua
              conta.
            </p>
            <p>
              É proibido criar contas falsas, compartilhar suas credenciais ou utilizar o Serviço de
              forma automatizada sem autorização prévia por escrito.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">4. Uso Aceitável</h2>
            <p>Ao utilizar o ViraTexto, você concorda em não:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>
                Carregar conteúdo ilegal, difamatório, obsceno ou que viole direitos de terceiros;
              </li>
              <li>
                Tentar burlar limites de uso ou sobrecarregar intencionalmente a infraestrutura do
                Serviço;
              </li>
              <li>
                Fazer engenharia reversa, descompilar ou extrair o código-fonte da plataforma;
              </li>
              <li>Revender ou sublicenciar o Serviço sem autorização expressa;</li>
              <li>Usar o Serviço para fins ilegais ou prejudiciais a terceiros.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">5. Propriedade do Conteúdo</h2>
            <p>
              Você retém todos os direitos sobre os arquivos de áudio e vídeo que envia ao Serviço,
              bem como sobre as transcrições geradas. Ao enviar conteúdo, você nos concede uma
              licença limitada, não exclusiva e temporária para processar esse conteúdo
              exclusivamente com a finalidade de fornecer o Serviço.
            </p>
            <p>
              Não utilizamos seu conteúdo para treinar modelos de inteligência artificial ou para
              qualquer finalidade além da prestação do Serviço solicitado.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">
              6. Precisão das Transcrições
            </h2>
            <p>
              As transcrições são geradas por inteligência artificial e podem conter erros,
              especialmente em áudios com ruído de fundo, sotaques regionais ou termos técnicos. O
              ViraTexto não garante a precisão absoluta das transcrições. Recomendamos sempre
              revisar o resultado antes de utilizá-lo em contextos críticos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">
              7. Limitação de Responsabilidade
            </h2>
            <p>
              Na máxima extensão permitida pela lei, o ViraTexto não se responsabiliza por danos
              indiretos, incidentais, especiais ou consequentes decorrentes do uso ou da
              impossibilidade de uso do Serviço, incluindo perda de dados ou lucros.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">
              8. Disponibilidade e Alterações
            </h2>
            <p>
              Reservamo-nos o direito de modificar, suspender ou encerrar o Serviço, no todo ou em
              parte, a qualquer momento, com ou sem aviso prévio. Também podemos atualizar estes
              Termos periodicamente. A continuação do uso do Serviço após as alterações constitui
              aceitação dos novos termos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">9. Rescisão</h2>
            <p>
              Podemos suspender ou encerrar sua conta a qualquer momento caso identifiquemos
              violação destes Termos. Você pode encerrar sua conta a qualquer momento entrando em
              contato conosco.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">10. Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer
              disputa será dirimida no foro da comarca de domicílio do usuário, conforme o Código de
              Defesa do Consumidor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-neutral-900">11. Contato</h2>
            <p>
              Dúvidas sobre estes Termos podem ser enviadas para:{" "}
              <a href="mailto:contato@viratexto.com.br" className="text-primary hover:underline">
                contato@viratexto.com.br
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 flex gap-6 text-xs text-muted-foreground">
          <Link to="/privacidade" className="hover:text-primary hover:underline">
            Política de Privacidade
          </Link>
          <Link to="/" className="hover:text-primary hover:underline">
            Voltar para o início
          </Link>
        </div>
      </main>
    </div>
  );
}
