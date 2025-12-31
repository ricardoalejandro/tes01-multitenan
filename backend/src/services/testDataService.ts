import { db } from '../db';
import { students, studentBranches, courses, courseThemes, instructors, branches } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// ============================================
// DATOS REALISTAS PERUANOS
// ============================================

const PERUVIAN_FIRST_NAMES_MALE = [
  'José', 'Juan', 'Carlos', 'Luis', 'Miguel', 'Jorge', 'Pedro', 'Fernando', 'Ricardo', 'Manuel',
  'Eduardo', 'Daniel', 'Roberto', 'Enrique', 'Francisco', 'César', 'Óscar', 'Andrés', 'Víctor', 'Mario',
  'Alberto', 'Alejandro', 'Antonio', 'Diego', 'Raúl', 'Javier', 'Gustavo', 'Sergio', 'Pablo', 'Martín',
  'Héctor', 'Alfredo', 'Julio', 'Ernesto', 'Jaime', 'Rafael', 'Gabriel', 'Marco', 'Christian', 'Hugo',
  'Walter', 'Gonzalo', 'Arturo', 'Rubén', 'Iván', 'Percy', 'Edwin', 'Segundo', 'Wilmer', 'Santos'
];

const PERUVIAN_FIRST_NAMES_FEMALE = [
  'María', 'Ana', 'Rosa', 'Luz', 'Carmen', 'Julia', 'Patricia', 'Elizabeth', 'Lucía', 'Claudia',
  'Teresa', 'Mónica', 'Silvia', 'Gabriela', 'Sandra', 'Laura', 'Diana', 'Carla', 'Verónica', 'Angela',
  'Rocío', 'Milagros', 'Pilar', 'Margarita', 'Isabel', 'Gloria', 'Susana', 'Yolanda', 'Flor', 'Norma',
  'Mercedes', 'Adriana', 'Cecilia', 'Beatriz', 'Rosario', 'Victoria', 'Elena', 'Paola', 'Natalia', 'Vanessa',
  'Jessica', 'Katherine', 'Stephanie', 'Lucero', 'Fiorella', 'Marisol', 'Jackeline', 'Esther', 'Ruth', 'Olga'
];

const PERUVIAN_PATERNAL_LAST_NAMES = [
  'García', 'Rodríguez', 'López', 'Martínez', 'González', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera',
  'Fernández', 'Díaz', 'Hernández', 'Morales', 'Castillo', 'Vásquez', 'Reyes', 'Rojas', 'Cruz', 'Mendoza',
  'Pérez', 'Jiménez', 'Vargas', 'Gutiérrez', 'Castro', 'Chávez', 'Quispe', 'Huamán', 'Paredes', 'Espinoza',
  'Salazar', 'Medina', 'Villanueva', 'Campos', 'Delgado', 'Ramos', 'Ortiz', 'Silva', 'Ruiz', 'Carrillo',
  'Vera', 'Herrera', 'Aguilar', 'Miranda', 'Palacios', 'Cáceres', 'Aliaga', 'Valverde', 'Zárate', 'Mamani'
];

const PERUVIAN_MATERNAL_LAST_NAMES = [
  'Núñez', 'Céspedes', 'Villena', 'Araujo', 'Ledesma', 'Córdova', 'Montoya', 'Zavala', 'Benites', 'Tello',
  'Mori', 'León', 'Arias', 'Portillo', 'Maldonado', 'Aquino', 'Jaramillo', 'Soto', 'Cueva', 'Valencia',
  'Figueroa', 'Pacheco', 'Vega', 'Llanos', 'Rosales', 'Pizarro', 'Huanca', 'Condori', 'Apaza', 'Calderón',
  'Carrasco', 'Santillán', 'Ñaupari', 'Zavaleta', 'Bravo', 'Romero', 'Solano', 'Tapia', 'Ponce', 'Rivas',
  'Mejía', 'Cabrera', 'Polo', 'Gamboa', 'Lozano', 'Alvarado', 'Peralta', 'Yupanqui', 'Linares', 'Durand'
];

const PERUVIAN_DEPARTMENTS = [
  'Lima', 'Arequipa', 'Cusco', 'La Libertad', 'Piura', 'Lambayeque', 'Junín', 'Ancash', 'Ica', 'Cajamarca',
  'Puno', 'Loreto', 'Tacna', 'Ayacucho', 'Huánuco', 'San Martín', 'Ucayali', 'Moquegua', 'Tumbes', 'Apurímac'
];

