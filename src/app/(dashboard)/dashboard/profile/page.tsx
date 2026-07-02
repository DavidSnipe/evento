import { redirect } from "next/navigation";

import { getMyProfile } from "@/app/(dashboard)/dashboard/profile/actions";
import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { DashboardPage } from "@/components/layout/animated-page";
import { PageHeader } from "@/components/nuntiki/page-header";
import { ro } from "@/lib/i18n/ro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: ro.profile.title,
};

export default async function ProfilePage() {
  const data = await getMyProfile();

  if (!data) {
    redirect("/login");
  }

  return (
    <DashboardPage
      header={
        <PageHeader title={ro.profile.title} description={ro.profile.description} />
      }
    >
      <ProfilePageContent user={data.user} profile={data.profile} />
    </DashboardPage>
  );
}
