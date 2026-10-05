import { useEffect, useState } from "react";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Icon from "@/components/ui/icon";
import { Car, MAX_PHOTOS } from "@/lib/fleet";

interface Props {
  cars: Car[];
  index: number;
  onIndexChange: (i: number) => void;
  onOpenCar: () => void;
  onAddCar: () => void;
}

const CarCarousel = ({ cars, index, onIndexChange, onOpenCar, onAddCar }: Props) => {
  const [api, setApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!api) return;
    const onSelect = () => onIndexChange(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onIndexChange]);

  useEffect(() => {
    if (api && api.selectedScrollSnap() !== index) api.scrollTo(index);
  }, [api, index, cars.length]);

  const car = cars[index];

  if (!cars.length) {
    return (
      <section className="[grid-area:photo] relative grid place-items-center bg-background grain overflow-hidden">
        <button onClick={onAddCar} className="flex flex-col items-center gap-4 text-muted-foreground hover:text-primary transition-colors">
          <span className="w-20 h-20 rounded-full border border-dashed border-current grid place-items-center">
            <Icon name="Plus" size={30} />
          </span>
          <span className="font-head text-xl">Добавьте первую машину</span>
        </button>
      </section>
    );
  }

  return (
    <section className="[grid-area:photo] relative overflow-hidden bg-background min-h-0">
      <Carousel setApi={setApi} opts={{ loop: false }} className="h-full [&>div]:h-full">
        <CarouselContent className="h-full ml-0">
          {cars.map((c) => (
            <CarouselItem key={c.id} className="h-full pl-0">
              <button onClick={onOpenCar} className="relative block w-full h-full photo-fade grain" aria-label="Открыть карточку автомобиля">
                {c.hero ? (
                  <img src={c.hero} alt={c.make} className="absolute inset-0 w-full h-full object-cover object-bottom" draggable={false} />
                ) : c.photos[0] ? (
                  <>
                    <img src={c.photos[0]} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-[0.35]" draggable={false} />
                    <img src={c.photos[0]} alt={c.make} className="absolute inset-0 w-full h-full object-contain pb-14" draggable={false} />
                  </>
                ) : null}
                {c.heroStatus === "pending" && (
                  <span className="absolute left-1/2 top-1/3 -translate-x-1/2 z-[3] inline-flex items-center gap-2 px-4 h-9 rounded-full bg-black/70 backdrop-blur text-sm text-gold whitespace-nowrap">
                    <Icon name="Sparkles" size={16} className="animate-pulse" />
                    Готовим студийное фото…
                  </span>
                )}
                {!c.hero && !c.photos[0] && (
                  <div className="w-full h-full grid place-items-center bg-muted text-muted-foreground">
                    <Icon name="Car" size={72} strokeWidth={1} />
                  </div>
                )}
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <span className="absolute right-6 md:right-[90px] top-[22px] z-[3] text-muted-foreground text-[0.85em] pointer-events-none">
        {car?.photos.length ?? 0} / {MAX_PHOTOS} фото
      </span>

      <div key={car?.id} className="absolute left-5 right-20 md:left-[90px] bottom-3 sm:bottom-6 z-[3] pointer-events-none animate-fade-in">
        <p className="font-head font-medium text-[1.2rem] sm:text-[1.35rem] md:text-[1.7em] leading-tight truncate">{car?.make}</p>
        <p className="text-muted-foreground text-[15px] sm:text-base mt-0.5 truncate">{car?.plate}</p>
      </div>

      <div className="absolute right-5 md:right-[90px] bottom-5 sm:bottom-[34px] z-[3] flex gap-2">
        {cars.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onIndexChange(i)}
            aria-label={`Машина ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${i === index ? "w-5 bg-foreground" : "w-2 bg-muted-foreground"}`}
          />
        ))}
      </div>
    </section>
  );
};

export default CarCarousel;