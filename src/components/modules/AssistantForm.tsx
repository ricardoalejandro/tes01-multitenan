"use client"

import * as React from "react"
import { User, Phone, Users, Calendar, Plus, Pencil, Trash2, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface Assistant {
  id?: string
  fullName: string
  phone?: string
  gender?: 'Masculino' | 'Femenino' | 'Otro'
  age?: number
}

interface AssistantFormProps {
  assistants: Assistant[]
  onChange: (assistants: Assistant[]) => void
  disabled?: boolean
  className?: string
}

interface AssistantCardProps {
  assistant: Assistant
  index: number
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}

function AssistantCard({ assistant, index, onEdit, onDelete, disabled }: AssistantCardProps) {
  const genderIcons: Record<string, string> = {
    'Masculino': '👨',
    'Femenino': '👩',
    'Otro': '🧑',
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm truncate">{assistant.fullName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {assistant.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {assistant.phone}
                </span>
              )}
              {assistant.gender && (
                <Badge variant="secondary" className="text-xs py-0">
                  {genderIcons[assistant.gender]} {assistant.gender}
                </Badge>
              )}
              {assistant.age && (
                <Badge variant="outline" className="text-xs py-0">
                  {assistant.age} años
                </Badge>
              )}
            </div>
          </div>
          {!disabled && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface AssistantEditorProps {
  assistant?: Assistant
  onSave: (assistant: Assistant) => void
  onCancel: () => void
}

function AssistantEditor({ assistant, onSave, onCancel }: AssistantEditorProps) {
  const [formData, setFormData] = React.useState<Assistant>({
    fullName: assistant?.fullName || '',
    phone: assistant?.phone || '',
    gender: assistant?.gender,
    age: assistant?.age,
  })

  const handleSave = () => {
    if (!formData.fullName.trim()) return
    onSave({
      ...assistant,
      ...formData,
      fullName: formData.fullName.trim(),
      phone: formData.phone?.trim() || undefined,
      age: formData.age || undefined,
    })
  }

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre completo */}
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="fullName" className="text-sm">
              Nombre y Apellidos <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Nombre completo del asistente"
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm">Teléfono</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="987654321"
                className="pl-10"
              />
            </div>
          </div>

          {/* Sexo */}
          <div className="space-y-1.5">
            <Label className="text-sm">Sexo</Label>
            <Select
              value={formData.gender || ''}
              onValueChange={(value) => setFormData({ ...formData, gender: value as Assistant['gender'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">👨 Masculino</SelectItem>
                <SelectItem value="Femenino">👩 Femenino</SelectItem>
                <SelectItem value="Otro">🧑 Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Edad */}
          <div className="space-y-1.5">
            <Label htmlFor="age" className="text-sm">Edad</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="age"
                type="number"
                min={1}
                max={120}
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Edad"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button 
            type="button" 
            size="sm" 
            onClick={handleSave}
            disabled={!formData.fullName.trim()}
          >
            <Check className="h-4 w-4 mr-1" />
            {assistant ? 'Guardar' : 'Agregar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AssistantForm({ assistants, onChange, disabled, className }: AssistantFormProps) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [isAdding, setIsAdding] = React.useState(false)

  const handleAdd = (assistant: Assistant) => {
    onChange([...assistants, assistant])
    setIsAdding(false)
  }

  const handleEdit = (index: number, assistant: Assistant) => {
    const updated = [...assistants]
    updated[index] = assistant
    onChange(updated)
    setEditingIndex(null)
  }

  const handleDelete = (index: number) => {
    onChange(assistants.filter((_, i) => i !== index))
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Asistentes de Clase</h3>
          <Badge variant="secondary" className="ml-1">
            {assistants.length} {assistants.length === 1 ? 'asistente' : 'asistentes'}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Opcionalmente puede agregar asistentes que ayudarán en las clases del grupo.
      </p>

      {/* Lista de asistentes */}
      {assistants.length > 0 && (
        <div className="space-y-2">
          {assistants.map((assistant, index) => (
            editingIndex === index ? (
              <AssistantEditor
                key={index}
                assistant={assistant}
                onSave={(updated) => handleEdit(index, updated)}
                onCancel={() => setEditingIndex(null)}
              />
            ) : (
              <AssistantCard
                key={index}
                assistant={assistant}
                index={index}
                onEdit={() => setEditingIndex(index)}
                onDelete={() => handleDelete(index)}
                disabled={disabled}
              />
            )
          ))}
        </div>
      )}

      {/* Formulario para agregar */}
      {isAdding && (
        <AssistantEditor
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Botón agregar */}
      {!isAdding && !disabled && editingIndex === null && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Asistente
        </Button>
      )}

      {/* Mensaje vacío */}
      {assistants.length === 0 && !isAdding && (
        <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay asistentes agregados</p>
          <p className="text-xs">Este campo es opcional</p>
        </div>
      )}
    </div>
  )
}

export default AssistantForm
