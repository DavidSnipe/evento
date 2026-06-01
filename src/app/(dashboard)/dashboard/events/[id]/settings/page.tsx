import { redirect } from "next/navigation";

type SettingsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EventSettingsPage({ params }: SettingsPageProps) {
  const { id } = await params;
  redirect(`/dashboard/events/${id}/settings/calendar`);
}
