import { TaskModelRoutingSection } from "../providers/TaskModelRoutingSection";

export function ModelRoutingSettingsView() {
  return (
    <div className="settings-panel" data-testid="model-routing-settings">
      <header className="settings-panel-header">
        <h1>Modelos por função</h1>
        <p className="card-muted">
          Escolha o provedor e o modelo usados em transcrição, orientação ao vivo,
          tradução, visão, busca e resumos. Deixe o modelo vazio para usar o padrão
          do provedor configurado em Provedores de IA.
        </p>
      </header>
      <TaskModelRoutingSection hideHeader />
    </div>
  );
}
