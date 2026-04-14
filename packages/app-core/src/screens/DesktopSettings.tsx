import * as React from "react";
import { Server, Globe, Key, Save, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff, Upload, FileArchive, Loader2 } from "lucide-react";
import { useSettings } from "../config/SettingsContext";
import { DesktopShellHeader } from "../components/DesktopShellHeader";
import { Button } from "@memo-inbox/ui-kit";
import { appNavigateEvent } from "../router/createAppRouter";
import { useApiClient } from "../api/ApiClientContext";
import { usePlatformBridge } from "../platform/PlatformBridgeContext";

export function DesktopSettings() {
  const { settings, updateSettings } = useSettings();
  const apiClient = useApiClient();
  const platformBridge = usePlatformBridge();
  
  const [formData, setFormData] = React.useState({
    serviceBaseUrl: settings.serviceBaseUrl,
    serviceToken: settings.serviceToken,
    socketBaseUrl: settings.socketBaseUrl,
    socketVcpKey: settings.socketVcpKey,
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importStatus, setImportStatus] = React.useState<"idle" | "processing" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = React.useState("");
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [showServiceToken, setShowServiceToken] = React.useState(false);
  const [showSocketVcpKey, setShowSocketVcpKey] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      setSaveStatus("success");
      // Auto reload after a short delay to let user see success message
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportFlomo = async () => {
    try {
      setIsImporting(true);
      setImportStatus("processing");
      setImportMessage("正在解析压缩包并提取内容...");

      // Use unified bridge method (handles picking and processing)
      const items = await platformBridge.importFlomoExport();
      
      if (!items) {
        setIsImporting(false);
        setImportStatus("idle");
        return;
      }

      if (items.length === 0) {
        throw new Error("未在压缩包中找到有效的 flomo 笔记内容");
      }

      setImportMessage(`已识别 ${items.length} 条笔记，正在启动后端导入任务...`);

      // 2. Call backend import API
      await apiClient.imports.create({
        items,
        mode: "skip_duplicates"
      });

      setImportStatus("success");
      setImportMessage(`导入任务已提交！共 ${items.length} 条内容，您可以在首页铃铛处查看进度。`);
    } catch (error: any) {
      console.error("Import failed:", error);
      setImportStatus("error");
      setImportMessage(error.message || "导入失败，请检查压缩包格式是否正确");
    } finally {
      setIsImporting(false);
    }
  };

  const handleBack = () => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new Event(appNavigateEvent));
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
      <DesktopShellHeader activeTab="all" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="mb-10 flex items-center gap-6">
          <button 
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant/60"
            aria-label="返回首页"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-serif italic tracking-tight font-bold text-primary mb-1">设置</h1>
            <p className="text-on-surface-variant text-[10px] font-bold tracking-[0.2em] uppercase opacity-30">Configurations & Preferences</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Service Connection Section */}
          <section className="bg-surface-container-low rounded-[32px] p-8 border border-outline-variant/10 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Server size={20} />
              </div>
              <h2 className="text-xl font-bold text-primary">服务连接</h2>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-[0.15em] text-on-surface-variant/50 ml-1 uppercase">API 基础地址</label>
                <div className="relative group">
                  <Globe size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/20 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    name="serviceBaseUrl"
                    value={formData.serviceBaseUrl}
                    onChange={handleChange}
                    placeholder="https://your-api-server.com"
                    className="w-full bg-surface-container-high/50 border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/10"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-[0.15em] text-on-surface-variant/50 ml-1 uppercase">鉴权令牌 (Token)</label>
                <div className="relative group">
                  <Key size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/20 group-focus-within:text-primary transition-colors" />
                  <input
                    type={showServiceToken ? "text" : "password"}
                    name="serviceToken"
                    value={formData.serviceToken}
                    onChange={handleChange}
                    placeholder="Bearer token..."
                    className="w-full bg-surface-container-high/50 border-none rounded-2xl py-4 pl-14 pr-12 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowServiceToken(!showServiceToken)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/20 hover:text-primary transition-colors p-1"
                    aria-label={showServiceToken ? "隐藏令牌" : "显示令牌"}
                  >
                    {showServiceToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Socket Connection Section */}
          <section className="bg-surface-container-low rounded-[32px] p-8 border border-outline-variant/10 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Globe size={20} />
              </div>
              <h2 className="text-xl font-bold text-primary">实时任务连接</h2>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-[0.15em] text-on-surface-variant/50 ml-1 uppercase">Socket 基础地址</label>
                <div className="relative group">
                  <Globe size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/20 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    name="socketBaseUrl"
                    value={formData.socketBaseUrl}
                    onChange={handleChange}
                    placeholder="ws://127.0.0.1:6005"
                    className="w-full bg-surface-container-high/50 border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/10"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold tracking-[0.15em] text-on-surface-variant/50 ml-1 uppercase">VCP 密钥</label>
                <div className="relative group">
                  <Key size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/20 group-focus-within:text-primary transition-colors" />
                  <input
                    type={showSocketVcpKey ? "text" : "password"}
                    name="socketVcpKey"
                    value={formData.socketVcpKey}
                    onChange={handleChange}
                    placeholder="VCP_Key..."
                    className="w-full bg-surface-container-high/50 border-none rounded-2xl py-4 pl-14 pr-12 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSocketVcpKey(!showSocketVcpKey)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/20 hover:text-primary transition-colors p-1"
                    aria-label={showSocketVcpKey ? "隐藏密钥" : "显示密钥"}
                  >
                    {showSocketVcpKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Import Section */}
          <section className="bg-surface-container-low rounded-[32px] p-8 border border-outline-variant/10 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-success/10 text-success">
                <Upload size={20} />
              </div>
              <h2 className="text-xl font-bold text-success">数据导入</h2>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/20 rounded-[24px] p-12 bg-surface-container-lowest/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant/30 mb-6">
                <FileArchive size={32} />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">从 flomo 导入数据</h3>
              <p className="text-sm text-on-surface-variant/60 text-center max-w-sm mb-8 leading-relaxed">
                选择已导出的 flomo 压缩包 (ZIP)，系统将自动识别并解压其中的文字、标签及图片，并批量导入。
              </p>
              
              <Button
                variant="success"
                size="lg"
                onClick={handleImportFlomo}
                disabled={isImporting}
                className="px-10 rounded-2xl shadow-lg shadow-success/10"
              >
                {isImporting ? "正在导入..." : "选取压缩包并开始"}
              </Button>

              {importStatus !== "idle" && (
                <div 
                  className={`mt-8 w-full max-w-lg p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
                    importStatus === 'processing' ? 'bg-primary/5 border-primary/10 text-primary' :
                    importStatus === 'success' ? 'bg-success/5 border-success/10 text-success' :
                    'bg-red-50 border-red-100 text-red-600'
                  }`}
                >
                  <div className="mt-0.5">
                    {importStatus === 'processing' ? <Loader2 size={16} className="animate-spin" /> :
                     importStatus === 'success' ? <CheckCircle2 size={16} /> :
                     <AlertCircle size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">
                      {importStatus === 'processing' ? '解析中' :
                       importStatus === 'success' ? '导入成功' : '导入失败'}
                    </p>
                    <p className="text-sm font-medium leading-relaxed">{importMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between px-4 pb-12">
            <div className="flex items-center gap-2">
              {saveStatus === "success" && (
                <div className="flex items-center gap-2 text-success text-xs font-bold animate-in fade-in slide-in-from-left-2">
                  <CheckCircle2 size={14} />
                  保存成功，正在重启应用...
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold animate-in fade-in slide-in-from-left-2">
                  <AlertCircle size={14} />
                  保存失败，请重试
                </div>
              )}
            </div>
            
            <Button
              variant="success"
              size="lg"
              className="px-12 rounded-2xl shadow-lg shadow-success/10 hover:shadow-xl hover:shadow-success/20 transition-all active:scale-[0.98]"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "正在保存..." : (
                <div className="flex items-center gap-2">
                   <Save size={18} className="mr-1" />
                   保存并应用
                </div>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
