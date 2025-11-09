import { db } from './index';
import { students, studentBranches, courses, instructors, branches } from './schema';
import { eq } from 'drizzle-orm';

const generateRandomName = () => {
  const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'José', 'Rosa', 'Miguel', 'Elena', 
    'Pedro', 'Laura', 'Diego', 'Sofía', 'Roberto', 'Patricia', 'Francisco', 'Isabel', 'Antonio', 'Lucía',
    'Manuel', 'Raquel', 'Javier', 'Teresa', 'Sergio', 'Beatriz', 'Fernando', 'Cristina', 'Ricardo', 'Sandra',
    'Pablo', 'Marta', 'Andrés', 'Verónica', 'Ángel', 'Claudia', 'Daniel', 'Adriana', 'Jorge', 'Silvia'];
  
  const apellidosPaterno = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez',
    'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Jiménez', 'Hernández',
    'Ruiz', 'Mendoza', 'Castro', 'Vargas', 'Ramos', 'Romero', 'Herrera', 'Medina', 'Aguilar', 'Gutiérrez',
    'Ortega', 'Núñez', 'Álvarez', 'Vásquez', 'Castillo', 'Delgado', 'Rojas', 'Guerrero', 'Peña', 'Santos'];
  
  const apellidosMaterno = ['Ortiz', 'Silva', 'Vega', 'Quispe', 'Mamani', 'Huamán', 'Ccopa', 'Yupanqui',
    'Navarro', 'Paredes', 'Rojas', 'Salazar', 'Campos', 'Ríos', 'Luna', 'Prado', 'Chávez', 'Vera',
    'Montes', 'Bravo', 'Cortés', 'Soto', 'Lara', 'Cabrera', 'Ochoa', 'Duarte', 'Valdez', 'Espinoza'];
  
  const nombre = nombres[Math.floor(Math.random() * nombres.length)];
  const apellidoPaterno = apellidosPaterno[Math.floor(Math.random() * apellidosPaterno.length)];
  const apellidoMaterno = apellidosMaterno[Math.floor(Math.random() * apellidosMaterno.length)];
  
  return { firstName: nombre, paternalLastName: apellidoPaterno, maternalLastName: apellidoMaterno };
};

const generateDNI = (usedDNIs: Set<string>) => {
  let dni: string;
  do {
    dni = Math.floor(10000000 + Math.random() * 90000000).toString();
  } while (usedDNIs.has(dni));
  usedDNIs.add(dni);
  return dni;
};

