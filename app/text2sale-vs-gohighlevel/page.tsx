import ComparisonPage, { comparisonMetadata } from "@/components/ComparisonPage";
import { getCompetitor } from "@/lib/competitors";

const competitor = getCompetitor("gohighlevel");

export const metadata = comparisonMetadata(competitor);

export default function Page() {
  return <ComparisonPage competitor={competitor} />;
}
