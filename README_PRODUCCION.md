# 🚀 IMPORTANTE: Pasos para ir a Producción

## ⚠️ ANTES DE DESPLEGAR EN PRODUCCIÓN

Actualmente el proyecto está configurado para **DESARROLLO** donde todo funciona automáticamente al clonar el repo. Antes de ir a producción, sigue estos pasos:

---

## 📋 Checklist Pre-Producción

### 1️⃣ Proteger Variables de Entorno en Git

Edita `.gitignore` y **descomenta** estas líneas:

```bash
# Buscar estas líneas en .gitignore:
# .env
# backend/.env

# Cambiar a:
.env
backend/.env
```

Esto evitará que las credenciales de producción se suban a Git.

### 2️⃣ Cambiar Credenciales de Seguridad

Edita `.env` y cambia:

```env
# Generar un nuevo JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Cambiar credenciales de base de datos
POSTGRES_USER=escolastica_prod
POSTGRES_PASSWORD=password_muy_seguro_produccion
POSTGRES_DB=escolastica_production
```

Edita `backend/.env` y actualiza `DATABASE_URL` con las nuevas credenciales.

### 3️⃣ Configurar Dominio y URLs

En `.env`:

```env
CORS_ORIGIN=https://tu-dominio.com
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api
```

### 4️⃣ Remover archivos .env del historial de Git (si ya se subieron)

```bash
# Remover .env del tracking de git (mantiene el archivo local)
git rm --cached .env
git rm --cached backend/.env

# Commit
git commit -m "Remove .env files from version control"

# Push
git push origin main
```

### 5️⃣ Documentar las Credenciales de Producción

Guarda las credenciales de producción en un gestor de contraseñas seguro como:
- 1Password
- LastPass
- AWS Secrets Manager
- HashiCorp Vault

**NUNCA** las compartas por chat, email o WhatsApp.

---

## 🔄 Flujo Recomendado

### Para DESARROLLO (actual):
```bash
git clone <repo>
cd escolastica
docker compose up -d
# ✅ Todo funciona automáticamente
```

### Para PRODUCCIÓN (futuro):
```bash
git clone <repo>
cd escolastica

# Crear .env desde plantilla
cp .env.example .env

# Editar credenciales
nano .env

# Crear backend/.env desde plantilla
cp backend/.env.example backend/.env

# Editar credenciales backend
nano backend/.env

# Validar
./scripts/validate-env.sh

# Desplegar
docker compose up -d --build
```

---

## 📝 Resumen de Diferencias

| Aspecto | Desarrollo (Ahora) | Producción (Futuro) |
|---------|-------------------|---------------------|
| `.env` en Git | ✅ SÍ (datos de prueba) | ❌ NO (credenciales reales) |
| Configuración | Automática | Manual |
| JWT_SECRET | Valor por defecto | Aleatorio seguro |
| POSTGRES_PASSWORD | `postgres` | Contraseña fuerte |
| URLs | `localhost` | Dominio real |

---

## 🆘 Si olvidaste algo

Si ya subiste credenciales de producción a Git por error:

1. **Cambiar INMEDIATAMENTE todas las contraseñas**
2. Generar nuevo `JWT_SECRET`
3. Limpiar historial de Git (contactar a DevOps)
4. Invalidar tokens existentes

---

**Fecha de este documento**: Noviembre 2025  
**Estado del proyecto**: DESARROLLO  
**Próximo hito**: Migración a PRODUCCIÓN (pendiente)
