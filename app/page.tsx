import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Pillars } from "./components/Pillars";
import { HowItWorks } from "./components/HowItWorks";
import { Honesty } from "./components/Honesty";
import { AntiFeatures } from "./components/AntiFeatures";
import { Install } from "./components/Install";
import { Footer } from "./components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Pillars />
        <HowItWorks />
        <Honesty />
        <AntiFeatures />
        <Install />
      </main>
      <Footer />
    </>
  );
}
