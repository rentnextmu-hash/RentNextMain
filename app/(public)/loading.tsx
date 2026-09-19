import { CarLoader } from "@/components/public/CarLoader";

export default function PublicLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-primary">
      <CarLoader size="md" />
    </div>
  );
}
