# ⚠️ IMPORTANTE: Protección de Datos

## 🛡️ Tu Base de Datos está PROTEGIDA

El script `update.sh` **NUNCA** borra datos de la base de datos.

### ✅ Lo que hace `update.sh`:
```bash
docker compose down          # Detiene contenedores (datos intactos)
docker compose build         # Reconstruye código
docker compose up -d         # Levanta con datos existentes
```

### ❌ Lo que NUNCA hace:
- ❌ `docker compose down -v` (esto SÍ borraría datos)
- ❌ Borrar volúmenes
- ❌ Eliminar base de datos

---

## 📦 Hacer Backup (Antes de cambios importantes)

```bash
cd /root/proyectos/probacionismo
./backup.sh
```

O manualmente:
```bash
docker exec multitenant_postgres pg_dump -U postgres multitenant_db | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 🔄 Restaurar Backup

```bash
gunzip -c backup_20241110_120000.sql.gz | docker exec -i multitenant_postgres psql -U postgres -d multitenant_db
```

---

## ⚠️ COMANDOS PELIGROSOS - NUNCA USES:

```bash
# ❌ PELIGRO: Borra TODO
docker compose down -v
docker volume rm probacionismo_postgres_data
docker volume prune
```

---

## ✅ COMANDOS SEGUROS:

```bash
# ✅ SEGURO
docker compose down
docker compose restart
./update.sh
```

---

## 📋 Resumen

- ✅ `update.sh` es **100% SEGURO** - preserva datos
- ✅ Haz backup con `./backup.sh` antes de cambios importantes
- ❌ NUNCA uses `-v` flag con `docker compose down`

**Tu base de datos está protegida.** 🛡️
