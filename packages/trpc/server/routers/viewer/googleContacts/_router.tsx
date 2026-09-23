import authedProcedure from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";

export const googleContactsRouter = router({
  list: authedProcedure.query(async ({ ctx }) => {
    const { listHandler } = await import("./list.handler");
    return listHandler({ ctx });
  }),
});
