import { getPublicAnnouncements } from '@/lib/announcements/public';
import { formatAnnouncementSchedule } from '@/lib/announcements/schedule';

export default async function PublicAnnouncements({ compact = false }: { compact?: boolean }) {
  const announcements = await getPublicAnnouncements();

  return (
    <section
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
        <span className="public-announcements__count" aria-label={`${announcements.length} current announcements`}>
          {announcements.length}
        </span>
      </div>

      {announcements.length ? (
        <div className="public-announcements__list">
          {announcements.map((announcement) => (
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