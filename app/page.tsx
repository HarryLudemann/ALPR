import Scanner from "./components/Scanner";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-amber-400">
        NZ licence plate recognition
      </p>
      <h1 className="mt-3 max-w-2xl text-4xl font-light tracking-tight text-white sm:text-5xl">
        Read the plate.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-zinc-400">
        Drop a photo of a vehicle. Recognition runs on a Raspberry Pi at{" "}
        <span className="text-zinc-200">alpr.api.harryludemann.com</span>.
      </p>

      <div className="mt-10">
        <Scanner />
      </div>
    </div>
  );
}
