'use client';

interface Student {
  id: string;
  dni: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  gender: string;
  email?: string;
  phone?: string;
}

interface Props {
  students: Student[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function StudentCardsView({ students, selectedIds, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {students.map((student) => {
        const isSelected = selectedIds.includes(student.id);
        return (
          <button
            key={student.id}
            type="button"
            onClick={() => onToggle(student.id)}
            className={`border-2 rounded-lg p-4 text-left transition-all hover:shadow-md ${
              isSelected
                ? 'border-accent-9 bg-accent-2'
                : 'border-neutral-4 bg-white hover:border-neutral-6'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-full bg-accent-3 flex items-center justify-center text-accent-11 font-bold text-lg">
                {student.firstName[0]}{student.paternalLastName[0]}
              </div>
              {isSelected && (
                <div className="w-6 h-6 rounded-full bg-accent-9 flex items-center justify-center text-white">
                  ✓
                </div>
              )}
            </div>
            <div className="font-semibold text-sm">
              {student.firstName} {student.paternalLastName}
            </div>
            <div className="text-xs text-neutral-10">DNI: {student.dni}</div>
          </button>
        );
      })}
    </div>
  );
}

export function StudentCompactView({ students, selectedIds, onToggle }: Props) {
  return (
    <div className="border border-neutral-4 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-2 border-b border-neutral-4">
          <tr>
            <th className="p-2 text-left w-12"></th>
            <th className="p-2 text-left">Nombre</th>
            <th className="p-2 text-left">DNI</th>
            <th className="p-2 text-left">Género</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const isSelected = selectedIds.includes(student.id);
            return (
              <tr
                key={student.id}
                onClick={() => onToggle(student.id)}
                className={`cursor-pointer hover:bg-neutral-2 transition-colors ${
                  isSelected ? 'bg-accent-2' : ''
                }`}
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4"
                  />
                </td>
                <td className="p-2 font-medium">
                  {student.firstName} {student.paternalLastName} {student.maternalLastName || ''}
                </td>
                <td className="p-2">{student.dni}</td>
                <td className="p-2">{student.gender}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StudentListView({ students, selectedIds, onToggle }: Props) {
  return (
    <div className="space-y-2">
      {students.map((student) => {
        const isSelected = selectedIds.includes(student.id);
        return (
          <button
            key={student.id}
            type="button"
            onClick={() => onToggle(student.id)}
            className={`w-full border rounded-lg p-4 text-left transition-all hover:shadow-sm ${
              isSelected
                ? 'border-accent-9 bg-accent-2'
                : 'border-neutral-4 bg-white hover:border-neutral-6'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-3 flex items-center justify-center text-accent-11 font-bold">
                {student.firstName[0]}{student.paternalLastName[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold">
                  {student.firstName} {student.paternalLastName} {student.maternalLastName || ''}
                </div>
                <div className="text-sm text-neutral-10">
                  DNI: {student.dni} • {student.gender} {student.email && `• ${student.email}`}
                </div>
              </div>
              {isSelected && (
                <div className="w-8 h-8 rounded-full bg-accent-9 flex items-center justify-center text-white">
                  ✓
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
