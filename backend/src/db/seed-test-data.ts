import { db } from './index';
import { students, studentBranches, courses, instructors, branches } from './schema';
import { eq } from 'drizzle-orm';

const generateRandomName = () => {
  const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'José', 'Rosa', 'Miguel', 'Elena', 
    'Pedro', 'Laura', 'Diego', 'Sofía', 'Roberto', 'Patricia', 'Francisco', 'Isabel', 'Antonio', 'Lucía',
    'Manuel', 'Raquel', 'Javier', 'Teresa', 'Sergio', 'Beatriz', 'Fernando', 'Cristina', 'Ricardo', 'Sandra'];
  
  const apellidosPaterno = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez',
    'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Jiménez', 'Hernández',
    'Ruiz', 'Mendoza', 'Castro', 'Vargas', 'Ramos', 'Romero', 'Herrera', 'Medina', 'Aguilar', 'Gutiérrez'];
  
  const apellidosMaterno = ['Ortiz', 'Silva', 'Vega', 'Quispe', 'Mamani', 'Huamán', 'Ccopa', 'Yupanqui',
    'Navarro', 'Paredes', 'Rojas', 'Salazar', 'Campos', 'Ríos', 'Luna', 'Prado'];
  
  const nombre = nombres[Math.floor(Math.random() * nombres.length)];
  const apellidoPaterno = apellidosPaterno[Math.floor(Math.random() * apellidosPaterno.length)];
  const apellidoMaterno = apellidosMaterno[Math.floor(Math.random() * apellidosMaterno.length)];
  
  return { firstName: nombre, paternalLastName: apellidoPaterno, maternalLastName: apellidoMaterno };
};

const generateDNI = () => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

const generateEmail = (firstName: string, paternalLastName: string) => {
  const cleanFirst = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanLast = paternalLastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${cleanFirst}.${cleanLast}@test.com`;
};

const generatePhone = () => {
  return `9${Math.floor(10000000 + Math.random() * 90000000)}`;
};

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data for Filial Iquitos...');

    // Get Filial Iquitos branch
    const [iquitosBranch] = await db
      .select()
      .from(branches)
      .where(eq(branches.name, 'Filial Iquitos'))
      .limit(1);

    if (!iquitosBranch) {
      console.error('❌ Filial Iquitos branch not found!');
      return;
    }

    const branchId = iquitosBranch.id;
    console.log(`✅ Found branch: ${iquitosBranch.name} (${branchId})`);

    // Create 50 students
    console.log('📝 Creating 50 students...');
    for (let i = 0; i < 50; i++) {
      const { firstName, paternalLastName, maternalLastName } = generateRandomName();
      const birthDate = new Date(1990 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      
      // Crear el estudiante
      const [student] = await db.insert(students).values({
        documentType: 'DNI',
        dni: generateDNI(),
        gender: Math.random() > 0.5 ? 'Masculino' : 'Femenino',
        firstName,
        paternalLastName,
        maternalLastName,
        email: generateEmail(firstName, paternalLastName),
        phone: generatePhone(),
        birthDate: birthDate.toISOString().split('T')[0],
        address: `Calle ${Math.floor(Math.random() * 50) + 1}, Iquitos`,
        department: 'Loreto',
        province: 'Maynas',
        district: 'Iquitos',
      }).returning();

      // Vincular estudiante con la sucursal
      await db.insert(studentBranches).values({
        studentId: student.id,
        branchId,
        status: 'Alta',
        admissionDate: new Date().toISOString().split('T')[0],
      });
    }
    console.log('✅ Created 50 students and linked to branch');

    // Create 5 courses
    console.log('📚 Creating 5 courses...');
    const courseNames = [
      { name: 'Catecismo Básico', description: 'Fundamentos de la fe católica y doctrina básica' },
      { name: 'Biblia y Evangelio', description: 'Estudio profundo de las Sagradas Escrituras' },
      { name: 'Liturgia y Sacramentos', description: 'Ceremonias litúrgicas y los 7 sacramentos' },
      { name: 'Historia de la Iglesia', description: 'Desde los apóstoles hasta nuestros días' },
      { name: 'Moral Cristiana', description: 'Ética y valores desde la perspectiva católica' },
    ];

    for (const course of courseNames) {
      await db.insert(courses).values({
        branchId,
        name: course.name,
        description: course.description,
        status: 'active',
      });
    }
    console.log('✅ Created 5 courses');

    // Create 10 instructors
    console.log('👨‍🏫 Creating 10 instructors...');
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
      'Filosofía Cristiana'
    ];

    for (let i = 0; i < 10; i++) {
      const { firstName, paternalLastName, maternalLastName } = generateRandomName();
      const hireDate = new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      
      await db.insert(instructors).values({
        branchId,
        documentType: 'DNI',
        dni: generateDNI(),
        gender: Math.random() > 0.5 ? 'Masculino' : 'Femenino',
        firstName,
        paternalLastName,
        maternalLastName,
        email: generateEmail(firstName, paternalLastName),
        phone: generatePhone(),
        hireDate: hireDate.toISOString().split('T')[0],
        status: 'Activo',
        hourlyRate: (Math.floor(Math.random() * 30) + 20).toString(),
        address: `Av. ${Math.floor(Math.random() * 100) + 1}, Iquitos`,
        department: 'Loreto',
        province: 'Maynas',
        district: 'Iquitos',
      });
    }
    console.log('✅ Created 10 instructors');

    console.log('🎉 Test data seeding completed successfully!');
    console.log(`
📊 Summary:
   - Branch: Filial Iquitos
   - Students: 50 (with branch relationship)
   - Courses: 5
   - Instructors: 10
    `);
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

seedTestData()
  .then(() => {
    console.log('✅ Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
