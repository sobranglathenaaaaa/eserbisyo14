import { NextResponse } from 'next/server';
import { localPgPool } from '@/lib/supabase/local-pg';

export async function GET() {
  try {
    const client = await localPgPool.connect();
    try {
      const [
        profiles,
        docTypes,
        requests,
        attachments,
        templates,
        generated,
        reports,
        incidentCategories,
        feedback,
        announcements,
        census,
        queue,
        reservations,
        doctorSlots,
        appointments,
        medicines,
        equipment,
        notifications,
        emailLogs,
        auditLogs,
        ocrJobs,
        doctors,
        appMeta,
      ] = await Promise.all([
        client.query('SELECT * FROM public.profiles'),
        client.query('SELECT * FROM public.document_types'),
        client.query('SELECT * FROM public.document_requests ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.document_request_attachments ORDER BY created_at ASC'),
        client.query('SELECT * FROM public.document_templates ORDER BY updated_at DESC'),
        client.query('SELECT * FROM public.generated_documents ORDER BY date_issued DESC'),
        client.query('SELECT * FROM public.incident_reports ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.incident_categories ORDER BY sort_order ASC, created_at DESC'),
        client.query('SELECT * FROM public.feedback ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.announcements ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.census_records ORDER BY updated_at DESC'),
        client.query('SELECT * FROM public.queue_entries ORDER BY created_at ASC'),
        client.query('SELECT * FROM public.reservations ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.doctor_availability_slots ORDER BY start_at ASC'),
        client.query('SELECT * FROM public.checkup_appointments ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.medicines ORDER BY updated_at DESC'),
        client.query('SELECT * FROM public.equipment ORDER BY name ASC'),
        client.query('SELECT * FROM public.notifications ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.email_logs ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.audit_logs ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.ocr_jobs ORDER BY created_at DESC'),
        client.query('SELECT * FROM public.doctors ORDER BY name ASC'),
        client.query('SELECT * FROM public.app_meta ORDER BY updated_at DESC LIMIT 1'),
      ]);

      return NextResponse.json({
        ok: true,
        data: {
          profiles: profiles.rows,
          docTypes: docTypes.rows,
          requests: requests.rows,
          attachments: attachments.rows,
          templates: templates.rows,
          generated: generated.rows,
          reports: reports.rows,
          incidentCategories: incidentCategories.rows,
          feedback: feedback.rows,
          announcements: announcements.rows,
          census: census.rows,
          queue: queue.rows,
          reservations: reservations.rows,
          doctorSlots: doctorSlots.rows,
          appointments: appointments.rows,
          medicines: medicines.rows,
          equipment: equipment.rows,
          notifications: notifications.rows,
          emailLogs: emailLogs.rows,
          auditLogs: auditLogs.rows,
          ocrJobs: ocrJobs.rows,
          doctors: doctors.rows,
          appMeta: appMeta.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Local DB error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
