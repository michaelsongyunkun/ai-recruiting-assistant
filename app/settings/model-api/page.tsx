import { ModelApiSettings } from "../../../components/model-api-settings";

export default function ModelApiSettingsPage() {
  return (
    <div className="stack">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">设置</p>
          <h1>企业自有模型 API</h1>
          <p>
            招聘助手不会用平台默认模型做初筛或面试生成。企业必须接入自己的 API Key 或私有模型端点。
          </p>
        </div>
      </header>
      <ModelApiSettings />
    </div>
  );
}
