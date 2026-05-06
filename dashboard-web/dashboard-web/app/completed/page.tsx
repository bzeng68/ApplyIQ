"use client";
import { useEffect, useState } from "react";
import OffersTable from "@/components/OffersTable";
import { OfferData } from "@/lib/parsers";
import { fetchOffers } from "@/lib/data";

export default function CompletedPage() {
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    const data = await fetchOffers();
    setOffers(data);
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-ink">Completed Offers</h1>
      {loading ? <p className="text-muted">Loading...</p> : <OffersTable offers={offers} showCompleted onOffersChange={loadOffers} />}
    </div>
  );
}
