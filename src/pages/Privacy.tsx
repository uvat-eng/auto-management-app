import InfoPage from "@/components/fleet/InfoPage";
import { POLICY_SECTIONS, POLICY_UPDATED } from "@/lib/policy";

const Privacy = () => (
  <InfoPage title="Политика конфиденциальности" subtitle={`Приложение «Твой автопарк». Обновлено ${POLICY_UPDATED}`}>
    <div className="space-y-6">
      {POLICY_SECTIONS.map(([t, d]) => (
        <section key={t}>
          <h2 className="font-medium text-lg mb-1.5">{t}</h2>
          <p className="text-muted-foreground leading-relaxed">{d}</p>
        </section>
      ))}
    </div>
  </InfoPage>
);

export default Privacy;