const COURSE_NAMES = [
  'Introducción a la Filosofía',
  'Lógica y Argumentación',
  'Ética y Valores',
  'Historia de la Filosofía',
  'Filosofía Política',
  'Epistemología',
  'Metafísica',
  'Antropología Filosófica',
  'Filosofía de la Mente',
  'Estética y Arte',
  'Filosofía del Lenguaje',
  'Filosofía de la Ciencia',
  'Hermenéutica',
  'Fenomenología',
  'Existencialismo'
];

const COURSE_DESCRIPTIONS: Record<string, string> = {
  'Introducción a la Filosofía': 'Curso básico que introduce los conceptos fundamentales del pensamiento filosófico occidental.',
  'Lógica y Argumentación': 'Desarrollo de habilidades para el razonamiento válido y la construcción de argumentos sólidos.',
  'Ética y Valores': 'Exploración de las teorías éticas y su aplicación en la toma de decisiones morales.',
  'Historia de la Filosofía': 'Recorrido histórico por las principales corrientes filosóficas desde la antigüedad.',
  'Filosofía Política': 'Análisis de los fundamentos filosóficos del poder, el Estado y la justicia.',
  'Epistemología': 'Estudio de la naturaleza, origen y límites del conocimiento humano.',
  'Metafísica': 'Investigación de los principios fundamentales de la realidad y el ser.',
  'Antropología Filosófica': 'Reflexión filosófica sobre la naturaleza y condición humana.',
  'Filosofía de la Mente': 'Exploración de la relación entre la mente, el cerebro y la conciencia.',
  'Estética y Arte': 'Análisis filosófico de la belleza, el arte y la experiencia estética.',
  'Filosofía del Lenguaje': 'Estudio de la naturaleza del lenguaje y su relación con el pensamiento.',
  'Filosofía de la Ciencia': 'Examen crítico de los métodos y fundamentos del conocimiento científico.',
  'Hermenéutica': 'Teoría y práctica de la interpretación de textos y fenómenos culturales.',
  'Fenomenología': 'Método filosófico para el estudio de las estructuras de la experiencia consciente.',
  'Existencialismo': 'Corriente filosófica centrada en la existencia humana, la libertad y la responsabilidad.'
};

