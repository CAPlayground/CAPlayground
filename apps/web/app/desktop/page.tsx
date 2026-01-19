"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, Globe, Settings, User, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectsContent } from "../projects/page";
import { WALLPAPERS_JSON_URL, WallpapersGrid, WallpapersResponse } from "../wallpapers/WallpapersGrid";
import { useTheme } from "next-themes";

type TabKey = "projects" | "community" | "settings" | "account";

function Sidebar({
  activeTab,
  onTabChange,
  username,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  username: string;
}) {
  const navItems: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "projects", label: "My Projects", icon: FolderOpen },
    { key: "community", label: "Community", icon: Globe },
  ];

  const bottomItems: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "settings", label: "Settings", icon: Settings },
  ];

  const isMacElectron = typeof window !== "undefined" &&
    window.electronAPI?.isElectron &&
    window.electronAPI?.platform === "darwin";

  return (
    <aside className="w-56 bg-muted/50 border-r border-border flex flex-col h-full flex-shrink-0">
      {isMacElectron && (
        <div
          className="h-10 flex-shrink-0"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />
      )}
      <div className={`p-4 border-b border-border ${isMacElectron ? "pt-2" : ""}`}>
        <h1 className="font-heading font-bold text-lg">CAPlayground</h1>
      </div>

      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-2 border-t border-border space-y-1">
        {bottomItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onTabChange(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}

        <button
          onClick={() => onTabChange("account")}
          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "account"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
        >
          <User className="h-4 w-4 mt-0.5" />
          <div className="text-left">
            <div className="font-medium">Account</div>
            <div className="text-xs opacity-70">Logged in as: {username}</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

function CommunityContent() {
  const [wallpapersData, setWallpapersData] = useState<WallpapersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWallpapers() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(WALLPAPERS_JSON_URL, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch wallpapers");
        const data = (await res.json()) as WallpapersResponse;
        if (!data || !Array.isArray(data.wallpapers) || typeof data.base_url !== "string") {
          throw new Error("Invalid wallpapers data");
        }
        setWallpapersData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load wallpapers");
      } finally {
        setLoading(false);
      }
    }
    fetchWallpapers();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Community Wallpapers</h2>
          <p className="text-sm text-muted-foreground">Browse wallpapers shared by the community</p>
        </div>
        <div className="flex items-center justify-center p-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="inline-block h-5 w-5 border-2 border-t-transparent border-current rounded-full animate-spin" />
            Loading wallpapers...
          </div>
        </div>
      </div>
    );
  }

  if (error || !wallpapersData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Community Wallpapers</h2>
          <p className="text-sm text-muted-foreground">Browse wallpapers shared by the community</p>
        </div>
        <div className="bg-card rounded-xl border border-border/40 p-8 text-center">
          <Globe className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Unable to Load</h3>
          <p className="text-muted-foreground mb-4">
            {error || "Could not load wallpapers. Please check your internet connection."}
          </p>
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            <Globe className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Community Wallpapers</h2>
        <p className="text-sm text-muted-foreground">Browse wallpapers shared by the community</p>
      </div>
      <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
        <WallpapersGrid data={wallpapersData} />
      </Suspense>
    </div>
  );
}

function SettingsContent() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your app preferences</p>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border/40 p-4">
          <h3 className="font-medium mb-4">General</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Theme</div>
                <div className="text-xs text-muted-foreground">Choose your preferred theme</div>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Default Resolution</div>
                <div className="text-xs text-muted-foreground">Default size for new projects</div>
              </div>
              <Select defaultValue="393x852">
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="440x956">iPhone 16 Pro Max</SelectItem>
                  <SelectItem value="402x874">iPhone 16 Pro</SelectItem>
                  <SelectItem value="393x852">iPhone 16</SelectItem>
                  <SelectItem value="1032x1376">iPad Pro 13&quot;</SelectItem>
                  <SelectItem value="834x1210">iPad Pro 11&quot;</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/40 p-4">
          <h3 className="font-medium mb-4">Storage</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Projects Location</div>
                <div className="text-xs text-muted-foreground">Where your projects are saved</div>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountContent({ username }: { username: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="bg-card rounded-xl border border-border/40 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
            <User className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{username}</h3>
            <p className="text-sm text-muted-foreground">Local Account</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Projects Created</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Wallpapers Exported</div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/40 p-4">
        <h3 className="font-medium mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-sm">Export All Projects</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="text-sm">Import Projects</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-destructive">
            <span className="text-sm">Clear All Data</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const checkIsMacElectron = () =>
  typeof window !== "undefined" &&
  window.electronAPI?.isElectron === true &&
  window.electronAPI?.platform === "darwin";

export default function DesktopPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("projects");
  const [isMacElectron, setIsMacElectron] = useState(false);
  const username = "User";

  useEffect(() => {
    setIsMacElectron(checkIsMacElectron());
  }, []);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        username={username}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isMacElectron && (
          <div
            className="h-10 flex-shrink-0 border-b border-transparent"
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          />
        )}
        <header className={`p-6 border-b border-border flex-shrink-0 ${isMacElectron ? "pt-2" : ""}`}>
          <h1 className="text-4xl font-heading font-bold">Welcome back, {username}!</h1>
        </header>

        <ScrollArea className="flex-1">
          <div className="px-6">
            {activeTab === "projects" && (
              <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
                <ProjectsContent hideBackButton />
              </Suspense>
            )}
            {activeTab === "community" && <CommunityContent />}
            {activeTab === "settings" && <SettingsContent />}
            {activeTab === "account" && <AccountContent username={username} />}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
