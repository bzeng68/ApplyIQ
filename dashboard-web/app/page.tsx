import OffersTable from '../components/OffersTable';

export default function PendingPage() {
  return <OffersTable mode="pending" minScore={3.0} />;
}
