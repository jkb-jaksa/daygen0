import Pricing from "./Pricing";
import { layout } from "../styles/designSystem";

export default function Upgrade() {
  return (
    <main className={`${layout.page} bg-d-black`}> 
      <section className={`${layout.container} pt-[calc(var(--nav-h)+2.5rem)] pb-24`}> 
        <Pricing />
      </section>
    </main>
  );
}