// Temas por curso (15-20 temas cada uno)
const COURSE_TOPICS: Record<string, string[]> = {
  'Introducción a la Filosofía': [
    '¿Qué es la filosofía?', 'El asombro como origen del filosofar', 'Las preguntas fundamentales',
    'La filosofía y otras disciplinas', 'El método filosófico', 'La argumentación filosófica',
    'Los presocráticos', 'Sócrates y el método mayéutico', 'Platón y el mundo de las ideas',
    'Aristóteles y la lógica', 'El helenismo', 'La filosofía medieval', 'El renacimiento filosófico',
    'La filosofía moderna', 'La ilustración', 'La filosofía contemporánea', 'Problemas actuales de la filosofía'
  ],
  'Lógica y Argumentación': [
    'Introducción a la lógica', 'Proposiciones y enunciados', 'Conectivas lógicas', 'Tablas de verdad',
    'Argumentos válidos e inválidos', 'Falacias formales', 'Falacias informales', 'Silogismos categóricos',
    'Lógica proposicional', 'Cuantificadores', 'Lógica de predicados', 'Demostración y prueba',
    'Paradojas lógicas', 'Lógica modal', 'Argumentación retórica', 'Análisis de argumentos cotidianos',
    'Pensamiento crítico', 'Toma de decisiones racionales'
  ],
  'Ética y Valores': [
    '¿Qué es la ética?', 'Moral y ética: diferencias', 'El bien y el mal', 'La virtud en Aristóteles',
    'El utilitarismo de Bentham y Mill', 'La ética kantiana', 'El imperativo categórico', 'Ética de las consecuencias',
    'Ética deontológica', 'El relativismo moral', 'El objetivismo moral', 'Dilemas éticos',
    'Ética aplicada', 'Bioética', 'Ética ambiental', 'Ética profesional', 'Los derechos humanos',
    'Justicia y equidad', 'Responsabilidad moral'
  ],
  'Historia de la Filosofía': [
    'Los orígenes del pensamiento filosófico', 'Tales y la escuela de Mileto', 'Heráclito y Parménides',
    'Los sofistas', 'Sócrates', 'Platón', 'Aristóteles', 'Epicureísmo y estoicismo',
    'Filosofía medieval: Agustín y Tomás de Aquino', 'El nominalismo', 'El humanismo renacentista',
    'Descartes y el racionalismo', 'El empirismo británico', 'Kant y la crítica de la razón',
    'El idealismo alemán', 'Marx y el materialismo histórico', 'Nietzsche', 'La fenomenología',
    'El existencialismo', 'Filosofía analítica y continental'
  ],
  'Filosofía Política': [
    'La polis griega', 'Platón: La República', 'Aristóteles: La Política', 'El contractualismo',
    'Hobbes y el Leviatán', 'Locke y los derechos naturales', 'Rousseau y el contrato social',
    'Montesquieu y la separación de poderes', 'El liberalismo clásico', 'El conservadurismo',
    'El socialismo', 'El anarquismo', 'La democracia', 'El totalitarismo', 'Rawls y la justicia',
    'Nozick y el libertarismo', 'Comunitarismo', 'Feminismo político', 'Multiculturalismo'
  ],
  'Epistemología': [
    '¿Qué es el conocimiento?', 'Creencia, verdad y justificación', 'El problema de Gettier',
    'Fuentes del conocimiento', 'Racionalismo vs empirismo', 'El escepticismo', 'El problema de la inducción',
    'La justificación epistémica', 'Fundacionalismo', 'Coherentismo', 'Fiabilismo',
    'Conocimiento a priori y a posteriori', 'Necesidad y contingencia', 'El naturalismo epistemológico',
    'Epistemología social', 'El relativismo epistémico', 'Virtudes epistémicas'
  ],
  'Metafísica': [
    '¿Qué es la metafísica?', 'El ser y la nada', 'Sustancia y accidente', 'Universales y particulares',
    'El problema de los universales', 'Identidad personal', 'Libre albedrío y determinismo',
    'Causalidad', 'Tiempo y espacio', 'Mundos posibles', 'Realismo y antirrealismo',
    'Materialismo', 'Dualismo', 'Idealismo', 'El problema mente-cuerpo', 'La existencia de Dios',
    'El problema del mal', 'Metafísica modal'
  ],
  'Antropología Filosófica': [
    '¿Qué es el ser humano?', 'Naturaleza y cultura', 'El cuerpo y el alma', 'La conciencia',
    'La libertad humana', 'La finitud y la muerte', 'El sentido de la vida', 'La persona',
    'Alteridad y reconocimiento', 'El lenguaje y el pensamiento', 'Trabajo y técnica',
    'El ser humano como ser social', 'Sexualidad y género', 'Las emociones', 'La creatividad',
    'El sufrimiento', 'La esperanza', 'Dignidad humana'
  ],
  'Filosofía de la Mente': [
    'El problema mente-cuerpo', 'Dualismo cartesiano', 'Materialismo', 'Funcionalismo',
    'Conductismo', 'La teoría de la identidad', 'El eliminativismo', 'La intencionalidad',
    'Los qualia', 'El argumento del zombi', 'La conciencia', 'El problema difícil de la conciencia',
    'Libre albedrío', 'La percepción', 'La memoria', 'Las emociones', 'Inteligencia artificial',
    'Mentes animales', 'Filosofía de la psicología'
  ],
  'Estética y Arte': [
    '¿Qué es la estética?', 'La belleza', 'Lo sublime', 'El gusto', 'La experiencia estética',
    'Platón y el arte', 'Aristóteles y la poética', 'Kant y el juicio estético', 'Hegel y el arte',
    'El arte por el arte', 'Expresionismo', '¿Qué es el arte?', 'Arte y representación',
    'Arte y emoción', 'El valor del arte', 'Arte y moralidad', 'Arte contemporáneo',
    'Estética de lo cotidiano', 'Arte y tecnología'
  ],
  'Filosofía del Lenguaje': [
    'El lenguaje como problema filosófico', 'Significado y referencia', 'Frege: sentido y referencia',
    'Russell y las descripciones definidas', 'El Tractatus de Wittgenstein', 'El giro lingüístico',
    'Los actos de habla', 'Pragmática', 'El significado como uso', 'Nombres propios y designación rígida',
    'Mundos posibles y semántica', 'La indeterminación de la traducción', 'Holismo semántico',
    'Metáfora y lenguaje figurado', 'Lenguaje y pensamiento', 'Relativismo lingüístico',
    'Lenguaje y poder', 'El análisis del discurso'
  ],
  'Filosofía de la Ciencia': [
    '¿Qué es la ciencia?', 'El método científico', 'Observación y teoría', 'El problema de la inducción',
    'El falsacionismo de Popper', 'Los paradigmas de Kuhn', 'Programas de investigación de Lakatos',
    'El anarquismo metodológico de Feyerabend', 'Realismo científico', 'Instrumentalismo',
    'La explicación científica', 'Leyes y teorías', 'Reduccionismo', 'Emergencia',
    'Ciencia y valores', 'Ciencia y sociedad', 'Ética de la investigación', 'Filosofía de disciplinas específicas'
  ],
  'Hermenéutica': [
    'Orígenes de la hermenéutica', 'La hermenéutica bíblica', 'Schleiermacher', 'Dilthey',
    'Heidegger y la hermenéutica ontológica', 'Gadamer y la fusión de horizontes', 'El círculo hermenéutico',
    'Prejuicio y tradición', 'La distancia temporal', 'Aplicación', 'Ricoeur y la hermenéutica del texto',
    'Interpretación y explicación', 'Hermenéutica de la sospecha', 'Hermenéutica crítica',
    'Hermenéutica y ciencias sociales', 'Hermenéutica jurídica', 'Hermenéutica y literatura'
  ],
  'Fenomenología': [
    'Husserl y los orígenes de la fenomenología', 'La actitud natural', 'La reducción fenomenológica',
    'La intencionalidad', 'Nóesis y nóema', 'El mundo de la vida', 'La constitución del sentido',
    'Heidegger: ser-en-el-mundo', 'El Dasein', 'La temporalidad', 'Merleau-Ponty y el cuerpo',
    'La percepción', 'Sartre y la fenomenología', 'La fenomenología del otro', 'Empatía e intersubjetividad',
    'Fenomenología de las emociones', 'Fenomenología y ciencia cognitiva'
  ],
  'Existencialismo': [
    'Orígenes del existencialismo', 'Kierkegaard', 'Nietzsche y la muerte de Dios', 'Heidegger: ser y tiempo',
    'Sartre: la existencia precede a la esencia', 'La libertad', 'La angustia', 'La mala fe',
    'Camus y el absurdo', 'El mito de Sísifo', 'Simone de Beauvoir', 'El otro y la mirada',
    'La autenticidad', 'El proyecto', 'La responsabilidad', 'Existencialismo y humanismo',
    'Críticas al existencialismo', 'Influencia del existencialismo'
  ]
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// Generar DNI único de 8 dígitos
function generateUniqueDNI(usedDNIs: Set<string>): string {
  let dni: string;
  do {
    // DNIs peruanos comienzan típicamente con números entre 10000000 y 99999999
    dni = String(Math.floor(10000000 + Math.random() * 89999999));
  } while (usedDNIs.has(dni));
  usedDNIs.add(dni);
  return dni;
}

// Generar número de teléfono peruano
function generatePhone(): string {
  const prefix = Math.random() > 0.5 ? '9' : '9'; // Móviles empiezan con 9
  const rest = String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  return prefix + rest;
}

// Generar email basado en nombre
function generateEmail(firstName: string, lastName: string): string {
  const clean = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n').replace(/[^a-z]/g, '');
  
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const number = Math.floor(Math.random() * 100);
  
  return `${clean(firstName)}.${clean(lastName)}${number}@${domain}`;
}

// Generar fecha de nacimiento aleatoria (entre 18 y 65 años)
function generateBirthDate(minAge: number = 18, maxAge: number = 65): string {
  const today = new Date();
  const minYear = today.getFullYear() - maxAge;
  const maxYear = today.getFullYear() - minAge;
  const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Generar fecha de contratación (últimos 10 años)
function generateHireDate(): string {
  const today = new Date();
  const minYear = today.getFullYear() - 10;
  const maxYear = today.getFullYear();
  const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Seleccionar elemento aleatorio de array
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

export interface GenerateTestDataOptions {
  branchId: string;
  studentsCount: number;
  coursesCount: number;
  instructorsCount: number;
}

export interface GenerateTestDataResult {
  students: number;
  courses: number;
  instructors: number;
}

export async function generateTestData(options: GenerateTestDataOptions): Promise<GenerateTestDataResult> {
  const { branchId, studentsCount, coursesCount, instructorsCount } = options;
  const usedDNIs = new Set<string>();
  
  // Verificar que la sucursal existe
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId));
  if (!branch) {
    throw new Error('Sucursal no encontrada');
  }

  // Obtener DNIs existentes para evitar duplicados
  const existingStudents = await db.select({ dni: students.dni }).from(students);
  const existingInstructors = await db.select({ dni: instructors.dni }).from(instructors);
  
  existingStudents.forEach(s => usedDNIs.add(s.dni));
  existingInstructors.forEach(i => usedDNIs.add(i.dni));

  let createdStudents = 0;
  let createdCourses = 0;
  let createdInstructors = 0;

  // 1. Generar estudiantes
  for (let i = 0; i < studentsCount; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale 
      ? randomFrom(PERUVIAN_FIRST_NAMES_MALE) 
      : randomFrom(PERUVIAN_FIRST_NAMES_FEMALE);
    const paternalLastName = randomFrom(PERUVIAN_PATERNAL_LAST_NAMES);
    const maternalLastName = randomFrom(PERUVIAN_MATERNAL_LAST_NAMES);
    const dni = generateUniqueDNI(usedDNIs);
    
    try {
      const [student] = await db.insert(students).values({
        documentType: 'DNI',
        dni,
        gender: isMale ? 'Masculino' : 'Femenino',
        firstName,
        paternalLastName,
        maternalLastName,
        email: generateEmail(firstName, paternalLastName),
        phone: generatePhone(),
        birthDate: generateBirthDate(18, 50),
        address: `Av. ${randomFrom(PERUVIAN_PATERNAL_LAST_NAMES)} ${Math.floor(Math.random() * 1000) + 100}`,
        department: randomFrom(PERUVIAN_DEPARTMENTS),
        province: 'Lima',
        district: 'Miraflores',
        isTestData: true,
      }).returning();

      // Crear relación con la sucursal
      await db.insert(studentBranches).values({
        studentId: student.id,
        branchId,
        status: 'Alta',
        admissionDate: new Date().toISOString().split('T')[0],
      });

      createdStudents++;
    } catch (error) {
      console.error('Error creating student:', error);
    }
  }

  // 2. Generar cursos con sus temas
  const availableCourses = [...COURSE_NAMES].sort(() => Math.random() - 0.5).slice(0, coursesCount);
  
  for (const courseName of availableCourses) {
    try {
      const [course] = await db.insert(courses).values({
        branchId,
        name: courseName,
        description: COURSE_DESCRIPTIONS[courseName] || null,
        status: 'active',
        isTestData: true,
      }).returning();

      // Generar temas para este curso
      const topics = COURSE_TOPICS[courseName] || [];
      for (let i = 0; i < topics.length; i++) {
        await db.insert(courseThemes).values({
          courseId: course.id,
          orderIndex: i + 1,
          title: topics[i],
          description: null,
        });
      }

      createdCourses++;
    } catch (error) {
      console.error('Error creating course:', error);
    }
  }

  // 3. Generar instructores
  for (let i = 0; i < instructorsCount; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale 
      ? randomFrom(PERUVIAN_FIRST_NAMES_MALE) 
      : randomFrom(PERUVIAN_FIRST_NAMES_FEMALE);
    const paternalLastName = randomFrom(PERUVIAN_PATERNAL_LAST_NAMES);
    const maternalLastName = randomFrom(PERUVIAN_MATERNAL_LAST_NAMES);
    const dni = generateUniqueDNI(usedDNIs);
    
    try {
      await db.insert(instructors).values({
        branchId,
        documentType: 'DNI',
        dni,
        gender: isMale ? 'Masculino' : 'Femenino',
        firstName,
        paternalLastName,
        maternalLastName,
        email: generateEmail(firstName, paternalLastName),
        phone: generatePhone(),
        birthDate: generateBirthDate(25, 60),
        hireDate: generateHireDate(),
        status: 'Activo',
        hourlyRate: String(Math.floor(Math.random() * 50) + 30), // 30-80 por hora
        address: `Jr. ${randomFrom(PERUVIAN_PATERNAL_LAST_NAMES)} ${Math.floor(Math.random() * 500) + 100}`,
        department: randomFrom(PERUVIAN_DEPARTMENTS),
        province: 'Lima',
        district: 'San Isidro',
        isTestData: true,
      });
      createdInstructors++;
    } catch (error) {
      console.error('Error creating instructor:', error);
    }
  }

  return {
    students: createdStudents,
    courses: createdCourses,
    instructors: createdInstructors,
  };
}

export interface DeleteTestDataResult {
  students: number;
  courses: number;
  instructors: number;
}

export async function deleteTestData(branchId?: string): Promise<DeleteTestDataResult> {
  let deletedStudents = 0;
  let deletedCourses = 0;
  let deletedInstructors = 0;

  // 1. Eliminar estudiantes de prueba
  if (branchId) {
    // Obtener estudiantes de prueba en esa sucursal
    const testStudentBranches = await db
      .select({ studentId: studentBranches.studentId })
      .from(studentBranches)
      .innerJoin(students, eq(students.id, studentBranches.studentId))
      .where(and(
        eq(studentBranches.branchId, branchId),
        eq(students.isTestData, true)
      ));
    
    for (const sb of testStudentBranches) {
      await db.delete(students).where(eq(students.id, sb.studentId));
      deletedStudents++;
    }
  } else {
    const result = await db.delete(students).where(eq(students.isTestData, true)).returning();
    deletedStudents = result.length;
  }

  // 2. Eliminar cursos de prueba
  if (branchId) {
    const result = await db.delete(courses)
      .where(and(eq(courses.branchId, branchId), eq(courses.isTestData, true)))
      .returning();
    deletedCourses = result.length;
  } else {
    const result = await db.delete(courses).where(eq(courses.isTestData, true)).returning();
    deletedCourses = result.length;
  }

  // 3. Eliminar instructores de prueba
  if (branchId) {
    const result = await db.delete(instructors)
      .where(and(eq(instructors.branchId, branchId), eq(instructors.isTestData, true)))
      .returning();
    deletedInstructors = result.length;
  } else {
    const result = await db.delete(instructors).where(eq(instructors.isTestData, true)).returning();
    deletedInstructors = result.length;
  }

  return {
    students: deletedStudents,
    courses: deletedCourses,
    instructors: deletedInstructors,
  };
}

export interface TestDataStats {
  students: number;
  courses: number;
  instructors: number;
}

export async function getTestDataStats(branchId?: string): Promise<TestDataStats> {
  let studentsCount = 0;
  let coursesCount = 0;
  let instructorsCount = 0;

  if (branchId) {
    // Contar estudiantes de prueba en esa sucursal
    const testStudents = await db
      .select({ studentId: studentBranches.studentId })
      .from(studentBranches)
      .innerJoin(students, eq(students.id, studentBranches.studentId))
      .where(and(
        eq(studentBranches.branchId, branchId),
        eq(students.isTestData, true)
      ));
    studentsCount = testStudents.length;

    const testCourses = await db
      .select()
      .from(courses)
      .where(and(eq(courses.branchId, branchId), eq(courses.isTestData, true)));
    coursesCount = testCourses.length;

    const testInstructors = await db
      .select()
      .from(instructors)
      .where(and(eq(instructors.branchId, branchId), eq(instructors.isTestData, true)));
    instructorsCount = testInstructors.length;
  } else {
    const allTestStudents = await db.select().from(students).where(eq(students.isTestData, true));
    studentsCount = allTestStudents.length;

    const allTestCourses = await db.select().from(courses).where(eq(courses.isTestData, true));
    coursesCount = allTestCourses.length;

    const allTestInstructors = await db.select().from(instructors).where(eq(instructors.isTestData, true));
    instructorsCount = allTestInstructors.length;
  }

  return { students: studentsCount, courses: coursesCount, instructors: instructorsCount };
}
