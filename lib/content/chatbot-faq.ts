export type ChatbotFaq = {
  id: string;
  en: string;
  fil: string;
};

export const RESIDENT_CHATBOT_FAQS: ChatbotFaq[] = [
  {
    id: 'request-document',
    en: 'How do I request a document?',
    fil: 'Paano ako magre-request ng dokumento?',
  },
  {
    id: 'requirements',
    en: 'What do I need to prepare for a document request?',
    fil: 'Ano ang kailangan kong ihanda para sa document request?',
  },
  {
    id: 'track-request',
    en: 'How can I track my request?',
    fil: 'Paano ko masusubaybayan ang request ko?',
  },
  {
    id: 'cancel-request',
    en: 'Can I cancel my request?',
    fil: 'Puwede ko bang kanselahin ang request ko?',
  },
  {
    id: 'incident-report',
    en: 'How do I report an incident?',
    fil: 'Paano ako magre-report ng insidente?',
  },
];
