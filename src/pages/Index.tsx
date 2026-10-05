import { useEffect, useMemo, useRef, useState } from "react";
import AppHeader, { HeadLink } from "@/components/fleet/AppHeader";
import CarCarousel from "@/components/fleet/CarCarousel";
import CarStats from "@/components/fleet/CarStats";
import BottomNav, { Tab } from "@/components/fleet/BottomNav";
import MileageDialog from "@/components/fleet/MileageDialog";
import CarSheet, { CarSheetTab } from "@/components/fleet/CarSheet";
import ServiceScreen from "@/components/fleet/ServiceScreen";
import ServiceForm from "@/components/fleet/ServiceForm";
import ServiceDetail from "@/components/fleet/ServiceDetail";
import RemindersScreen from "@/components/fleet/RemindersScreen";
import NavigatorScreen from "@/components/fleet/NavigatorScreen";
import AddCarDialog from "@/components/fleet/AddCarDialog";
import ProfileSheet from "@/components/fleet/ProfileSheet";
import AuthScreen from "@/components/fleet/AuthScreen";
import RecoveryDialog from "@/components/fleet/RecoveryDialog";
import { FleetProvider, useFleet } from "@/hooks/use-fleet";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Reminder, buildReminders } from "@/lib/fleet";

type Overlay = null | "mileage" | "car" | "add" | "service" | "profile";

const FleetApp = () => {
  const { cars, ready, updateCar } = useFleet();
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("fleet");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [sheetTab, setSheetTab] = useState<CarSheetTab>("photos");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const safeIndex = Math.min(index, Math.max(cars.length - 1, 0));
  const car = cars[safeIndex];
  const record = recordId ? car?.services.find((x) => x.id === recordId) : undefined;
  const reminders = useMemo(() => buildReminders(cars), [cars]);
  const alerts = reminders.filter((r) => r.urgent).length;

  const headActive: HeadLink =
    overlay === "car" && sheetTab === "insurance" ? "insurance" : overlay === "car" && sheetTab === "docs" ? "docs" : tab === "service" ? "service" : "cars";

  const openSheet = (t: CarSheetTab) => {
    setSheetTab(t);
    setOverlay("car");
  };

  const onHead = (to: HeadLink) => {
    if (to === "cars") setTab("fleet");
    if (to === "service") setTab("service");
    if (to === "insurance") openSheet("insurance");
    if (to === "docs") openSheet("docs");
  };

  const openReminder = (r: Reminder) => {
    const i = cars.findIndex((c) => c.id === r.carId);
    if (i >= 0) setIndex(i);
    if (r.kind === "osago" || r.kind === "kasko") openSheet("insurance");
    else setTab("service");
  };

  const close = (v: boolean) => {
    if (v) return;
    setOverlay(null);
    setEditing(false);
  };

  const openRecord = (id: string) => setRecordId(id);

  const stateRef = useRef({ overlay, recordId });
  stateRef.current = { overlay, recordId };

  useEffect(() => {
    if ((tab !== "fleet" || overlay || recordId) && !window.history.state?.inner) {
      window.history.pushState({ ...window.history.state, inner: true }, "");
    }
  }, [tab, overlay, recordId]);

  useEffect(() => {
    const onPop = () => {
      if (stateRef.current.overlay) {
        setOverlay(null);
        setEditing(false);
      } else if (stateRef.current.recordId) setRecordId(null);
      else setTab("fleet");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="fleet-grid bg-background text-foreground text-[15px]">
      <AppHeader active={headActive} onNavigate={onHead} onAddCar={() => setOverlay("add")} onProfile={() => setOverlay("profile")} />

      {ready && tab === "fleet" && (
        <>
          <CarCarousel cars={cars} index={safeIndex} onIndexChange={setIndex} onOpenCar={() => openSheet("photos")} onAddCar={() => setOverlay("add")} />
          <CarStats car={car} onMileage={() => setOverlay("mileage")} onInsurance={() => openSheet("insurance")} onService={() => setTab("service")} />
        </>
      )}
      {ready && tab === "service" && <ServiceScreen car={car} cars={cars} onSelectCar={setIndex} onAdd={() => setOverlay("service")} onBack={() => setTab("fleet")} onOpenRecord={openRecord} />}
      {tab === "map" && <NavigatorScreen />}
      {ready && tab === "reminders" && <RemindersScreen reminders={reminders} onOpen={openReminder} onBack={() => setTab("fleet")} />}

      <BottomNav tab={tab} onChange={setTab} alerts={alerts} />

      <MileageDialog car={car} open={overlay === "mileage"} onOpenChange={close} />
      <CarSheet
        car={car}
        open={overlay === "car"}
        tab={sheetTab}
        onTabChange={setSheetTab}
        onOpenChange={close}
        onOpenRecord={(id) => {
          setOverlay(null);
          setRecordId(id);
        }}
      />
      <ServiceDetail
        car={car}
        record={record}
        onClose={() => setRecordId(null)}
        onEdit={() => {
          setEditing(true);
          setOverlay("service");
        }}
        onDelete={() => {
          if (car && recordId) updateCar(car.id, (c) => ({ services: c.services.filter((x) => x.id !== recordId) }));
          setRecordId(null);
        }}
      />
      <ServiceForm car={car} record={editing ? record : undefined} open={overlay === "service"} onOpenChange={close} onSaved={(id) => setRecordId(id)} />
      <ProfileSheet open={overlay === "profile"} onOpenChange={close} />
      <AddCarDialog
        open={overlay === "add"}
        onOpenChange={close}
        onAdded={(i) => {
          setTab("fleet");
          setIndex(i);
        }}
      />
    </div>
  );
};

const Gate = () => {
  const { user, checking } = useAuth();
  if (checking) return <div className="min-h-[100dvh] bg-background" />;
  if (!user) return <AuthScreen />;
  return (
    <FleetProvider key={user.id}>
      <FleetApp />
      <RecoveryDialog />
    </FleetProvider>
  );
};

const Index = () => (
  <AuthProvider>
    <Gate />
  </AuthProvider>
);

export default Index;
