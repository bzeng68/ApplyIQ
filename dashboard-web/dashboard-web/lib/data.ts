import { OfferData } from "./parsers";

export async function fetchOffers(): Promise<OfferData[]> {
  const res = await fetch("/api/offers");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchReport(reportNum: string): Promise<string> {
  const res = await fetch(`/api/reports/${reportNum}`);
  if (!res.ok) return "";
  return res.text();
}

export async function fetchJD(id: number): Promise<string> {
  const res = await fetch(`/api/jds/${id}`);
  if (!res.ok) return "";
  return res.text();
}

export async function toggleDone(id: number, done: boolean): Promise<void> {
  await fetch(`/api/offers/${id}/done`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
}
