export interface Reader {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface Mass {
  id: number;
  date: string;
  time: string;
  type: string;
  firstReading?: string;
  psalm?: string;
  secondReading?: string;
  gospel?: string;
  firstReaderId?: number;
  secondReaderId?: number;
  psalmReaderId?: number;
}

export const stubReaders: Reader[] = [
  { id: 1, name: 'María González', email: 'maria@example.com', phone: '555-0101' },
  { id: 2, name: 'Juan Pérez', email: 'juan@example.com', phone: '555-0102' },
  { id: 3, name: 'Ana Martínez', email: 'ana@example.com', phone: '555-0103' },
  { id: 4, name: 'Carlos Rodríguez', email: 'carlos@example.com', phone: '555-0104' },
  { id: 5, name: 'Isabel López', email: 'isabel@example.com', phone: '555-0105' },
  { id: 6, name: 'Pedro Sánchez', email: 'pedro@example.com', phone: '555-0106' },
];

export const stubMasses: Mass[] = [
  {
    id: 1,
    date: '2025-01-12',
    time: '10:00',
    type: 'Domingo',
    firstReading: 'Isaías 42:1-4, 6-7',
    psalm: 'Salmo 28',
    secondReading: 'Hechos 10:34-38',
    gospel: 'Mateo 3:13-17',
    firstReaderId: 1,
    secondReaderId: 2,
    psalmReaderId: 3,
  },
  {
    id: 2,
    date: '2025-01-12',
    time: '12:00',
    type: 'Domingo',
    firstReading: 'Isaías 42:1-4, 6-7',
    psalm: 'Salmo 28',
    secondReading: 'Hechos 10:34-38',
    gospel: 'Mateo 3:13-17',
    firstReaderId: 4,
    secondReaderId: 5,
  },
  {
    id: 3,
    date: '2025-01-12',
    time: '19:00',
    type: 'Domingo',
    firstReading: 'Isaías 42:1-4, 6-7',
    psalm: 'Salmo 28',
    secondReading: 'Hechos 10:34-38',
    gospel: 'Mateo 3:13-17',
    firstReaderId: 6,
    psalmReaderId: 1,
  },
  {
    id: 4,
    date: '2025-01-19',
    time: '10:00',
    type: 'Domingo',
    firstReading: 'Isaías 49:3, 5-6',
    psalm: 'Salmo 39',
    secondReading: '1 Corintios 1:1-3',
    gospel: 'Juan 1:29-34',
    firstReaderId: 2,
    secondReaderId: 3,
    psalmReaderId: 4,
  },
  {
    id: 5,
    date: '2025-01-19',
    time: '12:00',
    type: 'Domingo',
    firstReading: 'Isaías 49:3, 5-6',
    psalm: 'Salmo 39',
    secondReading: '1 Corintios 1:1-3',
    gospel: 'Juan 1:29-34',
  },
  {
    id: 6,
    date: '2025-01-19',
    time: '19:00',
    type: 'Domingo',
    firstReading: 'Isaías 49:3, 5-6',
    psalm: 'Salmo 39',
    secondReading: '1 Corintios 1:1-3',
    gospel: 'Juan 1:29-34',
    firstReaderId: 5,
    secondReaderId: 6,
  },
];
