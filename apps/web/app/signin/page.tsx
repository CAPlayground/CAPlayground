"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AtSign,
  Lock,
  User as UserIcon,
  ArrowLeft,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AUTH_ENABLED, getSupabaseBrowserClient } from "@/lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    document.title = mode === "signin" ? "CAPlayground - 登录" : "CAPlayground - 注册";
  }, [mode]);

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("code")) {
      supabase.auth.getSession().then(() => {});
    }
  }, [supabase]);

  if (!AUTH_ENABLED) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative">
        {/* back*/}
        <div className="absolute left-4 top-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
        </div>

        {/* theme */}
        <div className="absolute right-4 top-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="rounded-full h-9 w-9 p-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="w-full max-w-md">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl font-bold">
                登录已禁用
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  此环境中已禁用身份验证，因为未设置必需的环境变量。
                </p>
                <p className="text-sm text-muted-foreground">
                  网站其余部分仍可正常使用。要启用账户功能，请设置{" "}
                  <code>NEXT_PUBLIC_SUPABASE_URL</code> 和{" "}
                  <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
                </p>
                <div className="flex gap-3">
                  <Link href="/">
                                      <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                                        返回首页
                                      </Button>                  </Link>
                  <Link href="/docs">
                    <Button variant="outline">文档</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password,
      });
      if (error) throw error;
      window.location.href = "/";
    } catch (e: any) {
      setError(e.message ?? "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  function isValidUsername(u: string) {
    // 3-20 chars, A-Z a-z 0-9 and ! - _ .
    return /^[A-Za-z0-9!._-]{3,20}$/.test(u);
  }

  async function handleSignUp() {
    setError(null);
    setLoading(true);
    try {
      if (!isValidUsername(signupUsername)) {
        throw new Error(
          "Username must be 3-20 chars and only letters, numbers, and ! - _ ."
        );
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: signupUsername },
        },
      });
      if (error) throw error;
      alert("Check your email for a confirmation link.");
      setMode("signin");
    } catch (e: any) {
      setError(e.message ?? "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${origin}/auth/success` },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message ?? "Google sign-in failed");
      setLoading(false);
    }
  }

  async function handleGithub() {
    setError(null);
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${origin}/auth/success` },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message ?? "Github sign-in failed");
      setLoading(false);
    }
  }

  async function handleDiscord() {
    setError(null);
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${origin}/auth/success` },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message ?? "Discord sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* back*/}
      <div className="absolute left-4 top-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
      </div>

      {/* theme */}
      <div className="absolute right-4 top-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="rounded-full h-9 w-9 p-0"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="text-center">
                          <CardTitle className="text-3xl md:text-4xl font-bold">
                            {mode === "signin" ? "欢迎回来" : "创建账户"}
                          </CardTitle>          </CardHeader>
          <CardContent>
            {mode === "signin" ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-identifier">邮箱</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-identifier"
                      type="email"
                      placeholder="您的邮箱"
                      className="pl-9"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="您的密码"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="text-right text-sm">
                    <Link
                      href="/forgot-password"
                      className="text-accent hover:underline"
                    >
                      忘记密码？
                    </Link>
                  </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button
                  disabled={loading}
                  onClick={handleSignIn}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                >
                  {loading ? "登录中..." : "登录"}
                </Button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleGoogle}
                  disabled={loading}
                >
                  <GoogleColorIcon className="h-4 w-4" />
                  使用 Google 继续
                </Button>

                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleGithub}
                  disabled={loading}
                >
                  <GithubIcon className="h-4 w-4" />
                  使用 GitHub 继续
                </Button>

                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleDiscord}
                  disabled={loading}
                >
                  <DiscordIcon className="h-4 w-4" />
                  使用 Discord 继续
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  New here?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-accent hover:underline font-medium"
                  >
                    创建账户
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">用户名</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="选择一个用户名"
                      className="pl-9"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    3-20个字符。仅限字母、数字和 ! - _ . 。
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">邮箱</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="您的邮箱"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="创建密码"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
                <p className="text-xs text-muted-foreground">
                  注册即表示您同意我们的{" "}
                  <Link href="/tos" className="underline">
                    服务条款
                  </Link>{" "}
                  和{" "}
                  <Link href="/privacy" className="underline">
                    隐私政策
                  </Link>
                  。您必须年满13岁，或达到您所在国家的最低数字同意年龄。
                </p>
                <Button
                  disabled={loading}
                  onClick={handleSignUp}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                >
                  {loading ? "注册中..." : "注册"}
                </Button>

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleGoogle}
                  disabled={loading}
                >
                  <GoogleColorIcon className="h-4 w-4" />
                  使用 Google 注册
                </Button>

                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleGithub}
                  disabled={loading}
                >
                  <GithubIcon className="h-4 w-4" />
                  使用 GitHub 注册
                </Button>

                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleDiscord}
                  disabled={loading}
                >
                  <DiscordIcon className="h-4 w-4" />
                  使用 Discord 注册
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  已有账户？{" "}
                  <button
                    onClick={() => setMode("signin")}
                    className="text-accent hover:underline font-medium"
                  >
                    登录
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoogleColorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path fill="#5865F2" d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
    </svg>
  );
}