const generateEmail = (firstName: string, paternalLastName: string, index: number) => {
  const cleanFirst = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanLast = paternalLastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${cleanFirst}.${cleanLast}${index}@test.com`;
};

const generatePhone = () => {
  return `9${Math.floor(10000000 + Math.random() * 90000000)}`;
};

const districts = ['Lima', 'Miraflores', 'San Isidro', 'Surco', 'La Molina', 'San Borja', 'Jesús María', 
  'Magdalena', 'Pueblo Libre', 'Lince', 'Breña', 'San Miguel', 'Callao', 'Ate', 'Chorrillos'];

async function seedSedeCentral() {
  try {
    console.log('🌱 Seeding MASSIVE test data for Sede Central...');

    // Get Sede Central branch
    const [sedeCentral] = await db
      .select()
      .from(branches)
      .where(eq(branches.name, 'Sede Central'))
      .limit(1);

    if (!sedeCentral) {
      console.error('❌ Sede Central branch not found!');
      return;
    }

    const branchId = sedeCentral.id;
    console.log(`✅ Found branch: ${sedeCentral.name} (${branchId})`);

    // Create 10,000 students in batches
    console.log('📝 Creating 10,000 students (this will take a few minutes)...');
    const BATCH_SIZE = 100;
    const TOTAL_STUDENTS = 10000;
    let createdCount = 0;
    const usedDNIs = new Set<string>();

    for (let batch = 0; batch < TOTAL_STUDENTS / BATCH_SIZE; batch++) {
      const studentInserts = [];
      const studentBranchInserts = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const { firstName, paternalLastName, maternalLastName } = generateRandomName();
        const birthDate = new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
        const district = districts[Math.floor(Math.random() * districts.length)];
        const globalIndex = batch * BATCH_SIZE + i;

        studentInserts.push({
          documentType: 'DNI' as const,
          dni: generateDNI(usedDNIs),
          gender: Math.random() > 0.5 ? ('Masculino' as const) : ('Femenino' as const),
          firstName,
          paternalLastName,
          maternalLastName,
          email: generateEmail(firstName, paternalLastName, globalIndex),
          phone: generatePhone(),
          birthDate: birthDate.toISOString().split('T')[0],
          address: `Jr. ${Math.floor(Math.random() * 100) + 1} Nro ${Math.floor(Math.random() * 500) + 1}, ${district}`,
          department: 'Lima',
          province: 'Lima',
          district: district,
        });
      }

      // Insert batch of students
      const insertedStudents = await db.insert(students).values(studentInserts).returning({ id: students.id });

      // Create corresponding student-branch relationships
      for (const student of insertedStudents) {
        studentBranchInserts.push({
          studentId: student.id,
          branchId,
          status: 'Alta',
          admissionDate: new Date().toISOString().split('T')[0],
        });
      }

      await db.insert(studentBranches).values(studentBranchInserts);

      createdCount += BATCH_SIZE;
      if (createdCount % 1000 === 0) {
        console.log(`   ✓ Created ${createdCount} / ${TOTAL_STUDENTS} students...`);
      }
    }
    console.log(`✅ Created ${TOTAL_STUDENTS} students and linked to branch`);

    // Create 20 courses
    console.log('📚 Creating 20 courses...');
    const courseNames = [
      { name: 'Introducción a la Fe', description: 'Primeros pasos en el conocimiento de Dios' },
      { name: 'Catecismo Básico I', description: 'Fundamentos de la doctrina católica - Nivel I' },
      { name: 'Catecismo Básico II', description: 'Fundamentos de la doctrina católica - Nivel II' },
      { name: 'Sagradas Escrituras - Antiguo Testamento', description: 'Estudio del Antiguo Testamento' },
      { name: 'Sagradas Escrituras - Nuevo Testamento', description: 'Estudio del Nuevo Testamento' },
      { name: 'Los Evangelios', description: 'Estudio profundo de los cuatro evangelios' },
      { name: 'Liturgia y Sacramentos I', description: 'Introducción a la liturgia católica' },
      { name: 'Liturgia y Sacramentos II', description: 'Los siete sacramentos en profundidad' },
      { name: 'Historia de la Iglesia I', description: 'Desde los apóstoles hasta la edad media' },
      { name: 'Historia de la Iglesia II', description: 'Edad moderna y contemporánea' },
      { name: 'Moral Católica', description: 'Ética y valores cristianos' },
      { name: 'Doctrina Social de la Iglesia', description: 'Enseñanzas sociales del magisterio' },
      { name: 'Mariología', description: 'Estudio sobre la Virgen María' },
      { name: 'Teología Fundamental', description: 'Bases teológicas de la fe católica' },
      { name: 'Espiritualidad Cristiana', description: 'Caminos de santidad y oración' },
      { name: 'Catequesis Familiar', description: 'Formación para catequistas de familia' },
      { name: 'Liturgia de las Horas', description: 'Oración oficial de la Iglesia' },
      { name: 'Los Santos y Beatos', description: 'Ejemplos de vida cristiana' },
      { name: 'Apologética', description: 'Defensa razonada de la fe católica' },
      { name: 'Preparación Sacramental', description: 'Formación para recibir los sacramentos' },
    ];

    for (const course of courseNames) {
      await db.insert(courses).values({
        branchId,
        name: course.name,
        description: course.description,
        status: 'active',
      });
    }
    console.log('✅ Created 20 courses');

    // Create 50 instructors
    console.log('👨‍🏫 Creating 50 instructors...');
    const specializations = [
      'Teología Dogmática',
      'Teología Moral',
      'Sagradas Escrituras',
      'Liturgia',
      'Catequesis',
      'Historia Eclesiástica',
      'Derecho Canónico',
      'Espiritualidad',
      'Pastoral',
      'Filosofía Cristiana',
      'Mariología',
      'Patrística',
      'Teología Fundamental',
      'Eclesiología',
      'Soteriología',
      'Apologética',
      'Cristología',
      'Pneumatología',
      'Escatología',
      'Hermenéutica Bíblica',
      'Exégesis',
      'Teología Sacramental',
      'Bioética',
      'Doctrina Social',
      'Pastoral Juvenil',
      'Pastoral Familiar',
      'Música Sacra',
      'Arte Sacro',
      'Teología Pastoral',
      'Homilética'
    ];

    for (let i = 0; i < 50; i++) {
      const { firstName, paternalLastName, maternalLastName } = generateRandomName();
      const hireDate = new Date(2015 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const district = districts[Math.floor(Math.random() * districts.length)];
      const specialty = specializations[i % specializations.length];
      
      await db.insert(instructors).values({
        branchId,
        documentType: 'DNI',
        dni: generateDNI(usedDNIs),
        gender: Math.random() > 0.5 ? 'Masculino' : 'Femenino',
        firstName,
        paternalLastName,
        maternalLastName,
        email: generateEmail(firstName, paternalLastName, i + 10000),
        phone: generatePhone(),
        hireDate: hireDate.toISOString().split('T')[0],
        status: 'Activo',
        hourlyRate: (Math.floor(Math.random() * 40) + 30).toString(),
        address: `Av. Principal ${Math.floor(Math.random() * 200) + 1}, ${district}`,
        department: 'Lima',
        province: 'Lima',
        district: district,
      });
    }
    console.log('✅ Created 50 instructors');

    console.log('🎉 MASSIVE test data seeding completed successfully!');
    console.log(`
📊 Summary for Sede Central:
   - Students: 10,000 (with branch relationship)
   - Courses: 20
   - Instructors: 50
   - Total records created: ~10,070
    `);
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

seedSedeCentral()
  .then(() => {
    console.log('✅ Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
