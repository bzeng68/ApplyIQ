import OffersTable from '../../components/OffersTable';

export default function SkippedPage() {
  return <OffersTable mode="skipped" minScore={0} maxScore={3.0} />;
}
