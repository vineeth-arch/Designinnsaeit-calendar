import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import SummaryComposerView from "~/settings/integrations-automations/summary-composer-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("summary_composer_title"),
    (t) => t("summary_composer_subtitle"),
    undefined,
    undefined,
    "/settings/integrations-automations/summary"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/login");

  const bookings = await prisma.booking.findMany({
    where: { userId, status: BookingStatus.ACCEPTED, endTime: { lt: new Date() } },
    orderBy: { endTime: "desc" },
    take: 30,
    select: { uid: true, startTime: true, attendees: { select: { name: true }, take: 1 } },
  });

  return (
    <SummaryComposerView
      bookings={bookings
        .filter((b) => b.attendees[0])
        .map((b) => ({
          uid: b.uid,
          label: `${b.attendees[0].name}, ${b.startTime.toISOString().slice(0, 10)}`,
        }))}
      defaultBookingLink={session?.user?.username ? `${WEBAPP_URL}/${session.user.username}` : WEBAPP_URL}
    />
  );
};

export default Page;
