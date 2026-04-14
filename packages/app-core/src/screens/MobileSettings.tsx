import * as React from "react";
import { Server, Globe, Key, Save, CheckCircle2, AlertCircle, Eye, EyeOff, Database, RefreshCw } from "lucide-react";
import { useSettings } from "../config/SettingsContext";
import { useApiClient } from "../api/ApiClientContext";

export function MobileSettings() {
  const { settings, updateSettings } = useSettings();
  const apiClient = useApiClient();
  
  const [formData, setFormData] = React.useState({
    serviceBaseUrl: settings.serviceBaseUrl,
    serviceToken: settings.serviceToken,
    socketBaseUrl: settings.socketBaseUrl,
    socketVcpKey: settings.socketVcpKey,
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [showServiceToken, setShowServiceToken] = React.useState(false);
  const [showSocketVcpKey, setShowSocketVcpKey] = React.useState(false);
  
  const [isReindexing, setIsReindexing] = React.useState(false);
  const [reindexStatus, setReindexStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [reindexMessage, setReindexMessage] = React.useState("");

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

  const handleReindex = async () => {
    try {
      setIsReindexing(true);
      setReindexStatus("idle");
      const response = await apiClient.maintenance.reindex();
      setReindexStatus("success");
      setReindexMessage(`索引重建任务已启动 (ID: ${response.taskId})，您可以在侧边通知栏查看进度。`);
    } catch (error: any) {
      console.error("Reindex failed:", error);
      setReindexStatus("error");
      setReindexMessage(error.message || "索引重建请求失败");
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full px-5 pt-4 pb-12 w-full max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-serif italic font-bold text-primary">设置</h2>
        <p className="text-[11px] text-on-surface-variant/40 tracking-widest uppercase mt-1">Configurations</p>
      </div>

      <div className="space-y-6">
        {/* Service Connection Section */}
        <section className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-4">
            <Server size={18} className="text-primary" />
            <h3 className="text-[15px] font-bold text-primary">服务连接</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold tracking-[0.1em] text-on-surface-variant/50 ml-1 uppercase mb-1.5 block">API 基础地址</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30" />
                <input
                  type="text"
                  name="serviceBaseUrl"
                  value={formData.serviceBaseUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full bg-[#FCFAFA] md:bg-surface-container-high/50 border border-outline-variant/10 rounded-xl py-3 pl-10 pr-4 text-[13px] font-medium focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.1em] text-on-surface-variant/50 ml-1 uppercase mb-1.5 block">鉴权令牌 (Token)</label>
              <div className="relative">
                <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30" />
                <input
                  type={showServiceToken ? "text" : "password"}
                  name="serviceToken"
                  value={formData.serviceToken}
                  onChange={handleChange}
                  placeholder="Token"
                  className="w-full bg-[#FCFAFA] md:bg-surface-container-high/50 border border-outline-variant/10 rounded-xl py-3 pl-10 pr-10 text-[13px] font-medium focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowServiceToken(!showServiceToken)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30 p-1"
                >
                  {showServiceToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Socket Connection Section */}
        <section className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-primary" />
            <h3 className="text-[15px] font-bold text-primary">实时任务连接</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold tracking-[0.1em] text-on-surface-variant/50 ml-1 uppercase mb-1.5 block">Socket 基础地址</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30" />
                <input
                  type="text"
                  name="socketBaseUrl"
                  value={formData.socketBaseUrl}
                  onChange={handleChange}
                  placeholder="ws://..."
                  className="w-full bg-[#FCFAFA] md:bg-surface-container-high/50 border border-outline-variant/10 rounded-xl py-3 pl-10 pr-4 text-[13px] font-medium focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-[0.1em] text-on-surface-variant/50 ml-1 uppercase mb-1.5 block">VCP 密钥</label>
              <div className="relative">
                <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30" />
                <input
                  type={showSocketVcpKey ? "text" : "password"}
                  name="socketVcpKey"
                  value={formData.socketVcpKey}
                  onChange={handleChange}
                  placeholder="VCP Key"
                  className="w-full bg-[#FCFAFA] md:bg-surface-container-high/50 border border-outline-variant/10 rounded-xl py-3 pl-10 pr-10 text-[13px] font-medium focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSocketVcpKey(!showSocketVcpKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/30 p-1"
                >
                  {showSocketVcpKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Maintenance Section */}
        <section className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-primary" />
            <h3 className="text-[15px] font-bold text-primary">系统维护</h3>
          </div>
          
          <div className="bg-[#FCFAFA] md:bg-surface-container-high/30 border border-outline-variant/5 rounded-[16px] p-4">
            <div className="mb-3">
              <h4 className="text-[13px] font-bold text-on-surface mb-0.5">重建全文索引</h4>
              <p className="text-[11px] text-on-surface-variant/60 leading-relaxed">
                搜索结果不准确时，可清理并重新扫描。
              </p>
            </div>
            <button
              onClick={handleReindex}
              disabled={isReindexing}
              className="w-full py-2.5 rounded-xl border border-outline-variant/20 text-[12px] font-bold text-primary flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isReindexing ? "animate-spin" : ""} />
              {isReindexing ? "正在请求..." : "立即重建"}
            </button>
          </div>

          {reindexStatus !== "idle" && (
            <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 ${reindexStatus === 'success' ? 'bg-success/10 text-success' : 'bg-red-50 text-red-600'}`}>
              <div className="mt-0.5">
                {reindexStatus === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              </div>
              <div className="flex-1">
                <p className="text-[12px] leading-snug">{reindexMessage}</p>
              </div>
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-3">
          {saveStatus === "success" && (
            <div className="flex items-center justify-center gap-1.5 text-success text-[12px] font-bold">
              <CheckCircle2 size={14} /> 保存成功，正在重启...
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center justify-center gap-1.5 text-red-500 text-[12px] font-bold">
              <AlertCircle size={14} /> 保存失败
            </div>
          )}
          
          <button
            className="w-full bg-[#051F14] text-white font-[500] py-3.5 rounded-[16px] text-[14px] tracking-wide flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50 shadow-md shadow-black/5"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? "保存中..." : "保存并应用"}
          </button>
        </div>
      </div>
    </div>
  );
}
