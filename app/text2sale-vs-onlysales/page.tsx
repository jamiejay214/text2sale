import ComparisonPage, { comparisonMetadata } from "@/components/ComparisonPage";
import { getCompetitor } from "@/lib/competitors";

const competitor = getCompetitor("onlysales");

export const metadata = comparisonMetadata(competitor);

export default function Page() {
  return <ComparisonPage competitor={competitor} />;
}
