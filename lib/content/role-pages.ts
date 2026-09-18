import type { Locale } from '@/lib/types/models';

export interface LocalizedCopy {
  en: string;
  fil: string;
}

export interface PageGuideCopy {
  title: LocalizedCopy;
  summary: LocalizedCopy;
  steps: LocalizedCopy[];
  cta: {
    label: LocalizedCopy;
    href: string;
  };
}

export interface RolePageCopy {
  title: LocalizedCopy;
  description: LocalizedCopy;
  guide?: PageGuideCopy;
}

const rolePageCopy: Record<string, RolePageCopy> = {
  'admin/dashboard': {
    title: { en: 'Admin Home', fil: 'Admin Home' },
    description: {
      en: 'See requests, queues, and service health in one place.',
      fil: 'Makita ang mga kahilingan, pila, at status ng serbisyo sa iisang lugar.',
    },
  },
  'admin/document-requests': {
    title: { en: 'Approve Document Requests', fil: 'Aprubahan ang Kahilingan sa Dokumento' },
    description: {
      en: 'Check new requests and decide if they are ready.',
      fil: 'Suriin ang bagong kahilingan at magpasya kung handa na.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Review each request and choose Approve or Not approved.',
        fil: 'Suriin ang bawat kahilingan at piliin ang Aprubahan o Hindi aprubado.',
      },
      steps: [
        { en: 'Open a request row and read the details.', fil: 'Buksan ang kahilingan at basahin ang detalye.' },
        { en: 'If complete, choose Approve.', fil: 'Kung kumpleto, piliin ang Aprubahan.' },
        { en: 'If incomplete, choose Not approved and write the reason.', fil: 'Kung kulang, piliin ang Hindi aprubado at isulat ang dahilan.' },
      ],
      cta: { label: { en: 'Review requests', fil: 'Suriin ang kahilingan' }, href: '/admin/document-requests' },
    },
  },
  // Admin does not process reservations — staff handle approvals/declines.
  'admin/medicine-requests': {
    title: { en: 'Review Medicine Requests', fil: 'Suriin ang Medicine Requests' },
    description: {
      en: 'Review medicine requests and decide approval with clear reasons.',
      fil: 'Suriin ang medicine requests at magpasya ng pag-apruba na may malinaw na dahilan.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Validate medicine and quantity before approving a resident request.',
        fil: 'I-validate ang gamot at dami bago aprubahan ang request ng resident.',
      },
      steps: [
        { en: 'Open a medicine request and review details.', fil: 'Buksan ang medicine request at suriin ang detalye.' },
        { en: 'Approve valid requests with enough stock.', fil: 'Aprubahan ang valid request na may sapat na stock.' },
        { en: 'If declining, add a clear reason.', fil: 'Kung ide-decline, maglagay ng malinaw na dahilan.' },
      ],
      cta: {
        label: { en: 'Open medicine requests', fil: 'Buksan ang medicine requests' },
        href: '/admin/medicine-requests',
      },
    },
  },
  'admin/document-templates': {
    title: { en: 'Document Templates', fil: 'Mga Template ng Dokumento' },
    description: {
      en: 'Edit the wording used in documents residents request.',
      fil: 'I-edit ang mga salitang ginagamit sa dokumentong hinihingi ng resident.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Keep templates clear and easy to fill out.',
        fil: 'Panatilihing malinaw at madaling punan ang mga template.',
      },
      steps: [
        { en: 'Choose the template you want to update.', fil: 'Piliin ang template na ia-update.' },
        { en: 'Edit the text to be clear and short.', fil: 'I-edit ang text para malinaw at maiksi.' },
        { en: 'Save and review the preview.', fil: 'I-save at tingnan ang preview.' },
      ],
      cta: { label: { en: 'Open templates', fil: 'Buksan ang mga template' }, href: '/admin/document-templates' },
    },
  },
  'admin/incidents': {
    title: { en: 'Incident Reports', fil: 'Ulat ng Insidente' },
    description: {
      en: 'Review incident reports and update their status.',
      fil: 'Suriin ang mga ulat ng insidente at i-update ang status.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Check reports and keep residents informed.',
        fil: 'Suriin ang ulat at panatilihing alam ang resident.',
      },
      steps: [
        { en: 'Open a report to see the details.', fil: 'Buksan ang ulat para makita ang detalye.' },
        { en: 'Verify and add notes if needed.', fil: 'I-verify at magdagdag ng note kung kailangan.' },
        { en: 'Update the status when action is taken.', fil: 'I-update ang status kapag may aksyon na.' },
      ],
      cta: { label: { en: 'Review reports', fil: 'Suriin ang ulat' }, href: '/admin/incidents' },
    },
  },
  'admin/medicines': {
    title: { en: 'Medicine Inventory', fil: 'Imbentaryo ng Gamot' },
    description: {
      en: 'Add and update available medicines.',
      fil: 'Magdagdag at mag-update ng mga available na gamot.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Keep the list updated so staff can serve residents faster.',
        fil: 'Panatilihing updated ang listahan para mas mabilis ang serbisyo.',
      },
      steps: [
        { en: 'Search for the medicine first.', fil: 'I-search muna ang gamot.' },
        { en: 'Edit quantity and availability.', fil: 'I-edit ang dami at availability.' },
        { en: 'Save changes and confirm status.', fil: 'I-save ang pagbabago at kumpirmahin ang status.' },
      ],
      cta: { label: { en: 'Open inventory', fil: 'Buksan ang imbentaryo' }, href: '/admin/medicines' },
    },
  },
  'admin/notifications': {
    title: { en: 'System Updates', fil: 'Mga Update ng Sistema' },
    description: {
      en: 'Review alerts and system updates.',
      fil: 'Suriin ang mga alerto at update ng sistema.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Check what residents and staff are seeing.',
        fil: 'Tingnan ang mga abiso na nakikita ng resident at staff.',
      },
      steps: [
        { en: 'Open the newest alert first.', fil: 'Buksan muna ang pinakabagong alert.' },
        { en: 'Review the message content.', fil: 'Suriin ang nilalaman ng mensahe.' },
        { en: 'Follow up if action is needed.', fil: 'Kumilos kung may kailangan.' },
      ],
      cta: { label: { en: 'View updates', fil: 'Tingnan ang update' }, href: '/admin/notifications' },
    },
  },
  
  'admin/reports': {
    title: { en: 'Reports', fil: 'Mga Ulat' },
    description: {
      en: 'View service insights and export data.',
      fil: 'Tingnan ang ulat ng serbisyo at mag-export ng data.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Pick a report and use it to improve service.',
        fil: 'Pumili ng ulat at gamitin para mapahusay ang serbisyo.',
      },
      steps: [
        { en: 'Choose the report you need.', fil: 'Piliin ang ulat na kailangan.' },
        { en: 'Set the date range or filters.', fil: 'Itakda ang petsa o filter.' },
        { en: 'Export if you need to share.', fil: 'I-export kung kailangang ibahagi.' },
      ],
      cta: { label: { en: 'Open reports', fil: 'Buksan ang ulat' }, href: '/admin/reports' },
    },
  },
  'admin/announcements': {
    title: { en: 'Barangay Announcements', fil: 'Mga Anunsyo ng Barangay' },
    description: {
      en: 'Create updates for residents and staff.',
      fil: 'Gumawa ng update para sa resident at staff.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Post clear and short announcements.',
        fil: 'Mag-post ng malinaw at maiksing anunsyo.',
      },
      steps: [
        { en: 'Write the main message.', fil: 'Isulat ang pangunahing mensahe.' },
        { en: 'Add key dates or actions.', fil: 'Idagdag ang petsa o aksyon.' },
        { en: 'Publish when ready.', fil: 'I-publish kapag handa na.' },
      ],
      cta: { label: { en: 'Create announcement', fil: 'Gumawa ng anunsyo' }, href: '/admin/announcements' },
    },
  },
  'admin/users': {
    title: { en: 'User Access & Final Approval', fil: 'Access ng User at Final Approval' },
    description: {
      en: 'Manage user roles and finalize registrations forwarded by staff.',
      fil: 'Ayusin ang user roles at i-finalize ang registrations na na-review na ng staff.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Finalize only staff-forwarded registrations, then manage user access as needed.',
        fil: 'I-finalize lang ang registrations na na-forward ng staff, saka ayusin ang user access kung kailangan.',
      },
      steps: [
        { en: 'Open a record that is pending admin approval.', fil: 'Buksan ang record na pending admin approval.' },
        { en: 'Finalize approve or reject based on staff verification.', fil: 'I-finalize na approve o reject base sa staff verification.' },
        { en: 'Adjust roles/access when needed.', fil: 'Ayusin ang roles/access kung kailangan.' },
      ],
      cta: { label: { en: 'Manage users', fil: 'Ayusin ang user' }, href: '/admin/users' },
    },
  },
  'staff/dashboard': {
    title: { en: 'Staff Home', fil: 'Staff Home' },
    description: {
      en: 'See the tasks waiting for you today.',
      fil: 'Tingnan ang mga gawaing nakaabang ngayon.',
    },
  },
  'staff/incidents': {
    title: { en: 'Incident Reports', fil: 'Incident Reports' },
    description: {
      en: 'Review incident reports from residents and keep the queue moving.',
      fil: 'Suriin ang incident reports ng residents at panatilihing umaandar ang pila.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Keep the selected report in the sidebar, then open review only when you need the full decision panel.',
        fil: 'Panatilihin sa sidebar ang napiling report, saka buksan ang review kapag kailangan ang buong decision panel.',
      },
      steps: [
        { en: 'Search or select a report from the list.', fil: 'Maghanap o pumili ng report mula sa listahan.' },
        { en: 'Use the sidebar for a quick read of the details.', fil: 'Gamitin ang sidebar para sa mabilis na pagbasa ng detalye.' },
        { en: 'Open Review when you need the full detail and action panel.', fil: 'Buksan ang Review kapag kailangan ang buong detail at action panel.' },
      ],
      cta: { label: { en: 'Open incident reports', fil: 'Buksan ang incident reports' }, href: '/staff/incidents' },
    },
  },
  'staff/registration-reviews': {
    title: { en: 'Registration Reviews', fil: 'Registration Reviews' },
    description: {
      en: 'Verify newly registered residents before forwarding to admin final approval.',
      fil: 'Suriin muna ang bagong rehistro bago ipadala sa admin para sa pinal na approval.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Check identity and profile details before forwarding to admin.',
        fil: 'I-check ang identity at detalye bago i-forward sa admin.',
      },
      steps: [
        { en: 'Open a pending resident registration.', fil: 'Buksan ang pending na resident registration.' },
        { en: 'Validate details and uploaded ID reference.', fil: 'I-validate ang detalye at uploaded ID reference.' },
        { en: 'Forward to admin or reject with a clear note.', fil: 'I-forward sa admin o i-reject na may malinaw na note.' },
      ],
      cta: { label: { en: 'Open registration reviews', fil: 'Buksan ang registration reviews' }, href: '/staff/registration-reviews' },
    },
  },
  'staff/process-requests': {
    title: { en: 'Approve Requests', fil: 'Aprubahan ang Kahilingan' },
    description: {
      en: 'Move approved requests forward or mark not approved.',
      fil: 'Ipasa ang aprubadong kahilingan o markahan bilang hindi aprubado.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Process the next request in the queue.',
        fil: 'Iproseso ang susunod na kahilingan sa pila.',
      },
      steps: [
        { en: 'Open the request details.', fil: 'Buksan ang detalye ng kahilingan.' },
        { en: 'Set the status to Working on it or Done.', fil: 'Itakda ang status sa Ginagawa o Tapos na.' },
        { en: 'If not approved, add a clear reason.', fil: 'Kung hindi aprubado, maglagay ng malinaw na dahilan.' },
      ],
      cta: { label: { en: 'Open requests', fil: 'Buksan ang kahilingan' }, href: '/staff/process-requests' },
    },
  },
  'staff/equipment': {
    title: { en: 'Equipment', fil: 'Equipment' },
    description: {
      en: 'Manage equipment inventory for chair, table, and ladder reservations.',
      fil: 'Pamahalaan ang equipment inventory para sa reservations ng chairs, tables, at ladders.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Update quantities so residents always see the current available stock.',
        fil: 'I-update ang quantity para laging makita ng resident ang current stock.',
      },
      steps: [
        { en: 'Add or edit the equipment item.', fil: 'Magdagdag o mag-edit ng equipment item.' },
        { en: 'Set the available quantity.', fil: 'Itakda ang available quantity.' },
        { en: 'Archive items that should no longer be borrowed.', fil: 'I-archive ang item na hindi na dapat hiramin.' },
      ],
      cta: { label: { en: 'Open equipment', fil: 'Buksan ang equipment' }, href: '/staff/equipment' },
    },
  },
  'staff/reservations': {
    title: { en: 'Reservations', fil: 'Mga Reservation' },
    description: {
      en: 'Review resident reservation requests and manage approval decisions.',
      fil: 'Suriin ang reservation request ng resident at pamahalaan ang approval.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Inspect the reservation details and confirm the schedule before deciding.',
        fil: 'Suriin ang detalye ng reservation at tiyakin ang schedule bago magpasya.',
      },
      steps: [
        { en: 'Open a pending reservation.', fil: 'Buksan ang pending na reservation.' },
        { en: 'Check the requested resource, date, and quantity.', fil: 'I-check ang resource, petsa, at dami na hinihingi.' },
        { en: 'Approve or decline with a reason.', fil: 'Aprubahan o i-decline na may dahilan.' },
      ],
      cta: { label: { en: 'Open reservations', fil: 'Buksan ang reservations' }, href: '/staff/reservations' },
    },
  },
  'staff/ocr-issuance': {
    title: { en: 'Issuance via OCR', fil: 'Issuance via OCR' },
    description: {
      en: 'Standalone walk-in OCR issuance for Certificate of Indigency.',
      fil: 'Standalone walk-in OCR issuance para sa Certificate of Indigency.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Print the intake form, scan the returned sheet, review OCR, then issue and print.',
        fil: 'I-print ang intake form, i-scan ang ibinalik na sheet, i-review ang OCR, saka mag-issue at mag-print.',
      },
      steps: [
        { en: 'Print the dedicated indigency intake form.', fil: 'I-print ang dedicated indigency intake form.' },
        { en: 'Upload the returned handwritten form and run OCR extraction.', fil: 'I-upload ang returned handwritten form at patakbuhin ang OCR extraction.' },
        { en: 'Review fields, link resident if needed, then issue and print.', fil: 'I-review ang fields, i-link ang resident kung kailangan, saka mag-issue at mag-print.' },
      ],
      cta: { label: { en: 'Open OCR issuance', fil: 'Buksan ang OCR issuance' }, href: '/staff/ocr-issuance' },
    },
  },
  'staff/medicine-requests': {
    title: { en: 'Process Medicine Requests', fil: 'Iproseso ang Medicine Requests' },
    description: {
      en: 'Move approved medicine requests through processing until completion.',
      fil: 'Ilipat ang approved medicine requests sa processing hanggang completion.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Handle approved requests first, then complete fulfilled medicines.',
        fil: 'Unahin ang approved requests, saka i-complete ang na-fulfill na gamot.',
      },
      steps: [
        { en: 'Pick an approved request from the lane.', fil: 'Pumili ng approved request sa lane.' },
        { en: 'Move it to processing while preparing medicine.', fil: 'Ilipat sa processing habang inihahanda ang gamot.' },
        { en: 'Mark completed or decline with reason.', fil: 'I-mark bilang completed o i-decline na may dahilan.' },
      ],
      cta: {
        label: { en: 'Open medicine lanes', fil: 'Buksan ang medicine lanes' },
        href: '/staff/medicine-requests',
      },
    },
  },
  'staff/medicines': {
    title: { en: 'Medicine Inventory', fil: 'Imbentaryo ng Gamot' },
    description: {
      en: 'Update stock and availability.',
      fil: 'I-update ang stock at availability.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Keep the list accurate so residents are served faster.',
        fil: 'Panatilihing tama ang listahan para mas mabilis ang serbisyo.',
      },
      steps: [
        { en: 'Search for the medicine.', fil: 'I-search ang gamot.' },
        { en: 'Edit stock and availability.', fil: 'I-edit ang stock at availability.' },
        { en: 'Save your changes.', fil: 'I-save ang pagbabago.' },
      ],
      cta: { label: { en: 'Open inventory', fil: 'Buksan ang imbentaryo' }, href: '/staff/medicines' },
    },
  },
  'staff/notifications': {
    title: { en: 'Updates', fil: 'Mga Update' },
    description: {
      en: 'Read operational alerts and reminders.',
      fil: 'Basahin ang mga alert at paalala sa operasyon.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Check the newest updates first.',
        fil: 'Tingnan muna ang pinakabagong update.',
      },
      steps: [
        { en: 'Open the latest update.', fil: 'Buksan ang huling update.' },
        { en: 'Follow any required action.', fil: 'Gawin ang kailangang aksyon.' },
        { en: 'Keep this page open during shifts.', fil: 'Iwanang bukas ang pahinang ito habang naka-duty.' },
      ],
      cta: { label: { en: 'View updates', fil: 'Tingnan ang update' }, href: '/staff/notifications' },
    },
  },
  'resident/dashboard': {
    title: { en: 'Welcome back', fil: 'Maligayang pagbabalik' },
    description: {
      en: '',
      fil: '',

    },
  },
  'resident/document-requests': {
    title: { en: 'Get Documents', fil: 'Kumuha ng Dokumento' },
    description: {
      en: 'Send a request and track its progress.',
      fil: 'Magpadala ng kahilingan at subaybayan ang progreso.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Choose a document type and submit the form.',
        fil: 'Pumili ng uri ng dokumento at isumite ang form.',
      },
      steps: [
        { en: 'Pick the document you need.', fil: 'Piliin ang dokumentong kailangan.' },
        { en: 'Fill in the required details.', fil: 'Punan ang kailangang detalye.' },
        { en: 'Submit and wait for updates.', fil: 'I-submit at maghintay ng update.' },
      ],
      cta: { label: { en: 'Start a request', fil: 'Magsimula ng kahilingan' }, href: '/resident/document-requests' },
    },
  },
  'resident/notifications': {
    title: { en: 'Updates', fil: 'Mga Update' },
    description: {
      en: 'See alerts about your requests.',
      fil: 'Tingnan ang mga update tungkol sa kahilingan mo.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Open a message to see what changed.',
        fil: 'Buksan ang mensahe para makita ang pagbabago.',
      },
      steps: [
        { en: 'Read the newest update first.', fil: 'Basahin muna ang pinakabagong update.' },
        { en: 'Follow any action required.', fil: 'Gawin ang kailangang aksyon.' },
        { en: 'Come back for more updates.', fil: 'Bumalik para sa bagong update.' },
      ],
      cta: { label: { en: 'View updates', fil: 'Tingnan ang update' }, href: '/resident/notifications' },
    },
  },
  'resident/medicines': {
    title: { en: 'Book an Appointment', fil: 'Mag-book ng Appointment' },
    description: {
      en: 'Book a check-up appointment based on available doctor schedules.',
      fil: 'Mag-book ng check-up appointment batay sa available na schedule ng doktor.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Choose an open slot and submit your check-up reason.',
        fil: 'Pumili ng open slot at ilagay ang dahilan ng check-up.',
      },
      steps: [
        { en: 'Select an available doctor schedule.', fil: 'Pumili ng available na schedule ng doktor.' },
        { en: 'Enter your check-up reason.', fil: 'Ilagay ang dahilan ng iyong check-up.' },
        { en: 'Book and monitor your appointment status.', fil: 'I-book at subaybayan ang status ng appointment.' },
      ],
      cta: { label: { en: 'Book now', fil: 'Mag-book ngayon' }, href: '/resident/medicines' },
    },
  },
  'resident/blotter-reporting': {
    title: { en: 'Report an Incident', fil: 'Mag-ulat ng Insidente' },
    description: {
      en: 'Send a report to the barangay.',
      fil: 'Magpadala ng ulat sa barangay.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Share clear details so it can be acted on quickly.',
        fil: 'Magbigay ng malinaw na detalye para mabilis na aksyon.',
      },
      steps: [
        { en: 'Describe what happened.', fil: 'Ilarawan ang nangyari.' },
        { en: 'Add the date and location.', fil: 'Idagdag ang petsa at lugar.' },
        { en: 'Submit and wait for updates.', fil: 'I-submit at maghintay ng update.' },
      ],
      cta: { label: { en: 'Submit report', fil: 'Isumite ang ulat' }, href: '/resident/blotter-reporting' },
    },
  },
  'resident/my-profile': {
    title: { en: 'My Profile', fil: 'Aking Profile' },
    description: {
      en: 'Update your personal information anytime.',
      fil: 'I-update ang iyong personal na impormasyon anumang oras.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Review your personal details and save any changes.',
        fil: 'Suriin ang personal na detalye at i-save ang anumang pagbabago.',
      },
      steps: [
        { en: 'Check your personal details.', fil: 'Tingnan ang iyong personal na detalye.' },
        { en: 'Edit fields that changed.', fil: 'I-edit ang mga field na nabago.' },
        { en: 'Save your profile updates.', fil: 'I-save ang mga update sa profile.' },
      ],
      cta: { label: { en: 'Edit my profile', fil: 'I-edit ang aking profile' }, href: '/resident/my-profile' },
    },
  },
  'resident/census': {
    title: { en: 'Household and Census', fil: 'Sambahayan at Census' },
    description: {
      en: 'Keep your household and census details up to date.',
      fil: 'Panatilihing updated ang detalye ng sambahayan at census.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Update household-related records used for barangay planning.',
        fil: 'I-update ang household records na ginagamit sa barangay planning.',
      },
      steps: [
        { en: 'Check current household details.', fil: 'Tingnan ang kasalukuyang detalye ng sambahayan.' },
        { en: 'Update fields that changed.', fil: 'I-update ang mga field na nabago.' },
        { en: 'Save to keep records accurate.', fil: 'I-save para manatiling tama ang records.' },
      ],
      cta: { label: { en: 'Update household details', fil: 'I-update ang detalye ng sambahayan' }, href: '/resident/census' },
    },
  },
  'resident/digital-id': {
    title: { en: 'My Digital ID', fil: 'Aking Digital ID' },
    description: {
      en: 'View your ID and keep it ready.',
      fil: 'Tingnan ang iyong ID at ihanda ito.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Use this ID when asked by barangay staff.',
        fil: 'Gamitin ang ID na ito kapag hiniling ng staff.',
      },
      steps: [
        { en: 'Open your digital ID card.', fil: 'Buksan ang iyong digital ID.' },
        { en: 'Check if details are correct.', fil: 'Tiyaking tama ang detalye.' },
        { en: 'Show it when needed.', fil: 'Ipakita kapag kailangan.' },
      ],
      cta: { label: { en: 'Open my ID', fil: 'Buksan ang ID' }, href: '/resident/digital-id' },
    },
  },
  'resident/ocr': {
    title: { en: 'Scan Document', fil: 'I-scan ang Dokumento' },
    description: {
      en: 'Scan text from an image.',
      fil: 'I-scan ang text mula sa larawan.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Upload a clear photo for best results.',
        fil: 'Mag-upload ng malinaw na larawan para sa magandang resulta.',
      },
      steps: [
        { en: 'Upload or take a photo.', fil: 'Mag-upload o kumuha ng larawan.' },
        { en: 'Review the scanned text.', fil: 'Suriin ang na-scan na text.' },
        { en: 'Copy or save the result.', fil: 'Kopyahin o i-save ang resulta.' },
      ],
      cta: { label: { en: 'Start scan', fil: 'Simulan ang scan' }, href: '/resident/ocr' },
    },
  },
  'resident/chatbot': {
    title: { en: 'Service Assistant', fil: 'Service Assistant' },
    description: {
      en: 'Ask guided questions before filing an official request.',
      fil: 'Magtanong muna bago magsumite ng opisyal na kahilingan.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Use the assistant for guidance, then continue with the correct formal service flow.',
        fil: 'Gamitin ang assistant para sa gabay, tapos ituloy sa tamang pormal na service flow.',
      },
      steps: [
        { en: 'Ask what service or document you need.', fil: 'Itanong kung anong serbisyo o dokumento ang kailangan mo.' },
        { en: 'Review the guidance and next steps.', fil: 'Suriin ang gabay at susunod na hakbang.' },
        { en: 'Submit a formal request or report when ready.', fil: 'Magsumite ng pormal na request o report kapag handa na.' },
      ],
      cta: { label: { en: 'Open requests', fil: 'Buksan ang requests' }, href: '/resident/document-requests' },
    },
  },
  'resident/request-feedback': {
    title: { en: 'Give Feedback', fil: 'Magbigay ng Feedback' },
    description: {
      en: 'Share how your request went.',
      fil: 'Ibahagi ang karanasan mo sa kahilingan.',
    },
    guide: {
      title: { en: 'Start here', fil: 'Simula dito' },
      summary: {
        en: 'Your feedback helps improve services.',
        fil: 'Nakakatulong ang feedback para mapabuti ang serbisyo.',
      },
      steps: [
        { en: 'Choose the request to rate.', fil: 'Piliin ang kahilingan na ire-rate.' },
        { en: 'Add a short comment.', fil: 'Magdagdag ng maikling komento.' },
        { en: 'Submit your feedback.', fil: 'Isumite ang feedback.' },
      ],
      cta: { label: { en: 'Leave feedback', fil: 'Magbigay ng feedback' }, href: '/resident/request-feedback' },
    },
  },
};

export function getRolePageCopy(key: string): RolePageCopy {
  return rolePageCopy[key];
}

export function resolveRoleCopy(locale: Locale, value: string | LocalizedCopy) {
  if (typeof value === 'string') return value;
  return locale === 'fil' ? value.fil : value.en;
}

export function resolveSteps(locale: Locale, steps: LocalizedCopy[]) {
  return steps.map((step) => resolveRoleCopy(locale, step));
}
