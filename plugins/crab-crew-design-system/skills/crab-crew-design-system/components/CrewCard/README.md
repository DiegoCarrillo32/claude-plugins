# CrewCard

One crab at work: it walks its lane in costume, with its name, role, elapsed time, what it was asked to do, what it is doing now, and a facts line. The frame is drawn in the crab's own colour.

**Use it** for things that are running right now. Finished and waiting things use CrewRow.

**You provide** `look`, `costume` (defaults to the look's), `role` (defaults to "the engineer" and so on), `elapsed`, `description` (the task, as given), `activity` (the latest step, from the tool call: "Editing store.ts", "Searching for getToken("), and `facts` (model and effort, tasks, context, cost, time left).

Keep the description to one line; it truncates. Facts follow the order the source uses: model · effort, progress, context, cost, time left.
