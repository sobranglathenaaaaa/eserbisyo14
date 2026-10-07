import { getPublicAnnouncements } from '@/lib/announcements/public';
import { formatAnnouncementSchedule } from '@/lib/announcements/schedule';

export default async function PublicAnnouncements({ compact = false, limit = 3 }: { compact?: boolean; limit?: number }) {
  const announcements = await getPublicAnnouncements();
  const visibleAnnouncements = announcements.slice(0, limit);

  return (
    <section
      id="announcements"
      className={`public-announcements${compact ? ' public-announcements--compact' : ''}`}
      aria-labelledby={compact ? 'public-announcements-compact-title' : 'public-announcements-title'}
    >
      <div className="public-announcements__header">
        <div>
          <p className="landing-eyebrow">Barangay bulletin</p>
          <h2 id={compact ? 'public-announcements-compact-title' : 'public-announcements-title'}>
            Current announcements
          </h2>
        </div>
        <span className="public-announcements__count" aria-label={`${visibleAnnouncements.length} current announcements`}>
          {visibleAnnouncements.length}
        </span>
      </div>

      {visibleAnnouncements.length ? (
        <div className="public-announcements__list">
          {visibleAnnouncements.map((announcement) => (
            <article key={announcement.id} className="public-announcements__item">
              <div>
                <h3>{announcement.title}</h3>
                <p>{announcement.body}</p>
              </div>
              <time dateTime={announcement.startAt ?? announcement.createdAt}>
                Schedule: {formatAnnouncementSchedule(announcement, 'en')}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <p className="public-announcements__empty">No current announcements.</p>
      )}
    </section>
  );
}