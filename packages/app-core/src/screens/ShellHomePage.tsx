import { useEffect, useState } from "react";

import { usePlatformBridge } from "../platform/PlatformBridgeContext";
import "../styles/shell-home.css";

interface PlatformInfoState {
  kind: string;
  runtime: string;
  target?: string;
}

const boundaryCards = [
  {
    name: "app-core",
    description: "装配 Query、平台桥与共享首页。"
  },
  {
    name: "api-client",
    description: "保留 HTTP 与 Query 边界，占位未接真实服务。"
  },
  {
    name: "editor-markdown",
    description: "保留 Markdown / 编辑器会话边界。"
  },
  {
    name: "platform-bridge",
    description: "统一抽象 Web、Desktop、Mobile 平台能力。"
  },
  {
    name: "ui-kit",
    description: "保留基础组件与视觉样式边界。"
  },
  {
    name: "shared-types",
    description: "提供共享类型，不承载业务逻辑。"
  }
] as const;

export function ShellHomePage() {
  const platformBridge = usePlatformBridge();
  const [platformInfo, setPlatformInfo] = useState<PlatformInfoState>({
    kind: "unknown",
    runtime: "pending"
  });

  useEffect(() => {
    let active = true;

    void platformBridge.getPlatformInfo().then((info) => {
      if (active) {
        setPlatformInfo(info);
      }
    });

    return () => {
      active = false;
    };
  }, [platformBridge]);

  return (
    <main className="shell-home">
      <div className="shell-home__inner">
        <section className="shell-home__hero">
          <p className="shell-home__eyebrow">Architecture Shell</p>
          <h1 className="shell-home__title">Memo Inbox Client</h1>
          <p className="shell-home__summary">
            当前首页只用于验证三端入口、平台桥与共享装配链路，尚未接入任何 memo 业务功能。
          </p>
          <div className="shell-home__hero-meta">
            <span className="shell-home__chip">平台：{platformInfo.kind}</span>
            <span className="shell-home__chip">运行时：{platformInfo.runtime}</span>
            <span className="shell-home__chip">目标：{platformInfo.target ?? "shell"}</span>
          </div>
        </section>

        <section className="shell-home__grid">
          {boundaryCards.map((card) => (
            <article className="shell-home__panel" key={card.name}>
              <h3>{card.name}</h3>
              <p className="shell-home__status">{card.description}</p>
            </article>
          ))}
        </section>

        <section className="shell-home__panel">
          <h2>当前状态</h2>
          <ul className="shell-home__list">
            <li>尚未接入真实 memo 页面、列表、详情或编辑功能。</li>
            <li>尚未接入真实 API、上传协议、任务事件和离线同步。</li>
            <li>当前阶段只验证 Web、Desktop、Mobile 的工程链路和打包能力。</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
