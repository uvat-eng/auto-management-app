import { useMemo, useState } from "react";
import AppHeader, { HeadLink } from "@/components/fleet/AppHeader";
import CarCarousel from "@/components/fleet/CarCarousel";
import CarStats from "@/components/fleet/CarStats";
import BottomNav, { Tab } from "@/components/fleet/BottomNav";
import MileageDialog from "@/components/fleet/MileageDialog";
import CarSheet, { CarSheetTab } from "@/components/fleet/CarSheet";
import ServiceScreen from "@/components/fleet/ServiceScreen";
import ServiceForm from "@/components/fleet/ServiceForm";
import RemindersScreen from "@/components/fleet/RemindersScreen";
import AddCarDialog from "@/components/fleet/AddCarDialog";
import { FleetProvider, useFleet } from "@/hooks/use-fleet";
import { Reminder, buildReminders } from "@/lib/fleet";

type Overlay = null | "mileage" | "car" | "add" | "service";

const FleetApp = () => {
  const { cars, ready } = useFleet();
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("fleet");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [sheetTab, setSheetTab] = useState<CarSheetTab>("photos");

  const safeIndex = Math.min(index, Math.max(cars.length - 1, 0));
  const car = cars[safeIndex];
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

  const close = (v: boolean) => !v && setOverlay(null);

  return (
    <div className="fleet-grid bg-background text-foreground text-[15px]">
      <AppHeader active={headActive} onNavigate={onHead} onAddCar={() => setOverlay("add")} />

      {ready && tab === "fleet" && (
        <>
          <CarCarousel cars={cars} index={safeIndex} onIndexChange={setIndex} onOpenCar={() => openSheet("photos")} onAddCar={() => setOverlay("add")} />
          <CarStats car={car} onMileage={() => setOverlay("mileage")} onInsurance={() => openSheet("insurance")} onService={() => setTab("service")} />
        </>
      )}
      {ready && tab === "service" && <ServiceScreen car={car} cars={cars} onSelectCar={setIndex} onAdd={() => setOverlay("service")} />}
      {ready && tab === "reminders" && <RemindersScreen reminders={reminders} onOpen={openReminder} />}

      <BottomNav tab={tab} onChange={setTab} alerts={alerts} />

      <MileageDialog car={car} open={overlay === "mileage"} onOpenChange={close} />
      <CarSheet car={car} open={overlay === "car"} tab={sheetTab} onTabChange={setSheetTab} onOpenChange={close} />
      <ServiceForm car={car} open={overlay === "service"} onOpenChange={close} />
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

const Index = () => (
  <FleetProvider>
    <FleetApp />
  </FleetProvider>
);

export default Index;
