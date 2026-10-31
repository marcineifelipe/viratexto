import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileAudio, Loader2 } from "lucide-react";

const LOGIN_BG_URL = "/login-bg-notebook.png";

/**
 * O link de redefinicao chega como /auth#...&type=recovery. Com
 * detectSessionInUrl ligado, o cliente do Supabase consome e limpa esse hash
 * assim que inicializa — por isso a leitura acontece na carga do modulo, antes
 * de qualquer render. O evento PASSWORD_RECOVERY cobre o caso de a limpeza
 * ganhar a corrida.
 */
const IS_RECOVERY_LINK =
  typeof window !== "undefined" && window.location.hash.includes("type=recovery");

/** Link expirado ou ja usado volta com #error=...&error_code=... e sem sessao. */
const RECOVERY_LINK_FAILED =
  typeof window !== "undefined" && /[#&]error(_code)?=/.test(window.location.hash);

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | ViraTexto" },
      { name: "description", content: "Faça login para transcrever seus áudios e vídeos com IA." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(IS_RECOVERY_LINK);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (RECOVERY_LINK_FAILED) {
      toast.error('O link expirou ou já foi usado. Peça outro em "Esqueceu a senha?".');
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // O link de recuperacao cria uma sessao valida. Sem o !recovery, o usuario
  // seria mandado direto ao dashboard e nunca veria onde trocar a senha.
  useEffect(() => {
    if (user && !recovery) navigate({ to: "/" });
  }, [user, recovery, navigate]);

  // Espelha Authentication > Providers > Email no painel do Supabase:
  // comprimento minimo 8 e "letras minusculas, maiusculas, digitos e simbolos".
  // Se mudar la, mude aqui tambem — fora de sincronia o servidor rejeita o
  // cadastro com mensagem em ingles, depois de o formulario ter aprovado.
  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
    if (!/[a-z]/.test(pwd)) return "A senha deve conter pelo menos uma letra minúscula.";
    if (!/[A-Z]/.test(pwd)) return "A senha deve conter pelo menos uma letra maiúscula.";
    if (!/[0-9]/.test(pwd)) return "A senha deve conter pelo menos um número.";
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd))
      return "A senha deve conter pelo menos um símbolo.";
    return null;
  };

  const handleEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (mode === "signup") {
      if (!fullName.trim()) {
        toast.error("Informe seu nome.");
        return;
      }
      const err = validatePassword(password);
      if (err) {
        toast.error(err);
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        // O full_name vai no metadata porque a trigger handle_new_user() le
        // raw_user_meta_data ->> 'full_name' para preencher public.profiles —
        // e o mesmo campo que o Google entrega no OAuth.
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setBusy(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validatePassword(newPassword);
    if (err) {
      toast.error(err);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      // Libera o redirect do effect acima agora que a senha foi trocada.
      setRecovery(false);
      toast.success("Senha atualizada!");
      navigate({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar a senha");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message || "Falha no login com Google");
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo */}
      <div className="relative hidden w-1/2 flex-col overflow-hidden bg-neutral-900 lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${LOGIN_BG_URL})` }}
        />

        <div className="absolute inset-0 bg-black/24" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/22 via-transparent to-black/50" />

        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-12">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-950 shadow-sm">
              <FileAudio className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">ViraTexto</span>
          </div>

          <figure className="max-w-md space-y-4 pb-2 text-white">
            <blockquote className="text-3xl font-bold leading-[1.12] tracking-normal xl:text-4xl">
              "Transcrevo áudios e vídeos em textos claros, a praticidade que você precisa."
            </blockquote>
            <figcaption className="space-y-1">
              <p className="text-base font-semibold">ViraTexto</p>
              <p className="text-sm text-white/78">
                Transcrição com IA para reuniões, aulas e entrevistas
              </p>
            </figcaption>
          </figure>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Logo mobile */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <FileAudio className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">ViraTexto</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* Título */}
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {recovery
                ? "Defina uma nova senha"
                : mode === "login"
                  ? "Bem-vindo de volta"
                  : "Crie sua conta"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {recovery
                ? "Escolha a senha que você vai usar a partir de agora."
                : mode === "login"
                  ? "Entre para continuar transcrevendo."
                  : "Comece a transcrever gratuitamente."}
            </p>
          </div>

          {recovery ? (
            <form onSubmit={handleRecovery} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  Nova senha
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mín. 8: maiúscula, minúscula, número e símbolo"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 border-slate-200 bg-slate-50 placeholder:text-muted-foreground/50 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 border-slate-200 bg-slate-50 placeholder:text-muted-foreground/50 focus:bg-white"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full gap-2 text-sm font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
            </form>
          ) : (
            <>
              {/* Google */}
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 border-slate-200 text-sm font-medium shadow-sm hover:bg-slate-50"
                onClick={handleGoogle}
                disabled={busy}
              >
                <GoogleIcon />
                Continuar com Google
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  ou continue com
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Formulário */}
              <form onSubmit={handleEmail} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Nome
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Como você quer ser chamado"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 border-slate-200 bg-slate-50 placeholder:text-muted-foreground/50 focus:bg-white"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-slate-200 bg-slate-50 placeholder:text-muted-foreground/50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Senha
                    </Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={async () => {
                          if (!email) {
                            toast.error("Digite seu e-mail primeiro.");
                            return;
                          }
                          const { error } = await supabase.auth.resetPasswordForEmail(email, {
                            redirectTo: `${window.location.origin}/auth`,
                          });
                          if (error) toast.error(error.message);
                          else toast.success("E-mail de redefinição enviado!");
                        }}
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mín. 8: maiúscula, minúscula, número e símbolo"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-slate-200 bg-slate-50 placeholder:text-muted-foreground/50 focus:bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full gap-2 text-sm font-semibold"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Aguarde...
                    </>
                  ) : mode === "login" ? (
                    "Entrar na plataforma"
                  ) : (
                    "Criar minha conta"
                  )}
                </Button>
              </form>

              {/* Trocar modo */}
              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="font-semibold text-primary hover:underline"
                >
                  {mode === "login" ? "Criar conta" : "Entrar"}
                </button>
              </p>
            </>
          )}

          {/* Termos */}
          <p className="text-center text-xs text-muted-foreground/60">
            Ao continuar, você concorda com nossos{" "}
            <Link to="/termos" className="underline underline-offset-2 hover:text-muted-foreground">
              Termos de Uso
            </Link>{" "}
            e{" "}
            <Link
              to="/privacidade"
              className="underline underline-offset-2 hover:text-muted-foreground"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
