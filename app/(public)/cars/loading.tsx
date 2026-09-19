import { CarLoader } from "@/components/public/CarLoader";

export default function CarsLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-primary">
      <CarLoader size="md" />
    </div>
  );
}
