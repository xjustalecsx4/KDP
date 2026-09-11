import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { safeEventMessage } from "@/services/events";
import { SectionTitle, Empty, date } from "../ui";
import { AccountControls } from "../account-controls";
export async function AccountSection() {
  const { user, session } = await requireAdmin();
  const [sessions, events] = await Promise.all([
    db.session.count({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    }),
    db.systemEvent.findMany({
      where: { source: "auth", actorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  return (
    <div className="overview-grid">
      <section className="panel">
        <SectionTitle
          title="Administrator account"
          description="This private workspace currently supports one administrator."
        />
        <dl className="key-values">
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Active sessions</dt>
            <dd>{sessions}</dd>
          </div>
          <div>
            <dt>Current session created</dt>
            <dd>{date(session.createdAt)}</dd>
          </div>
        </dl>
        <AccountControls />
      </section>
      <section className="panel">
        <SectionTitle title="Recent authentication activity" />
        {events.length === 0 ? (
          <Empty
            title="No recorded authentication activity"
            description="New successful sessions will appear here."
          />
        ) : (
          events.map((e) => (
            <div className="auth-event" key={e.id}>
              <p>{safeEventMessage(e.message)}</p>
              <small>{date(e.createdAt)}</small>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
